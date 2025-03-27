import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import OpenAI from 'openai'
import { getSecret } from '../secretmanager/utils'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { config, Lambda } from 'aws-sdk'
import { getAllChatbotConfig } from './helper/utils'
import { EmbeddingFilter, SimilarityResults } from '../../types/global'

config.update({ region: 'eu-west-2' })

const today = new Date()
const year = today.getFullYear()
const month = today.getMonth() + 1
const documentClient = new DocumentClient({ apiVersion: 'latest' })

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (event.body) {
    const body = JSON.parse(event.body)
    let message = body.message

    if (event.stageVariables) {
      const domain = event.stageVariables['domain'] as string
      if (domain) {
        const chatbotConfig = await getAllChatbotConfig(domain, body.id)
        const openai = new OpenAI({
          apiKey: await getSecret('openaitoken'),
        })

        if (
          chatbotConfig.embeddingNames !== undefined &&
          chatbotConfig.embeddingNames !== null &&
          chatbotConfig.embeddingNames.length > 0
        ) {
          const similarities: SimilarityResults = await retrieveSimilarities(
            event,
            chatbotConfig.customerName,
            chatbotConfig.embeddingNames,
            chatbotConfig.embeddingFilter,
            openai,
            message,
          )
          if (similarities.length > 0) {
            message = `${chatbotConfig.additionalContext ?? ''}
              ---
              Context: 
              ${similarities.map((similarity) => similarity.text).join('\n')}
              ---
              Question: ${message}`
          } else {
            message =
              chatbotConfig.noMatchesMessage ??
              "Politely tell the user you don't know the answer and cannot help them with their question. Answer in a short sentence."
          }
        } else {
          message = `${chatbotConfig.additionalContext ?? ''}
              ---
              Question: ${message}`
        }

        const chatCompletion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: message }],
          model: chatbotConfig.model,
        })

        const promptBillingParams = {
          TableName: 'RAGAI_BILLING_TABLE',
          Key: {
            id: `${chatbotConfig.customerName}#${chatbotConfig.name}#${chatbotConfig.model}#PromptTokens#${year}#${month}`,
          },
          ExpressionAttributeValues: {
            ':increase': chatCompletion.usage?.total_tokens || 0,
          },
          UpdateExpression: 'add Tokens :increase',
        }
        await documentClient.update(promptBillingParams).promise()

        const completionBillingParams = {
          TableName: 'RAGAI_BILLING_TABLE',
          Key: {
            id: `${chatbotConfig.customerName}#${chatbotConfig.name}#${chatbotConfig.model}#CompletionTokens#${year}#${month}`,
          },
          ExpressionAttributeValues: {
            ':increase': chatCompletion.usage?.completion_tokens || 0,
          },
          UpdateExpression: 'add Tokens :increase',
        }
        await documentClient.update(completionBillingParams).promise()

        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
          },
          body: JSON.stringify({
            message: chatCompletion.choices[0].message.content,
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
