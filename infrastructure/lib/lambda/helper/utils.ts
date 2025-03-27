import { getParameter } from '@aws-lambda-powertools/parameters/ssm'
import { Transform } from '@aws-lambda-powertools/parameters'
import {
  Chatbot,
  ChatbotWithCustomerName,
  CustomerDefinedChatbotConfig,
  CustomerParameters,
} from '../../../types/global'

export async function getAllChatbotConfig(
  domainName: string,
  chatbotId: string,
): Promise<ChatbotWithCustomerName> {
  const customerParameters = await getParameter<CustomerParameters>(
    `/${domainName}/private`,
    {
      transform: Transform.JSON,
    },
  )
  if (customerParameters === undefined) {
    throw new Error('Customer parameters not found')
  }
  const staticChatbotConfig = customerParameters.chatbots.find(
    (chatbot: Chatbot) => chatbot.id === chatbotId,
  )

  if (staticChatbotConfig === undefined) {
    throw new Error('Chatbot not found')
  }

  const chatbotConfig = await getParameter<CustomerDefinedChatbotConfig>(
    `/${domainName}/chatbot/${chatbotId}`,
    {
      transform: Transform.JSON,
    },
  )

  if (chatbotConfig === undefined) {
    throw new Error('Chatbot config not found')
  }

  return {
    customerName: customerParameters.customerName,
    id: chatbotId,
    name: staticChatbotConfig.name,
    model: staticChatbotConfig.model,
    embeddingNames: chatbotConfig.embeddingNames,
    embeddingFilter: chatbotConfig.embeddingFilter,
    additionalContext: chatbotConfig.additionalContext,
    noMatchesMessage: chatbotConfig.noMatchesMessage,
  }
}

export async function getStaticChatbotConfig(
  domainName: string,
  chatbotId: string,
): Promise<ChatbotWithCustomerName> {
  const customerParameters = await getParameter<CustomerParameters>(
    `/${domainName}/private`,
    {
      transform: Transform.JSON,
    },
  )
  if (customerParameters === undefined) {
    throw new Error('Customer parameters not found')
  }
  const staticChatbotConfig = customerParameters.chatbots.find(
    (chatbot: Chatbot) => chatbot.id === chatbotId,
  )

  if (staticChatbotConfig === undefined) {
    throw new Error('Chatbot not found')
  }

  return {
    id: chatbotId,
    customerName: customerParameters.customerName,
    name: staticChatbotConfig.name,
    model: staticChatbotConfig.model,
  }
}

export async function getCustomerCreatedApiKey(
  domainName: string,
): Promise<string | undefined> {
  return await getParameter<string>(`/${domainName}/private/api-key`)
}

export async function getCustomerParameters(
  domainName: string,
): Promise<CustomerParameters> {
  const customerParameters = await getParameter<CustomerParameters>(
    `/${domainName}/private`,
    {
      transform: Transform.JSON,
    },
  )
  if (customerParameters === undefined) {
    throw new Error('Customer parameters not found')
  }
  return customerParameters
}

export async function getPublicParameters(domainName: string): Promise<Object> {
  const parameters = await getParameter<Object>(`/${domainName}/public`, {
    transform: Transform.JSON,
  })
  if (parameters === undefined) {
    throw new Error('Customer parameters not found')
  }
  return parameters
}
