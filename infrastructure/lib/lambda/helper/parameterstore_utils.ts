import { SSM } from 'aws-sdk'

const ssm = new SSM()

export async function updateParameterStoreValues(name: string, value: string){
  const params = {
    Name: name,
    Value: value,
    Overwrite: true,
    Type: 'String',
  }

  try {
    const response = await ssm.putParameter(params).promise()
    console.log(`Successfully updated parameter ${name}`)
  } catch (error) {
    console.error(`Error updating parameter ${name}:`, error)
  }
}
