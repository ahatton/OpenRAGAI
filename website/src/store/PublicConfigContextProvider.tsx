import { createContext, useEffect, useState } from 'react'

export type CognitoConfig = {
  userPoolId: string
  userPoolClientId: string
}

export type PublicCustomerConfig = CognitoConfig & {
  hasLoaded: boolean
}

export const PublicConfigContext = createContext({
  cognitoConfig: {
    userPoolId: '',
    userPoolClientId: '',
  } as CognitoConfig,
  hasLoaded: false,
})

export function PublicConfigContextProvider(props: { children: any }) {
  const [cognitoConfig, setCognitoConfig] = useState<CognitoConfig>({
    userPoolId: '',
    userPoolClientId: '',
  })

  const [hasLoaded, setHasLoaded] = useState<boolean>(false)

  const context = {
    cognitoConfig: cognitoConfig,
    hasLoaded: hasLoaded,
  }

  useEffect(() => {
    fetch(`/${window.location.hostname}.content/config.json`).then(
      async (response) => {
        const customerConfig = JSON.parse(
          await response.text(),
        ) as PublicCustomerConfig
        setCognitoConfig({
          userPoolId: customerConfig.userPoolId,
          userPoolClientId: customerConfig.userPoolClientId,
        })
        setHasLoaded(true)
      },
    )
  }, [])

  return (
    <PublicConfigContext.Provider value={context}>
      {props.children}
    </PublicConfigContext.Provider>
  )
}
