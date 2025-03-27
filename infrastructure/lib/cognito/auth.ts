import { Construct } from 'constructs'
import {
  CfnUserPoolGroup,
  IUserPool,
  UserPool,
  UserPoolClient,
  UserPoolDomain,
  VerificationEmailStyle,
} from 'aws-cdk-lib/aws-cognito'
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53'
import { UserPoolDomainTarget } from 'aws-cdk-lib/aws-route53-targets'
import * as cdk from 'aws-cdk-lib'
import { RemovalPolicy } from 'aws-cdk-lib'
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager'
import {Customer} from "../../types/global";

export class Auth extends Construct {
  public userPoolClientId: string;
  public userPoolId: string;
  public userPool: IUserPool;

  constructor(scope: Construct, id: string, customer: Customer, certificate: DnsValidatedCertificate, hostedZone: IHostedZone) {
    super(scope, id);
    this.userPool = new UserPool(this, `${customer.name}-openai-userpool`, {
      removalPolicy: RemovalPolicy.DESTROY,
      //email: UserPoolEmail.withSES(), TODO uncomment this line to use SES once you have a verified domain
      userPoolName: `${customer.name}-openai-userpool`,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      selfSignUpEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      signInCaseSensitive: false,
      userVerification: {
        emailSubject: `Verify your account`,
        emailBody:
          'Thanks for signing up to our awesome app! Your verification code is {####}',
        emailStyle: VerificationEmailStyle.CODE,
        smsMessage:
          'Thanks for signing up to our awesome app! Your verification code is {####}',
      },
      userInvitation: {
        emailSubject: 'Your AI Journey is ready!',
        emailBody: `Hello {username}, your account is now active!
You can login using your temporary password {####}
Please visit ${customer.domain} to get started.`,
      },
    })

    new CfnUserPoolGroup(this, `${customer.name}-openai-userpool-admin-group`, {
      groupName: 'administrators',
      userPoolId: this.userPool.userPoolId,
      description: 'User who have admin access to maintain our chat bots',
      precedence: 0,
    })

    new CfnUserPoolGroup(this, `${customer.name}-openai-userpool-member-group`, {
      groupName: 'members',
      userPoolId: this.userPool.userPoolId,
      description: 'User who have basic access to our chat bots',
      precedence: 5,
    })


    const userPoolDomain = new UserPoolDomain(this, `${customer.name}-openai-userpool-domain`, {
      userPool: this.userPool,
      customDomain: {
        domainName: `auth-${customer.domain}`,
        certificate
      }
    })

    new ARecord(this, `${customer.name}-openai-userpool-domain-dns`, {
      zone: hostedZone,
      recordName: `auth-${customer.domain}`,
      target: RecordTarget.fromAlias(new UserPoolDomainTarget(userPoolDomain)),
    });

    const userPoolClient = new UserPoolClient(this, `${customer.name}-openai-userpool-client`, {
      userPoolClientName: `${customer.name}-openai-userpool-client`,
      userPool: UserPool.fromUserPoolId(this, `${customer.name}-openai-userpool-base`, this.userPool.userPoolId),
      generateSecret: false,
      accessTokenValidity: cdk.Duration.minutes(15),
      refreshTokenValidity: cdk.Duration.days(1),
      authFlows: {
        adminUserPassword: true,
        custom: false,
        userPassword: false,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    })
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;
  }
}