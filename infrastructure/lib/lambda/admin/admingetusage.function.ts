import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { getCustomerParameters } from '../helper/utils'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

type Usage = {
  date: Date
  tokensUsed: number
}

const dbClient = new DocumentClient({ apiVersion: 'latest' })

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (!event.stageVariables) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Invalid request',
      }),
    }
  }

  const domainName = event.stageVariables['domain'] as string
  const parameters = await getCustomerParameters(domainName)
  const usage = await getMonthlyUsage(parameters.customerName)

  return {
    statusCode: 200,
    body: JSON.stringify({
      usage,
      monthlyAllowance: parameters.monthlyTokenLimit,
    }),
  }
}

async function getMonthlyUsage(customerName: string): Promise<Usage[]> {
  const params = {
    TableName: 'RAGAI_BILLING_TABLE',
    FilterExpression: 'begins_with(#id, :substring1)',
    ExpressionAttributeNames: {
      '#id': 'id',
    },
    ExpressionAttributeValues: {
      ':substring1': `${customerName}#`,
    },
  }

  const data = await dbClient.scan(params).promise()
  if (!data.Items) return []

  const usageMap = new Map<string, number>()
  data.Items.forEach((item) => {
    const [customerName, chatbotName, model, type, year, month] =
      item.id.split('#')
    const date = `${year}-${month}`
    const currentTokens = usageMap.get(date) || 0
    usageMap.set(date, currentTokens + item.Tokens)
  })

  return Array.from(usageMap).map(([key, value]) => {
    const [year, month] = key.split('-')
    return {
      date: new Date(Date.UTC(parseInt(year), parseInt(month) - 1)),
      tokensUsed: value,
    }
  })
}
