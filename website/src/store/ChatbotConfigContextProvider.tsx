import { createContext, useState } from 'react'

type ChatbotConfigContextTypes = {
  closestMatches: number | null
  probability: number | null
  additionalContext: string | null
  setClosestMatches: (closestMatches: number | null) => void
  setProbability: (probability: number | null) => void
  hasEmbeddings: boolean
  setHasEmbeddings: (hasEmbeddings: boolean) => void
  setAdditionalContext: (additionalContext: string | null) => void
  embeddingNames: string[] | null
  setEmbeddingNames: (embeddingNames: string[] | null) => void
  noMatchesMessage: string | null
  setNoMatchesMessage: (noMatchesMessage: string | null) => void
}

export const ChatbotConfigContext = createContext<ChatbotConfigContextTypes>({
  closestMatches: null,
  probability: null,
  additionalContext: null,
  setClosestMatches: (closestMatches: number | null) => {},
  setProbability: (probability: number | null) => {},
  hasEmbeddings: false,
  setHasEmbeddings: (hasEmbeddings: boolean) => {},
  setAdditionalContext: (additionalContext: string | null) => {},
  embeddingNames: null,
  setEmbeddingNames: (embeddingNames: string[] | null) => {},
  setNoMatchesMessage: (noMatchesMessage: string | null) => {},
  noMatchesMessage: null,
})

export function ChatbotConfigContextProvider(props: { children: any }) {
  const [closestMatches, setClosestMatches] = useState<number | null>(null)
  const [probability, setProbability] = useState<number | null>(null)
  const [hasEmbeddings, setHasEmbeddings] = useState<boolean>(false)
  const [noMatchesMessage, setNoMatchesMessage] = useState<string | null>(null)

  const [additionalContext, setAdditionalContext] = useState<string | null>(
    null
  )
  const [embeddingNames, setEmbeddingNames] = useState<string[] | null>(null)

  const setClosestMatchesHandler = (closestMatches: number | null) => {
    setClosestMatches(closestMatches)
  }

  const setProbabilityHandler = (probability: number | null) => {
    setProbability(probability)
  }

  const setHasEmbeddingsHandler = (hasEmbeddings: boolean) => {
    setHasEmbeddings(hasEmbeddings)
  }

  const setAdditionalContextHandler = (additionalContext: string | null) => {
    setAdditionalContext(additionalContext)
  }

  const setEmbeddingNamesHandler = (embeddingNames: string[] | null) => {
    setEmbeddingNames(embeddingNames)
  }

  const setNoMatchesMessageHandler = (noMatchesMessage: string | null) => {
    setNoMatchesMessage(noMatchesMessage)
  }

  const context = {
    closestMatches: closestMatches,
    setClosestMatches: setClosestMatchesHandler,
    probability: probability,
    setProbability: setProbabilityHandler,
    hasEmbeddings: hasEmbeddings,
    setHasEmbeddings: setHasEmbeddingsHandler,
    additionalContext: additionalContext,
    setAdditionalContext: setAdditionalContextHandler,
    embeddingNames: embeddingNames,
    setEmbeddingNames: setEmbeddingNamesHandler,
    noMatchesMessage: noMatchesMessage,
    setNoMatchesMessage: setNoMatchesMessageHandler,
  }

  return (
    <ChatbotConfigContext.Provider value={context}>
      {props.children}
    </ChatbotConfigContext.Provider>
  )
}
