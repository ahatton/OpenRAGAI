import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { updateParameterStoreValues } from '../helper/parameterstore_utils'

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (event.body && event.stageVariables) {
    const domainName = event.stageVariables['domain'] as string
    if (domainName) {
      const pathParams = event.pathParameters
      if (pathParams?.chatbotId) {
        const body = JSON.parse(event.body)

        await updateParameterStoreValues(
          `/${domainName}/chatbot/${pathParams.chatbotId}`,
          JSON.stringify({
            embeddingFilter: {
              probability: body.probability,
              closestMatches: body.closestMatches,
            },
            additionalContext: body.additionalContext,
            embeddingNames: body.embeddingNames,
            noMatchesMessage: body.noMatchesMessage,
          }),
        )
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Chatbot updated',
          }),
        }
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
