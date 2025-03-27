import { APIGatewayProxyResult, Context, S3Event } from 'aws-lambda'
import { Client } from 'pg'
import { Embedding } from '../../../types/global'

export const handler = async (
  event: S3Event,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  // @ts-ignore
  const dbConnection = event.dbConnection
  // @ts-ignore
  const customerName = event.customerName
  // @ts-ignore
  const embeddingName = event.embeddingName as string
  // @ts-ignore
  const embeddings = event.embeddings as Array<Embedding>

  const client = new Client({
    host: dbConnection.host,
    port: dbConnection.port,
    user: dbConnection.username,
    password: dbConnection.password,
    database: dbConnection.dbname,
  })

  await client.connect()
  try {
    for (const embedding of embeddings) {
      // @ts-ignore
      const vector = `[${embedding.vector.join(',')}]`
      await client.query(
        'INSERT INTO embeddings (customer_name, embedding_name, text, embedding) VALUES ($1, $2, $3, $4)',
        [customerName, embeddingName, embedding.text, vector],
      )
    }
  } catch (err) {
    console.error(err)
    throw err
  } finally {
    await client.end()
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Embeddings stored successfully' }),
  }
}
