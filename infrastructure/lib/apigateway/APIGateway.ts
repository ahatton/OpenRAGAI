import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import {
  IdentitySource,
  LambdaIntegration,
  RequestAuthorizer,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway'
import { IUserPool } from 'aws-cdk-lib/aws-cognito'
import { Duration } from 'aws-cdk-lib'
import { Customer, StaticLambdaResources } from '../../types/global'
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb'

export class APIGateway extends Construct {
  public apiGatewayId: string
  public apiAuthLambda: NodejsFunction

  constructor(
    scope: Construct,
    id: string,
    customer: Customer,
    userPool: IUserPool,
    userPoolClientId: string,
    billingTable: TableV2,
    staticLambdaResources: StaticLambdaResources,
  ) {
    super(scope, id)

    const api = new RestApi(this, `${customer.name}-rest-api`, {
      restApiName: `${customer.name}-rest-api`,
      description: `${customer.name} Open AI API`,
      deployOptions: {
        stageName: 'prod',
        variables: {
          domain: customer.domain,
        },
      },
    })

    const openAILambdaIntegration = new LambdaIntegration(
      staticLambdaResources.openAIRequestLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const adminSimilaritySearcherLambdaIntegration = new LambdaIntegration(
      staticLambdaResources.adminSimilaritySearcherLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const adminDeleteEmbeddingsLambdaIntegration = new LambdaIntegration(
      staticLambdaResources.adminDeleteEmbeddingsLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const customerConfigLambdaIntegration = new LambdaIntegration(
      staticLambdaResources.customerConfigRetrieverLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const adminChatbotConfigRetrieverLambdaIntegration = new LambdaIntegration(
      staticLambdaResources.adminChatbotConfigRetrieverLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const adminSetChatbotConfigLambdaIntegration = new LambdaIntegration(
      staticLambdaResources.adminSetChatbotConfigLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const adminCreatePresignedUrlLambdaIntegration = new LambdaIntegration(
      staticLambdaResources.adminCreatePresignedUrlLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const adminGetUsageLambdaIntegration = new LambdaIntegration(
      staticLambdaResources.adminGetUsageLambda,
      {
        proxy: true,
        timeout: Duration.seconds(29),
      },
    )

    const apiResource = api.root.addResource('api')
    const memberResource = apiResource.addResource('member')
    const chatResource = memberResource.addResource('chat')
    const configResource = memberResource.addResource('config')

    const adminResource = apiResource.addResource('admin')
    const adminChatbotResource = adminResource.addResource('chatbot')
    const adminSpecificChatbotResource =
      adminChatbotResource.addResource('{chatbotId}')
    const adminChatbotConfigResource =
      adminSpecificChatbotResource.addResource('config')
    const similaritySearchResource = adminResource.addResource('similarity')

    const adminUploadResource = adminResource.addResource('upload')
    const adminUsageResource = adminResource.addResource('usage')
    const adminEmbeddingResource = adminResource.addResource('embedding')

    const apiAuthLambda = new NodejsFunction(
      this,
      `${customer.name}-api-auth-function`,
      {
        functionName: `${customer.name}-api-auth-function`,
        timeout: Duration.seconds(29),
        bundling: {
          preCompilation: true,
        },
        environment: {
          userPoolId: userPool.userPoolId,
          userPoolClientId: userPoolClientId,
        },
        entry: './lib/lambda/apiauthoriser.function.ts',
        logRetention: 7,
      },
    )

    billingTable.grantReadData(apiAuthLambda)
    billingTable.grantReadData(staticLambdaResources.adminGetUsageLambda)

    const cognitoAuthorizer = new RequestAuthorizer(
      this,
      `${customer.name}-cognito-authorizer`,
      {
        authorizerName: `${customer.name}-cognito-authorizer`,
        handler: apiAuthLambda,
        identitySources: [IdentitySource.header('Authorization')],
      },
    )

    chatResource.addMethod('POST', openAILambdaIntegration, {
      authorizer: cognitoAuthorizer,
    })
    chatResource.addCorsPreflight({
      statusCode: 200,
      allowHeaders: ['*'],
      allowCredentials: true,
      allowMethods: ['POST', 'OPTIONS'],
      allowOrigins: ['*'],
    })

    configResource.addMethod('GET', customerConfigLambdaIntegration, {
      authorizer: cognitoAuthorizer,
    })
    configResource.addCorsPreflight({
      statusCode: 200,
      allowHeaders: ['*'],
      allowCredentials: true,
      allowMethods: ['GET', 'OPTIONS'],
      allowOrigins: ['*'],
    })

    similaritySearchResource.addMethod(
      'POST',
      adminSimilaritySearcherLambdaIntegration,
      {
        authorizer: cognitoAuthorizer,
      },
    )

    adminChatbotConfigResource.addMethod(
      'GET',
      adminChatbotConfigRetrieverLambdaIntegration,
      {
        authorizer: cognitoAuthorizer,
      },
    )

    adminChatbotConfigResource.addMethod(
      'POST',
      adminSetChatbotConfigLambdaIntegration,
      {
        authorizer: cognitoAuthorizer,
      },
    )

    adminUploadResource.addMethod(
      'POST',
      adminCreatePresignedUrlLambdaIntegration,
      {
        authorizer: cognitoAuthorizer,
      },
    )

    adminEmbeddingResource.addMethod(
      'DELETE',
      adminDeleteEmbeddingsLambdaIntegration,
      {
        authorizer: cognitoAuthorizer,
      }
    )

    adminUsageResource.addMethod(
      'GET',
      adminGetUsageLambdaIntegration,
      {
        authorizer: cognitoAuthorizer,
      },
    )

    this.apiGatewayId = api.restApiId
    this.apiAuthLambda = apiAuthLambda
  }
}
