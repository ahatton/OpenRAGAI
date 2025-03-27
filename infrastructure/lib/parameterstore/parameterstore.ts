import { Construct } from 'constructs'
import {
  ParameterDataType,
  ParameterTier,
  StringParameter,
} from 'aws-cdk-lib/aws-ssm'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { createHash } from 'node:crypto'
import { Customer, StaticLambdaResources } from '../../types/global'

export class ClientParameterStore extends Construct {
  constructor(
    scope: Construct,
    id: string,
    customer: Customer,
    apiAuthLambda: NodejsFunction,
    staticLambdaResources: StaticLambdaResources,
  ) {
    super(scope, id)

    customer.chatbots = customer.chatbots.map((chatbot, index) => ({
      ...chatbot,
      id: createHash('sha256')
        .update(`${customer.name}${chatbot.name}`)
        .digest('hex'),
    }))

    const publicClientConfig = new StringParameter(
      this,
      `${customer.name}-client-config-public`,
      {
        allowedPattern: '.*',
        dataType: ParameterDataType.TEXT,
        parameterName: `/${customer.domain}/public`,
        stringValue: JSON.stringify({
          chatbots: customer.chatbots.map((chatbot, index) => ({
            name: chatbot.name,
            id: chatbot.id,
          })),
        }),
        tier: ParameterTier.STANDARD,
        description: `${customer.name} config`,
      },
    )

    const privateClientConfig = new StringParameter(
      this,
      `${customer.name}-client-config-private`,
      {
        allowedPattern: '.*',
        dataType: ParameterDataType.TEXT,
        parameterName: `/${customer.domain}/private`,
        stringValue: JSON.stringify({
          customerName: customer.name,
          monthlyTokenLimit: customer.monthlyTokenLimit,
          chatbots: customer.chatbots.map((chatbot, index) => ({
            name: chatbot.name,
            model: chatbot.model,
            embeddingNames: chatbot.embeddingNames,
            id: chatbot.id,
          })),
        }),
        tier: ParameterTier.STANDARD,
        description: `${customer.name} config`,
      },
    )

    // Do NOT update to have values as overwriting this would remove customer chatbot configs
    const chatbotConfigs = customer.chatbots.map((chatbot, index) => {
      return new StringParameter(
        this,
        `${customer.name}-${chatbot.id}-config`,
        {
          allowedPattern: '.*',
          dataType: ParameterDataType.TEXT,
          parameterName: `/${customer.domain}/chatbot/${chatbot.id}`,
          stringValue: JSON.stringify({}),
          tier: ParameterTier.STANDARD,
          description: `${customer.name} chatbot ${chatbot.id} config`,
        },
      )
    })

    // Do NOT update to have values as overwriting this would remove customer generated API key
    const apiKey = new StringParameter(this, `${customer.name}-api-key`, {
      allowedPattern: '.*',
      dataType: ParameterDataType.TEXT,
      parameterName: `/${customer.domain}/private/api-key`,
      stringValue: 'none',
      tier: ParameterTier.STANDARD,
      description: `${customer.name} private apikey config`,
    })

    publicClientConfig.grantRead(
      staticLambdaResources.customerConfigRetrieverLambda,
    )

    apiKey.grantRead(apiAuthLambda)

    privateClientConfig.grantRead(apiAuthLambda)
    privateClientConfig.grantRead(staticLambdaResources.openAIRequestLambda)
    privateClientConfig.grantRead(
      staticLambdaResources.adminChatbotConfigRetrieverLambda,
    )
    privateClientConfig.grantRead(
      staticLambdaResources.adminSimilaritySearcherLambda,
    )
    privateClientConfig.grantRead(
      staticLambdaResources.adminCreatePresignedUrlLambda,
    )
    privateClientConfig.grantRead(staticLambdaResources.createEmbeddingsLambda)
    privateClientConfig.grantRead(staticLambdaResources.adminGetUsageLambda)
    privateClientConfig.grantRead(
      staticLambdaResources.adminDeleteEmbeddingsLambda,
    )

    chatbotConfigs.forEach((chatbotConfig) => {
      chatbotConfig.grantRead(staticLambdaResources.openAIRequestLambda)
      chatbotConfig.grantRead(
        staticLambdaResources.adminChatbotConfigRetrieverLambda,
      )
      chatbotConfig.grantWrite(
        staticLambdaResources.adminSetChatbotConfigLambda,
      )
      chatbotConfig.grantRead(staticLambdaResources.adminDeleteEmbeddingsLambda)
      chatbotConfig.grantWrite(
        staticLambdaResources.adminDeleteEmbeddingsLambda,
      )
    })
  }
}
