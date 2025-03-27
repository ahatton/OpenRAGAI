import * as AWS from "aws-sdk";

const secretsManager = new AWS.SecretsManager({region: 'eu-west-2'});

export const getSecret = async (secretName: string): Promise<string> => {
  try {
    const SecretManagerResults = await secretsManager.getSecretValue(
      {SecretId: secretName}
    ).promise();

    return SecretManagerResults.SecretString as string;
  } catch (err) {
    console.log(err);
    throw err;
  }
}