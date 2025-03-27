import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { getAllChatbotConfig } from '../helper/utils'
import { Lambda } from 'aws-sdk'
import { getSecret } from '../../secretmanager/utils'

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (event.stageVariables) {
    const domainName = event.stageVariables['domain'] as string
    if (domainName) {
      const pathParams = event.pathParameters
      if (pathParams && pathParams.chatbotId) {
        const chatbotConfig = await getAllChatbotConfig(
          domainName,
          pathParams.chatbotId,
        )
        return {
          statusCode: 200,
          body: JSON.stringify({
            name: chatbotConfig.name,
            embeddingFilter: chatbotConfig.embeddingFilter,
            allEmbeddingNames: await getAllEmbeddingNames(
              event,
              chatbotConfig.customerName,
            ),
            embeddingNames: chatbotConfig.embeddingNames,
            additionalContext: chatbotConfig.additionalContext,
            noMatchesMessage: chatbotConfig.noMatchesMessage,
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

async function getAllEmbeddingNames(
  event: APIGatewayEvent,
  customerName: string,
): Promise<Array<string>> {
  const dbSecrets = await getSecret(
    process.env.VECTOR_DATABASE_SECRET_NAME as string,
  )

  const dbSecretsJson = await JSON.parse(dbSecrets)

  const lambdaResult = await new Lambda()
    .invoke({
      FunctionName: process.env.GET_ALL_EMBEDDING_NAMES_LAMBDA_NAME as string,
      Payload: JSON.stringify({
        ...event,
        ...{
          dbConnection: dbSecretsJson,
          customerName: customerName,
        },
      }),
    })
    .promise()
  const payload = await JSON.parse(lambdaResult.Payload as string)
  return (await JSON.parse(payload.body)) as Array<string>
}
