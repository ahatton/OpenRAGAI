import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import OpenAI from 'openai'
import { getSecret } from '../../secretmanager/utils'
import { Lambda } from 'aws-sdk'
import { getStaticChatbotConfig } from '../helper/utils'
import { EmbeddingFilter, SimilarityResults } from '../../../types/global'

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (event.body) {
    const body = JSON.parse(event.body)
    const message = body.message
    if (event.stageVariables) {
      const domainName = event.stageVariables['domain'] as string
      if (domainName) {
        const chatbot = await getStaticChatbotConfig(domainName, body.id)

        const openai = new OpenAI({
          apiKey: await getSecret('openaitoken'),
        })
        const embeddingFilter: EmbeddingFilter = {
          closestMatches: body.closestMatches ? body.closestMatches : null,
          probability: body.probability ? body.probability : null,
        }
        const similarities: SimilarityResults = await retrieveSimilarities(
          event,
          chatbot.customerName,
          body.embeddingNames ? body.embeddingNames : null,
          embeddingFilter,
          openai,
          message,
        )
        return {
          statusCode: 200,
          body: JSON.stringify({
            similarities,
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

const retrieveSimilarities = async (
  event: APIGatewayEvent,
  customerName: string,
  embeddingNames: string[],
  embeddingFilter: EmbeddingFilter | undefined,
  openai: OpenAI,
  message: string,
) => {
  const searchEmbedding = (
    await openai.embeddings.create({
      input: message,
      model: 'text-embedding-3-small',
    })
  ).data[0].embedding

  const dbSecrets = await getSecret(
    process.env.VECTOR_DATABASE_SECRET_NAME as string,
  )

  const dbSecretsJson = await JSON.parse(dbSecrets)

  let similarities: SimilarityResults = []
  const lambdaResult = await new Lambda()
    .invoke({
      FunctionName: process.env.SIMILARITY_FINDER_LAMBDA_NAME as string,
      Payload: JSON.stringify({
        ...event,
        ...{
          dbConnection: dbSecretsJson,
          searchEmbedding: searchEmbedding,
          customerName: customerName,
          embeddingNames: embeddingNames,
          embeddingFilter: embeddingFilter,
        },
      }),
    })
    .promise()
  const payload = await JSON.parse(lambdaResult.Payload as string)
  similarities = (await JSON.parse(payload.body)) as SimilarityResults

  return similarities
}
