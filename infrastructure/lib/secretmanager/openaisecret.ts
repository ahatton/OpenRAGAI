import {Construct} from 'constructs';
import {RemovalPolicy} from 'aws-cdk-lib';
import * as sm from "aws-cdk-lib/aws-secretsmanager";
import {getSecret} from "./utils";
import {ISecret} from "aws-cdk-lib/aws-secretsmanager";

export class OpenAISecret extends Construct {
  public secret: ISecret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const openAPISecretName = 'openaitoken';

    getSecret(openAPISecretName).catch(() => {
      new sm.Secret(this, openAPISecretName, {
        secretName: openAPISecretName,
        description: `Open AI Token`,
        removalPolicy: RemovalPolicy.RETAIN
      });
    })

    this.secret = sm.Secret.fromSecretNameV2(this, `OpenAISecret`, openAPISecretName);

  }
}