import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { Client } from 'pg'

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  // @ts-ignore
  const dbConnection = event.dbConnection
  // @ts-ignore
  const customerName = event.customerName
  // @ts-ignore
  const embeddingName = event.embeddingName

  const client = new Client({
    host: dbConnection.host,
    port: dbConnection.port,
    user: dbConnection.username,
    password: dbConnection.password,
    database: dbConnection.dbname,
  })

  await client.connect()
  try {
    const res = await client.query(
      'DELETE FROM embeddings WHERE customer_name = $1 AND embedding_name = $2',
      [customerName, embeddingName],
    )
  } catch (err) {
    console.error(err)
    throw err
  } finally {
    await client.end()
  }

  return {
    statusCode: 200,
    body: JSON.stringify('Embedding deleted successfully!'),
  }
}
