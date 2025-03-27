import { useParams } from 'react-router-dom'
import { SyntheticEvent, useContext, useEffect, useState } from 'react'
import Chatbot, { createChatBotMessage } from 'react-chatbot-kit'
import 'react-chatbot-kit/build/main.css'
import MessageParser from './MessageParser'
import AdminActionProvider from './AdminActionProvider'
import RagAIAvatar from './RagAIAvatar'
import { PrivateConfigContext } from '../../store/PrivateConfigContextProvider'
import {
  Autocomplete,
  Box,
  Button,
  FormHelperText,
  Input,
  InputLabel,
  TextField,
  Typography,
} from '@mui/material'
import { ChatbotConfigContext } from '../../store/ChatbotConfigContextProvider'
import { fetchAuthSession } from 'aws-amplify/auth'
import {
  addAndRemoveErrorAlert,
  addAndRemoveSuccessAlert,
} from '../../store/alertSlice'
import { useDispatch } from 'react-redux'

interface Options {
  method: string
  headers: {
    'Content-Type': string
    Authorization: string
  }
  body?: string
}

interface Embeddings {
  name: string
  label: string
}

export function Settings() {
  const [loading, setLoading] = useState(true)
  const [allEmbeddings, setAllEmbeddings] = useState([])
  const { id } = useParams()
  const configContext = useContext(PrivateConfigContext)
  const chatbotConfig = useContext(ChatbotConfigContext)
  const dispatch = useDispatch()
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

  function handleSubmit(event: any) {
    event.preventDefault()
    const postBody = {
      probability: chatbotConfig.probability ? chatbotConfig.probability : null,
      closestMatches: chatbotConfig.closestMatches
        ? chatbotConfig.closestMatches
        : null,
      additionalContext: chatbotConfig.additionalContext
        ? chatbotConfig.additionalContext
        : null,
      embeddingNames: chatbotConfig.embeddingNames
        ? chatbotConfig.embeddingNames
        : null,
      noMatchesMessage:
        chatbotConfig.noMatchesMessage && chatbotConfig.probability
          ? chatbotConfig.noMatchesMessage
          : null,
    }
    fetchAuthSession().then((authSession) => {
      const postOptions: Options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          Authorization: authSession.tokens.idToken.toString(),
        },
        body: JSON.stringify(postBody),
      }
      try {
        fetch(`/api/admin/chatbot/${id}/config`, postOptions)
          .then((res) => res.json())
          .then((response) => {
            const message = 'Chatbot Configuration Saved'
            addAndRemoveSuccessAlert(message)(dispatch)
          })
      } catch (error) {
        const message = 'Error saving chatbot configuration'
        addAndRemoveErrorAlert(message)(dispatch)
      }
    })
  }

  useEffect(() => {
    fetchAuthSession().then((authSession) => {
      const getOptions: Options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          Authorization: authSession.tokens.idToken.toString(),
        },
      }
      try {
        setLoading(true)
        fetch(`/api/admin/chatbot/${id}/config`, getOptions)
          .then((res) => res.json())
          .then((response) => {
            setAllEmbeddings(response.allEmbeddingNames)
            chatbotConfig.setProbability(response.embeddingFilter?.probability)
            chatbotConfig.setClosestMatches(
              response.embeddingFilter?.closestMatches,
            )
            chatbotConfig.setHasEmbeddings(response.hasEmbeddings)
            chatbotConfig.setAdditionalContext(response.additionalContext)
            chatbotConfig.setEmbeddingNames(response.embeddingNames)
            chatbotConfig.setNoMatchesMessage(response.noMatchesMessage)
          })
          .then(() => {
            setLoading(false)
          })
      } catch (error) {
        console.error('Error:', error)
      }
    })
  }, [id])

  if (loading) {
    return <div>loading...</div>
  }
  return (
    <>
      <Box>
        <Typography variant={'h3'} mb={2}>
          {modelName} Configuration
        </Typography>
      </Box>
      <Box mb={3}>
        <form onSubmit={handleSubmit}>
          <FormHelperText>
            Changes can be tested using the chatbot below, before saving. This
            will return examples of results that will become contextually
            relevant to the question asked. Once you have found a suitable
            configuration, click save.
          </FormHelperText>
          <Box mt={2}>
            <Autocomplete
              multiple
              id="country-select-demo"
              sx={{ width: 300 }}
              options={allEmbeddings}
              // @ts-ignore
              value={
                chatbotConfig.embeddingNames ? chatbotConfig.embeddingNames : []
              }
              onChange={(input: SyntheticEvent, value: string[]) => {
                if (value.length > 0) {
                  chatbotConfig.setEmbeddingNames(value)
                } else {
                  chatbotConfig.setEmbeddingNames(null)
                  chatbotConfig.setProbability(null)
                  chatbotConfig.setClosestMatches(null)
                }
              }}
              autoHighlight
              getOptionLabel={(option) => option}
              renderOption={(props, option) => (
                <Box
                  component="li"
                  sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
                  {...props}
                >
                  {option}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Choose your embeddings"
                  inputProps={{
                    ...params.inputProps,
                    autoComplete: 'new-password', // disable autocomplete and autofill
                  }}
                />
              )}
            />
          </Box>
          {chatbotConfig?.embeddingNames &&
            chatbotConfig.embeddingNames.length > 0 && (
              <>
                <Box mt={2}>
                  <InputLabel>
                    Probability:{' '}
                    <Input
                      inputMode={'decimal'}
                      placeholder={'Probability'}
                      defaultValue={chatbotConfig.probability}
                      onChange={(input) => {
                        const value = parseFloat(input.target.value)
                        if (!isNaN(value)) {
                          chatbotConfig.setProbability(value)
                        } else {
                          chatbotConfig.setProbability(null)
                        }
                      }}
                    />
                  </InputLabel>
                </Box>

                <Box mt={2}>
                  <InputLabel>
                    Closest Matches:{' '}
                    <Input
                      inputMode={'numeric'}
                      placeholder={'Closest Matches'}
                      defaultValue={chatbotConfig.closestMatches}
                      onChange={(input) => {
                        const value = parseInt(input.target.value)
                        if (!isNaN(value)) {
                          chatbotConfig.setClosestMatches(value)
                        } else {
                          chatbotConfig.setClosestMatches(null)
                        }
                      }}
                    />
                  </InputLabel>
                </Box>
                {chatbotConfig.probability ? (
                  <Box mt={2}>
                    <InputLabel>
                      No matches message:{' '}
                      <TextField
                        defaultValue={chatbotConfig.noMatchesMessage}
                        minRows={2}
                        sx={{ minWidth: '60%' }}
                        variant={'outlined'}
                        multiline={true}
                        placeholder={'Message when no matches found'}
                        onChange={(input) => {
                          const value = input.target.value
                          if (value.length > 0) {
                            chatbotConfig.setNoMatchesMessage(value)
                          } else {
                            chatbotConfig.setNoMatchesMessage(null)
                          }
                        }}
                      />
                    </InputLabel>
                  </Box>
                ) : (
                  <></>
                )}
              </>
            )}

          <Box mt={2}>
            <InputLabel>
              Context:{' '}
              <TextField
                defaultValue={chatbotConfig.additionalContext}
                minRows={2}
                sx={{ minWidth: '75%' }}
                variant={'outlined'}
                multiline={true}
                placeholder={'Additional Context'}
                onChange={(input) => {
                  const value = input.target.value
                  if (value.length > 0) {
                    chatbotConfig.setAdditionalContext(value)
                  } else {
                    chatbotConfig.setAdditionalContext(null)
                  }
                }}
              />
            </InputLabel>
          </Box>
          <Box mt={2}>
            <Button variant={'contained'} type={'submit'}>
              Save
            </Button>
          </Box>
        </form>
        {chatbotConfig?.embeddingNames &&
          chatbotConfig.embeddingNames.length > 0 && (
            <>
              <Box mt={5}>
                <Chatbot
                  config={config}
                  messageParser={MessageParser}
                  actionProvider={AdminActionProvider}
                />
              </Box>
            </>
          )}
      </Box>
    </>
  )
}
