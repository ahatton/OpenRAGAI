import * as cdk from 'aws-cdk-lib';
import {Stack} from 'aws-cdk-lib';
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import {DnsValidatedCertificate} from "aws-cdk-lib/aws-certificatemanager";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {Construct} from 'constructs';
import {ARecord, IHostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {Customer} from "../../types/global";

export class RagAIWebStack extends Construct {

  constructor(scope: Construct, id: string, customer: Customer, hostedZone: IHostedZone, certificate: DnsValidatedCertificate, websiteBucket: Bucket, apiGatewayId: string) {
    super(scope, id);

    const distribution = new cloudfront.Distribution(this, `${customer.name}-RagAIWebsiteDistribution`, {
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
        origin: new cloudfrontOrigins.S3Origin(websiteBucket, {originPath: "/site"}),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: new cloudfrontOrigins.HttpOrigin(`${apiGatewayId}.execute-api.${Stack.of(this).region}.amazonaws.com`, {originPath: `/prod`}),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        [`/${customer.domain}.content/*`]: {
          origin: new cloudfrontOrigins.S3Origin(websiteBucket),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          compress: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      domainNames: [customer.domain],
      certificate: certificate,
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/",
          ttl: cdk.Duration.minutes(30),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
    });

    const cloudfrontTarget = RecordTarget
      .fromAlias(new CloudFrontTarget(distribution));

    new ARecord(this, `${customer.name}-ARecord`, {
      zone: hostedZone,
      recordName: customer.domain,
      target: cloudfrontTarget,
      ttl: cdk.Duration.hours(1),
    });


  }
}