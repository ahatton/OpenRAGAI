import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { getPublicParameters } from './helper/utils'

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (event.stageVariables) {
    const domainName = event.stageVariables['domain'] as string
    if (domainName) {
      const parameters = await getPublicParameters(domainName)
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Headers" : "Content-Type,Authorization",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*"
        },
        body: JSON.stringify({
          message: parameters,
        }),
      }
    }
  }
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: 'Invalid request',
    }),
  }
}
