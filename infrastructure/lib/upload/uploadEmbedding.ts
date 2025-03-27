import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import { HttpMethods } from 'aws-cdk-lib/aws-s3'
import * as cdk from 'aws-cdk-lib'
import { Customer, StaticLambdaResources } from '../../types/global'

export class UploadEmbedding extends Construct {
  constructor(
    scope: Construct,
    id: string,
    customer: Customer,
    staticLambdaResources: StaticLambdaResources,
  ) {
    super(scope, id)

    const customerUploadBucket = new s3.Bucket(
      this,
      `${customer.name}-s3-upload-bucket`,
      {
        bucketName: `${customer.domain}-upload-bucket`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        publicReadAccess: false,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        cors: [
          {
            allowedMethods: [
              HttpMethods.HEAD,
              HttpMethods.GET,
              HttpMethods.PUT,
            ],
            allowedOrigins: ['*'],
            allowedHeaders: ['Authorization', '*'],
          },
        ],
        eventBridgeEnabled: true,
      },
    )
    customerUploadBucket.grantWrite(
      staticLambdaResources.adminCreatePresignedUrlLambda,
    )
    customerUploadBucket.grantPut(
      staticLambdaResources.adminCreatePresignedUrlLambda,
    )
    customerUploadBucket.grantRead(staticLambdaResources.createEmbeddingsLambda)
    customerUploadBucket.grantDelete(staticLambdaResources.createEmbeddingsLambda)

    customerUploadBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(staticLambdaResources.createEmbeddingsLambda))
  }
}
