import { useParams } from 'react-router-dom'
import { useContext } from 'react'
import Chatbot, { createChatBotMessage } from 'react-chatbot-kit'
import 'react-chatbot-kit/build/main.css'
import MessageParser from '../../components/chatbot/MessageParser'
import ActionProvider from '../../components/chatbot/ActionProvider'
import RagAIAvatar from '../../components/chatbot/RagAIAvatar'
import { PrivateConfigContext } from '../../store/PrivateConfigContextProvider'
import { ChatBotSettings } from './ChatBotSettings'

interface ChatBotProps {
  // Define your props here. For example:
  admin?: boolean
}

interface Options {
  method: string
  headers: {
    'Content-Type': string
    Authorization: string
  }
  body?: string
}

export function ChatBot({ admin }: ChatBotProps) {
  const { id } = useParams()
  const configContext = useContext(PrivateConfigContext)
  const { chatbots } = configContext.chatBotsConfig
  const matchingChatBot = chatbots.find((chatbot) => chatbot.id === id)
  const modelName = matchingChatBot?.name
  const options = { loading: true, delay: 1000 }
  const config = {
    initialMessages: [createChatBotMessage(`Hi! Ask me a Question`, options)],
    botName: modelName,
    customComponents: {
      botAvatar: (props: any) => <RagAIAvatar {...props} />,
    },
  }
  if (admin) {
    return (
      <ChatBotSettings/>
    )
  } else {
    return (
      <Chatbot
        config={config}
        messageParser={MessageParser}
        actionProvider={ActionProvider}
      />
    )
  }
}
