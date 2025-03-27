import { S3Event, S3Handler } from 'aws-lambda'
import { Lambda, S3 } from 'aws-sdk'
import * as readline from 'readline'
import { getCustomerParameters } from '../helper/utils'
import { Embedding } from '../../../types/global'
import OpenAI from 'openai'
import { getSecret } from '../../secretmanager/utils'

const s3 = new S3()

export const handler: S3Handler = async (event: S3Event) => {
  const apiKey = await getSecret('openaitoken')
  const openai = new OpenAI({
    apiKey: apiKey,
  })
  const bucket = event.Records[0].s3.bucket.name
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, ' '),
  )

  try {
    const customerParameters = await getCustomerParameters(
      event.Records[0].s3.bucket.name.replace('-upload-bucket', ''),
    )

    const s3ReadStream = s3
      .getObject({ Bucket: bucket, Key: key })
      .createReadStream()

    const rl = readline.createInterface({
      input: s3ReadStream,
      terminal: false,
    })

    let lineCount = 0
    let embeddings: Array<Embedding> = []
    const embeddingName = key.replace('.txt', '')
    const dbSecrets = await getSecret(
      process.env.VECTOR_DATABASE_SECRET_NAME as string,
    )

    const dbSecretsJson = await JSON.parse(dbSecrets)

    let myReadPromise = new Promise<void>((resolve, reject) => {
      rl.on('line', (line) => {
        if (line && line.length > 0) {
          embeddings.push({
            text: line,
          })
        }
      })
      rl.on('error', (error) => {
        console.error('Error reading file', error)
        reject(error)
      })
      rl.on('close', () => {
        resolve()
      })
    })

    await myReadPromise

    if (embeddings.length > 0) {
      console.log(
        `Deleting existing embeddings from database if they exist for ${customerParameters.customerName} and ${embeddingName}`,
      )
      await deleteEmbeddings(
        event,
        dbSecretsJson,
        customerParameters.customerName,
        embeddingName,
      )
    }

    while (embeddings.length > 0) {
      let embeddingsToProcess = embeddings.splice(0, 20)
      embeddingsToProcess = await getEmbeddingFromOpenAI(
        openai,
        embeddingsToProcess,
      )
      console.log(
        `Storing embeddings for embeddingName ${embeddingName} and customer ${customerParameters.customerName}`,
      )
      await storeEmbeddings(
        event,
        dbSecretsJson,
        customerParameters.customerName,
        embeddingName,
        embeddingsToProcess,
      )
    }
  } catch (error) {
    console.error(
      `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`,
    )
    console.error(error)
  } finally {
    console.log(
      `Processing complete: Deleting file ${key} from bucket ${bucket}`,
    )
    await s3.deleteObject({ Bucket: bucket, Key: key }).promise()
  }
}

async function getEmbeddingFromOpenAI(
  openai: OpenAI,
  embeddings: Array<Embedding>,
): Promise<Array<Embedding>> {
  const results = await openai.embeddings.create({
    input: embeddings.map((embedding) => embedding.text),
    model: 'text-embedding-3-small',
  })
  embeddings.forEach((embedding, index) => {
    embedding.vector = results.data[index].embedding
  })
  return embeddings
}

async function storeEmbeddings(
  event: S3Event,
  dbSecrets: object,
  customerName: string,
  embeddingName: string,
  embeddings: Array<Embedding>,
) {
  const response = await new Lambda()
    .invoke({
      FunctionName: process.env.STORE_EMBEDDINGS_LAMBDA_NAME as string,
      Payload: JSON.stringify({
        ...event,
        ...{
          dbConnection: dbSecrets,
          customerName: customerName,
          embeddingName: embeddingName,
          embeddings: embeddings,
        },
      }),
    })
    .promise()
  return await JSON.parse(response.Payload as string)
}

const deleteEmbeddings = async (
  event: S3Event,
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
  return await JSON.parse(response.Payload as string)
}
