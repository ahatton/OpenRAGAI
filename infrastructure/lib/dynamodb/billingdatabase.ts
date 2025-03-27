import { Construct } from 'constructs'
import {AttributeType, TableV2} from "aws-cdk-lib/aws-dynamodb";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";

export class BillingDatabase extends Construct {
  public billingTable: TableV2
  constructor(
    scope: Construct,
    id: string,
    openAIRequestLambda: NodejsFunction,
  ) {
    super(scope, id)

    const billingTable = new TableV2(this, 'billing-table', {
      tableName: 'RAGAI_BILLING_TABLE',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    })

    billingTable.grantReadWriteData(openAIRequestLambda)

    this.billingTable = billingTable
  }
}
