import * as cdk from 'aws-cdk-lib'
import { Duration } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { APIGateway } from './apigateway/APIGateway'
import { OpenAISecret } from './secretmanager/openaisecret'
import { Auth } from './cognito/auth'
import { RagAIWebStack } from './cloudfront/cloudfrontcreate'
import { HostedZone } from 'aws-cdk-lib/aws-route53'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import {
  CertificateValidation,
  DnsValidatedCertificate,
} from 'aws-cdk-lib/aws-certificatemanager'
import { ClientConfig } from './clientconfig/clientconfig'
import { ClientParameterStore } from './parameterstore/parameterstore'
import { BillingDatabase } from './dynamodb/billingdatabase'
import {
  BastionHostLinux,
  InstanceType,
  Peer,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2'
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  ParameterGroup,
  PostgresEngineVersion,
} from 'aws-cdk-lib/aws-rds'
import {Customer, StaticLambdaResources} from "../types/global";
import {UploadEmbedding} from "./upload/uploadEmbedding";

const customers: Customer[] = [
  {
    name: 'dev',
    domain: 'example.domain',
    monthlyTokenLimit: 9_999_999,
    chatbots: [
      {
        model: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
      },
      {
        model: 'o1-mini',
        name: 'GPT-o1 Mini',
      },
    ],
  }
]

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const {
      hostedZone,
      websiteBucket,
      certificate,
      billingTable,
      staticLambdaResources
    } = this.createStaticResources()

    customers.forEach((customer) => {
      new UploadEmbedding(this, `${customer.name}-upload-bucket`, customer, staticLambdaResources)

      const { userPoolClientId, userPoolId, userPool } = new Auth(
        this,
        `${customer.name}-auth`,
        customer,
        certificate,
        hostedZone,
      )
      const { apiGatewayId, apiAuthLambda } = new APIGateway(
        this,
        `${customer.name}-open-ai-adapter`,
        customer,
        userPool,
        userPoolClientId,
        billingTable,
        staticLambdaResources
      )
      new RagAIWebStack(
        this,
        `${customer.name}-cloudyb`,
        customer,
        hostedZone,
        certificate,
        websiteBucket,
        apiGatewayId,
      )
      new ClientConfig(
        this,
        `${customer.name}-client-config`,
        customer,
        websiteBucket,
        userPoolClientId,
        userPoolId,
      )
      new ClientParameterStore(
        this,
        `${customer.name}-client-parameter-store`,
        customer,
        apiAuthLambda,
        staticLambdaResources
      )
    })
  }

  private createStaticResources() {
    const hostedZone = HostedZone.fromHostedZoneAttributes(
      this,
      'RagAIWebsiteHostedZone',
      { zoneName: '<YOUR HOSTED ZONE NAME>', hostedZoneId: '<YOUR HOSTED ZONE ID>' },
    )

    const privateVpc = new Vpc(this, 'ragai-private-vpc', {
      vpcName: 'ragai-private-vpc',
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: 'private-subnet',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    })

    const vectorDb = new DatabaseInstance(this, 'vector-db', {
      vpc: privateVpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_16,
      }),
      databaseName: 'VectorDB',
      allocatedStorage: 20,
      instanceType: new InstanceType('t3.micro'),
      parameterGroup: new ParameterGroup(this, 'vector-db-parameter-group', {
        engine: DatabaseInstanceEngine.postgres({
          version: PostgresEngineVersion.VER_16,
        }),
        parameters: {
          'rds.force_ssl': '0',
        },
      }),
    })

    const bastionHost = new BastionHostLinux(this, 'bastion-host', {
      vpc: privateVpc,
      subnetSelection: {
        subnetType: SubnetType.PUBLIC,
      },
      instanceType: new InstanceType('t3.micro'),
    })

    bastionHost.allowSshAccessFrom(Peer.anyIpv4())
    // @ts-ignore
    vectorDb.connections.allowFrom(bastionHost, vectorDb.connections.defaultPort)

    const similarityFinderLambda = new NodejsFunction(
      this,
      'similarity-finder-function',
      {
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/similarityfinder.function.ts',
        vpc: privateVpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        logRetention: 7,
      },
    )

    vectorDb.connections.allowDefaultPortFrom(similarityFinderLambda)

    const openAIRequestLambda = new NodejsFunction(this, 'function', {
      timeout: Duration.seconds(29),
      bundling: {
        preCompilation: true,
      },
      entry: './lib/lambda/openaiadapter.function.ts',
      environment: {
        SIMILARITY_FINDER_LAMBDA_NAME: similarityFinderLambda.functionName,
        VECTOR_DATABASE_SECRET_NAME: vectorDb.secret?.secretName || '',
      },
      logRetention: 7,
    })

    similarityFinderLambda.grantInvoke(openAIRequestLambda)
    vectorDb.secret?.grantRead(openAIRequestLambda)

    const adminSimilaritySearcherLambda = new NodejsFunction(
      this,
      'admin-similarity-searcher-function',
      {
        functionName: 'admin-similarity-searcher-function',
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/admin/adminsimilaritysearcher.function.ts',
        environment: {
          SIMILARITY_FINDER_LAMBDA_NAME: similarityFinderLambda.functionName,
          VECTOR_DATABASE_SECRET_NAME: vectorDb.secret?.secretName || '',
        },
        logRetention: 7,
      },
    )

    similarityFinderLambda.grantInvoke(adminSimilaritySearcherLambda)
    vectorDb.secret?.grantRead(adminSimilaritySearcherLambda)

    const customerConfigRetrieverLambda = new NodejsFunction(
      this,
      'config-retriever-function',
      {
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/customerconfig.function.ts',
        logRetention: 7,
      },

    )

    const getAllEmbeddingNamesLambda = new NodejsFunction(
      this,
      'get-all-embedding-names-function',
      {
        functionName: 'get-all-embedding-names-function',
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/internal/getallembeddingnames.function.ts',
        vpc: privateVpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        logRetention: 7,
      },
    )

    vectorDb.connections.allowDefaultPortFrom(getAllEmbeddingNamesLambda)

    const adminChatbotConfigRetrieverLambda = new NodejsFunction(
      this,
      'admin-chatbot-config-retriever-function',
      {
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/admin/adminretrievechatbotconfig.function.ts',
        logRetention: 7,
        environment: {
          GET_ALL_EMBEDDING_NAMES_LAMBDA_NAME: getAllEmbeddingNamesLambda.functionName,
          VECTOR_DATABASE_SECRET_NAME: vectorDb.secret?.secretName || '',
        },
      },
    )

    vectorDb.secret?.grantRead(adminChatbotConfigRetrieverLambda)
    getAllEmbeddingNamesLambda.grantInvoke(adminChatbotConfigRetrieverLambda)

    const adminSetChatbotConfigLambda = new NodejsFunction(
      this,
      'admin-set-chatbot-config-function',
      {
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/admin/adminsetchatbotconfig.function.ts',
        logRetention: 7,
      },
    )

    const adminCreatePresignedUrlLambda = new NodejsFunction(
      this,
      'admin-create-presigned-url-function',
      {
        functionName: 'admin-create-presigned-url-function',
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/admin/admincreatepresignedurl.function.ts',
        logRetention: 7,
      },
    )

    const adminGetUsageLambda = new NodejsFunction(
      this,
      'admin-get-usage-function',
      {
        functionName: 'admin-get-usage-function',
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/admin/admingetusage.function.ts',
        logRetention: 7,
      },
    )

    const storeEmbeddingsLambda = new NodejsFunction(
      this,
      'store-embeddings-function',
      {
        functionName: 'store-embeddings-function',
        timeout: Duration.seconds(300),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/internal/storeembeddings.function.ts',
        vpc: privateVpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        logRetention: 7,
      },
    )

    vectorDb.connections.allowDefaultPortFrom(storeEmbeddingsLambda)

    const deleteEmbeddingsLambda = new NodejsFunction(
      this,
      'delete-embeddings-function',
      {
        functionName: 'delete-embeddings-function',
        timeout: Duration.seconds(300),
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/internal/deleteembeddings.function.ts',
        vpc: privateVpc,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        logRetention: 7,
      },
    )

    vectorDb.connections.allowDefaultPortFrom(deleteEmbeddingsLambda)

    const createEmbeddingsLambda = new NodejsFunction(
      this,
      'create-embeddings-function',
      {
        functionName: 'create-embeddings-function',
        timeout: Duration.seconds(300),// 5 minutes
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/internal/createembeddings.function.ts',
        environment: {
          DELETE_EMBEDDINGS_LAMBDA_NAME: deleteEmbeddingsLambda.functionName,
          STORE_EMBEDDINGS_LAMBDA_NAME: storeEmbeddingsLambda.functionName,
          VECTOR_DATABASE_SECRET_NAME: vectorDb.secret?.secretName || '',
        },
        logRetention: 7,
      },
    )
    vectorDb.secret?.grantRead(createEmbeddingsLambda)
    storeEmbeddingsLambda.grantInvoke(createEmbeddingsLambda)
    deleteEmbeddingsLambda.grantInvoke(createEmbeddingsLambda)

    const adminDeleteEmbeddingsLambda = new NodejsFunction(
      this,
      'admin-delete-embeddings-function',
      {
        functionName: 'admin-delete-embeddings-function',
        timeout: Duration.seconds(300),// 5 minutes
        bundling: {
          preCompilation: true,
        },
        entry: './lib/lambda/admin/admindeleteembedding.function.ts',
        environment: {
          DELETE_EMBEDDINGS_LAMBDA_NAME: deleteEmbeddingsLambda.functionName,
          VECTOR_DATABASE_SECRET_NAME: vectorDb.secret?.secretName || '',
        },
        logRetention: 7,
      },
    )
    vectorDb.secret?.grantRead(adminDeleteEmbeddingsLambda)
    deleteEmbeddingsLambda.grantInvoke(adminDeleteEmbeddingsLambda)

    const websiteBucket = new s3.Bucket(this, 'RagAIWebBucket', {
      bucketName: 'ragai-website',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const certificate = new DnsValidatedCertificate(
      this,
      'RagAIWebsiteCertificate',
      {
        hostedZone: hostedZone,
        validation: CertificateValidation.fromDns(hostedZone),
        domainName: '<Your wildcard certificate domain e.g. *.example.domain>',
        region: 'us-east-1',
      },
    )

    const {billingTable} = new BillingDatabase(this, 'billing-database', openAIRequestLambda)

    const { secret } = new OpenAISecret(this, `open-ai-secret`)

    secret.grantRead(openAIRequestLambda)
    secret.grantRead(adminSimilaritySearcherLambda)
    secret.grantRead(createEmbeddingsLambda)

    const staticLambdaResources: StaticLambdaResources = {
      openAIRequestLambda,
      customerConfigRetrieverLambda,
      adminSimilaritySearcherLambda,
      adminChatbotConfigRetrieverLambda,
      adminSetChatbotConfigLambda,
      adminCreatePresignedUrlLambda,
      createEmbeddingsLambda,
      adminGetUsageLambda,
      adminDeleteEmbeddingsLambda
    }

    return {
      hostedZone,
      websiteBucket,
      certificate,
      billingTable,
      staticLambdaResources
    }
  }
}
