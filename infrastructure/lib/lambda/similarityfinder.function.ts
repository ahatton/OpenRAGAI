import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { Client } from 'pg'
import {SimilarityResults} from "../../types/global";

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  // @ts-ignore
  const dbConnection = event.dbConnection
  // @ts-ignore
  const customerName = event.customerName
  // @ts-ignore
  const embeddingNames = event.embeddingNames as string[]
  // @ts-ignore
  const embeddingFilter = event.embeddingFilter as EmbeddingFilter | undefined

  const client = new Client({
    host: dbConnection.host,
    port: dbConnection.port,
    user: dbConnection.username,
    password: dbConnection.password,
    database: dbConnection.dbname,
  })

  await client.connect()
  let response: SimilarityResults = []
  try {
    // @ts-ignore
    const searchEmbedding = `[${(event.searchEmbedding as number[]).join(',')}]`

    const closestMatch = embeddingFilter?.closestMatches || 3
    const res = await client.query(
      'SELECT text, 1 - (embedding <=> $1) AS similarity FROM embeddings WHERE customer_name = $2 AND embedding_name = ANY ($3) ORDER BY similarity desc LIMIT $4;',
      [searchEmbedding, customerName, embeddingNames, closestMatch],
    )
    if (
      embeddingFilter !== undefined &&
      embeddingFilter.probability !== undefined
    ) {
      response = res.rows.filter(
        // @ts-ignore
        (row) => row.similarity >= embeddingFilter.probability,
      )
    } else {
      response = res.rows
    }
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  }
}
