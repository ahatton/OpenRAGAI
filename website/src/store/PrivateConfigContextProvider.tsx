import { createContext, useEffect, useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

export type ChatBotConfig = {
  chatbots: {
    id: string
    name: string
  }[]
}

export type PrivateCustomerConfig = ChatBotConfig & {
  isLoggedIn: boolean
  isAdministrator: boolean
  setIsLoggedIn: (isLoggedIn: boolean) => void
}

export const PrivateConfigContext = createContext({
  chatBotsConfig: {
    chatbots: [],
  } as ChatBotConfig,
  isLoggedIn: false,
  isAdministrator: false,
  setIsLoggedIn: (isLoggedIn: boolean) => {},
})

export function PrivateConfigContextProvider(props: { children: any }) {
  const [chatBotsConfig, setChatBotsConfig] = useState<ChatBotConfig>({
    chatbots: [],
  })

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [isAdministrator, setIsAdministrator] = useState<boolean>(false)

  const context = {
    chatBotsConfig: chatBotsConfig,
    isLoggedIn: isLoggedIn,
    setIsLoggedIn: setIsLoggedIn,
    isAdministrator: isAdministrator,
  }

  useEffect(() => {
    fetchAuthSession().then((authSession) => {
      if (authSession && authSession.tokens && authSession.tokens.idToken) {
        if (
          (
            authSession.tokens.idToken.payload[
              'cognito:groups'
            ] as Array<string>
          ).includes('administrators')
        ) {
          setIsAdministrator(true)
        }
        fetch(`/api/member/config`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authSession.tokens.idToken.toString(),
          },
        }).then(async (response) => {
          const customerConfig = JSON.parse(await response.text()) as {
            message: PrivateCustomerConfig
          }
          setChatBotsConfig({ chatbots: customerConfig.message.chatbots })
        })
      }
    })
  }, [isLoggedIn])

  return (
    <PrivateConfigContext.Provider value={context}>
      {props.children}
    </PrivateConfigContext.Provider>
  )
}
