import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import {S3} from "aws-sdk";
const s3 = new S3()

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (event.stageVariables) {
    const domainName = event.stageVariables['domain'] as string
    if (event.body){
      const body = JSON.parse(event.body)
      const filename = body.filename
      if (domainName && filename) {
        return getUploadURL(domainName, filename)
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

const getUploadURL = async function(domainName: string, filename: string) {

  const URL_EXPIRATION_SECONDS = 300
  const s3Params = {
    Bucket: `${domainName}-upload-bucket`,
    Key: filename,
    Expires: URL_EXPIRATION_SECONDS,
    ContentType: 'text/plain'
  }
  const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params)
  return {
    statusCode:200,
    body: JSON.stringify({
      uploadURL: uploadURL,
      filename: filename
    })
  }
}