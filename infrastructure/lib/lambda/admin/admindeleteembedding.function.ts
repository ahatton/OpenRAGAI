import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { Lambda } from 'aws-sdk'
import { getSecret } from '../../secretmanager/utils'
import {getAllChatbotConfig, getCustomerParameters} from '../helper/utils'
import { updateParameterStoreValues } from '../helper/parameterstore_utils'

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (event.body) {
    const body = JSON.parse(event.body)
    let embeddingName = body.embeddingName
    if (event.stageVariables) {
      const domainName = event.stageVariables['domain'] as string

      const customerParameters = await getCustomerParameters(domainName)

      const dbSecrets = await getSecret(
        process.env.VECTOR_DATABASE_SECRET_NAME as string,
      )

      const dbSecretsJson = JSON.parse(dbSecrets)
      console.log(
        `Deleting existing embeddings from database if they exist for ${customerParameters.customerName} and ${embeddingName}`,
      )
      await deleteEmbeddings(
        event,
        dbSecretsJson,
        customerParameters.customerName,
        embeddingName,
      )

      for (const chatbot of customerParameters.chatbots) {
        const allChatbotConfig = await getAllChatbotConfig(domainName, chatbot.id)
        if (
          allChatbotConfig.embeddingNames &&
          allChatbotConfig.embeddingNames.includes(embeddingName)
        ) {
          allChatbotConfig.embeddingNames = allChatbotConfig.embeddingNames.filter(
            (name) => name !== embeddingName,
          )

          await updateParameterStoreValues(
            `/${domainName}/chatbot/${allChatbotConfig.id}`,
            JSON.stringify({
              embeddingFilter: allChatbotConfig.embeddingFilter,
              additionalContext: allChatbotConfig.additionalContext,
              embeddingNames: allChatbotConfig.embeddingNames,
              noMatchesMessage: allChatbotConfig.noMatchesMessage,
            }),
          )
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Embedding Deleted',
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

const deleteEmbeddings = async (
  event: APIGatewayEvent,
  dbSecrets: object,
  customerName: string,
  embeddingName: string,
) => {
  const response = await new Lambda()
    .invoke({
      FunctionName: process.env.DELETE_EMBEDDINGS_LAMBDA_NAME as string,
      Payload: JSON.stringify({
        ...event,
        ...{
          dbConnection: dbSecrets,
          customerName: customerName,
          embeddingName: embeddingName,
        },
      }),
    })
    .promise()
  return JSON.parse(response.Payload as string)
}
