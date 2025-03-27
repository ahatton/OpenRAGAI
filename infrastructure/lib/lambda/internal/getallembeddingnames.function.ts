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

  const client = new Client({
    host: dbConnection.host,
    port: dbConnection.port,
    user: dbConnection.username,
    password: dbConnection.password,
    database: dbConnection.dbname,
  })

  await client.connect()
  let response = [] as Array<string>
  try {
    const res = await client.query(
      'SELECT DISTINCT embedding_name FROM embeddings WHERE customer_name = $1',
      [customerName],
    )
    response = res.rows.map((row) => row.embedding_name)
  } catch (err) {
    console.error(err)
    throw err
  } finally {
    await client.end()
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  }
}
