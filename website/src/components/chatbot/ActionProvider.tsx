import React, {
  ReactElement,
  ReactNode,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { fetchAuthSession } from 'aws-amplify/auth'
import Loader from './Loader'

type ActionProviderProps = {
  createChatBotMessage: (message: any) => any
  setState: Dispatch<SetStateAction<any>>
  children: ReactNode
  state: any
}

interface Options {
  method: string
  headers: {
    'Content-Type': string
    Authorization: string
  }
  body: string
}

const fetchMessage = async (
  message: string,
  options: Options
): Promise<string> => {
  try {
    const res = await fetch('/api/member/chat', options)
    const response = await res.json()
    return response.message
  } catch (error) {
    console.error('Error:', error)
    return 'Sorry, please try again later'
  }
}

const ActionProvider = ({
  createChatBotMessage,
  setState,
  children,
  state,
}: ActionProviderProps): ReactElement => {
  const { id } = useParams()
  const [messages, setMessages] = useState(id)
  useEffect(() => {
    setMessages(state)
    setState((prev: { messages: any }) => ({
      ...prev,
      messages: [createChatBotMessage(`Hi! Ask me a Question`)],
    }))
  }, [id])

  const handleMessage = async (message: string) => {
    setState((prev: { messages: any }) => ({
      ...prev,
      messages: [...prev.messages, createChatBotMessage(Loader())],
    }))
    const authSession = await fetchAuthSession()

    const options: Options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // @ts-ignore
        Authorization: authSession.tokens.idToken.toString(),
      },
      body: JSON.stringify({ id: id, message: message }),
    }

    const ai_response = await fetchMessage(message, options)

    setState((prev: { messages: any }) => ({
      ...prev,
      messages: [
        ...prev.messages.slice(0, -1),
        createChatBotMessage(ai_response),
      ],
    }))
  }

  return (
    <div>
      {React.Children.map(children, (child: ReactNode) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as ReactElement, {
            actions: {
              handleMessage,
            },
          })
        }
        return child
      })}
    </div>
  )
}

export default ActionProvider
