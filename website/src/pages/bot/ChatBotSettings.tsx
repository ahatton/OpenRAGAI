import { PrivateConfigContext } from '../../store/PrivateConfigContextProvider'
import { useContext } from 'react'
import { Settings } from '../../components/chatbot/ChatBotSettings'

export function ChatBotSettings() {
  const privateConfigContext = useContext(PrivateConfigContext)

  return (
    <>{privateConfigContext.isAdministrator && <Settings></Settings>}</>
  )
}