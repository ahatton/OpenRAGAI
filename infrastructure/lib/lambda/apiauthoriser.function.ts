import { APIGatewayAuthorizerResult, Context } from 'aws-lambda'
import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda/trigger/api-gateway-authorizer'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import {getCustomerCreatedApiKey, getCustomerParameters} from './helper/utils'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.userPoolId as string,
  tokenUse: 'id',
  clientId: process.env.userPoolClientId as string,
})

const dbClient = new DocumentClient({ apiVersion: 'latest' })

const today = new Date()
const year = today.getFullYear()
const month = today.getMonth() + 1

async function getMonthlyUsage(customerName: string): Promise<number> {
  const params = {
    TableName: 'RAGAI_BILLING_TABLE',
    FilterExpression:
      'begins_with(#id, :substring1) AND contains(#id, :substring2)',
    ExpressionAttributeNames: {
      '#id': 'id',
    },
    ExpressionAttributeValues: {
      ':substring1': `${customerName}#`,
      ':substring2': `#${year}#${month}`,
    },
  }

  let totalUsage = 0
  await dbClient.scan(params, function (err, data) {
    if (err) {
      console.error('Unable to query. Error:', JSON.stringify(err, null, 2))
    } else {
      if (data.Items) {
        data.Items.forEach(function (item) {
          totalUsage += item.Tokens
        })
      }
    }
  }).promise()
  return totalUsage
}

async function hasCreditsRemaining(domainName: string): Promise<boolean> {
  const parameters = await getCustomerParameters(domainName)
  const currentUsage = await getMonthlyUsage(parameters.customerName)
  if(currentUsage > parameters.monthlyTokenLimit) {
    console.error('Monthly token limit exceeded')
    return false
  }
  return true
}

type AuthResult = {
  userType: 'member' | 'admin'
}

const verifyToken = async (token: string, domainName: string): Promise<AuthResult> => {
  const apiKey = await getCustomerCreatedApiKey(domainName)
  if(apiKey !== null && apiKey !== undefined && apiKey !== '' && apiKey !== "none" && apiKey.length > 10) {
    if(token === apiKey) {
      return { userType: 'member' }
    }
  }
  const payload = await jwtVerifier.verify(token)
  if (
    payload['cognito:groups'] &&
    payload['cognito:groups'].includes('members')
  ) {
    return { userType: 'member' }
  }
  if (
    payload['cognito:groups'] &&
    payload['cognito:groups'].includes('administrators')
  ) {
    return { userType: 'admin' }
  }
  throw new Error('User is not a member of any group and does not have a valid API key')
}

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
  context: Context,
): Promise<APIGatewayAuthorizerResult> => {
  try {
    // @ts-ignore
    const token = event.headers.Authorization as string

    // @ts-ignore
    const authResult = await verifyToken(token, event.stageVariables['domain'])

    let accessArns: string[] = []
    // @ts-ignore
    const hasCredits = await hasCreditsRemaining(event.stageVariables['domain'])
    if (
      authResult.userType === 'member'
    ) {
      if (hasCredits) {
        accessArns = [
          event.methodArn
            .replace(/(POST|GET|PUT|DELETE|PATCH)/, '*')
            .replace(/(\/api\/).*/, '/api/member/*'),
        ]
      } else {
        accessArns = [
          event.methodArn
            .replace(/(POST|GET|PUT|DELETE|PATCH)/, 'GET')
            .replace(/(\/api\/).*/, '/api/member/*'),
          event.methodArn
            .replace(/(POST|GET|PUT|DELETE|PATCH)/, 'DELETE')
            .replace(/(\/api\/).*/, '/api/member/*'),
        ]
      }
    } else if (
      authResult.userType === 'admin'
    ) {
      if (hasCredits) {
        accessArns = [
          event.methodArn
            .replace(/(POST|GET|PUT|DELETE|PATCH)/, '*')
            .replace(/(\/api\/).*/, '/api/*'),
        ]
      } else {
        accessArns = [
          event.methodArn
            .replace(/(POST|GET|PUT|DELETE|PATCH)/, 'GET')
            .replace(/(\/api\/).*/, '/api/*'),
          event.methodArn
            .replace(/(POST|GET|PUT|DELETE|PATCH)/, 'DELETE')
            .replace(/(\/api\/).*/, '/api/*'),
        ]
      }
    } else {
      console.error('User is not a member of any group')
      return {
        principalId: 'user',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: '*',
            },
          ],
        },
      }
    }

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: accessArns,
          },
        ],
      },
    }
  } catch (e) {
    console.error(e)
    console.error('Failed to verify token')
  }

  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Deny',
          Resource: '*',
        },
      ],
    },
  }
}
