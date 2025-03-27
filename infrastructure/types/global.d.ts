import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";

export type EmbeddingFilter = {
  closestMatches?: number
  probability?: number
}

export type Chatbot = {
  id?: string
  model: string
  name: string
  embeddingNames?: string[]
  embeddingFilter?: EmbeddingFilter
  additionalContext?: string
  noMatchesMessage?: string
}

export type Customer = {
  name: string
  domain: string
  monthlyTokenLimit: number
  chatbots: Chatbot[]
}

export type ChatbotWithId = Chatbot & {
  id: string
}
export type CustomerParameters = {
  monthlyTokenLimit: number
  customerName: string
  chatbots: ChatbotWithId[]
}

export type SimilarityResults = Array<{
  text: string
  similarity: number
}>

export type CustomerDefinedChatbotConfig = {
  embeddingFilter?: EmbeddingFilter
  additionalContext?: string
  embeddingNames?: string[]
  noMatchesMessage?: string
}

export type ChatbotWithCustomerName = Chatbot & {
  customerName: string
}

export type StaticLambdaResources = {
  openAIRequestLambda: NodejsFunction
  adminSimilaritySearcherLambda: NodejsFunction
  customerConfigRetrieverLambda: NodejsFunction
  adminChatbotConfigRetrieverLambda: NodejsFunction
  adminSetChatbotConfigLambda: NodejsFunction
  adminCreatePresignedUrlLambda: NodejsFunction
  createEmbeddingsLambda: NodejsFunction
  adminGetUsageLambda: NodejsFunction
  adminDeleteEmbeddingsLambda: NodejsFunction
}

export type Embedding = {
  text: string
  vector?: Array<number>
}