import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import {Customer} from "../../types/global";

export class ClientConfig extends Construct {

  constructor(scope: Construct, id: string, customer: Customer, websiteBucket: Bucket, userPoolClientId: string, userPoolId: string) {
    super(scope, id);

    new s3Deploy.BucketDeployment(this, `${customer.name}-custom-config-deploy`, {
      sources: [
        s3Deploy.Source.jsonData(`${customer.domain}.content/config.json`, {
          userPoolClientId: userPoolClientId,
          userPoolId: userPoolId
        }),

      ],
      prune: false,
      destinationBucket: websiteBucket
    });
  }
}