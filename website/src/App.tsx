import React, { useContext, useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUser } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { Home } from './pages/home/Home'
import { ChatBot } from './pages/bot/ChatBot'
import { PublicConfigContext } from './store/PublicConfigContextProvider'
import { Layout } from './components/ui/Layout'
import './App.css'
import { PrivateConfigContext } from './store/PrivateConfigContextProvider'
import { ChatbotConfigContextProvider } from './store/ChatbotConfigContextProvider'
import { Settings } from './pages/settings/Settings'
import { Tools } from './pages/tools/Tools'
import {Usage} from "./pages/usage/Usage";

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const publicConfigContext = useContext(PublicConfigContext)
  const privateConfigContext = useContext(PrivateConfigContext)

  useEffect(() => {
    Hub.listen('auth', (data) => {
      const { payload } = data
      if (payload.event === 'signedOut') {
        navigate('/')
      } else if (payload.event === 'signedIn') {
        navigate('/home')
        privateConfigContext.setIsLoggedIn(true)
      }
    })
  }, [])

  useEffect(() => {
    if (publicConfigContext.hasLoaded) {
      Amplify.configure({
        Auth: {
          Cognito: {
            ...{
              userPoolId: publicConfigContext.cognitoConfig.userPoolId,
              userPoolClientId:
                publicConfigContext.cognitoConfig.userPoolClientId,
            },
          },
        },
      })
      getCurrentUser()
        .then(() => {
          navigate(location.pathname === '/' ? '/home' : location.pathname)
          privateConfigContext.setIsLoggedIn(true)
        })
        .catch(() => {
          navigate('/')
        })
    }
  }, [publicConfigContext, publicConfigContext.hasLoaded])

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<Authenticator hideSignUp={true} loginMechanism={'email'} />}
        />
        <Route
          path="/home"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/chatbot/:id"
          element={
            <Layout>
              <ChatBot />
            </Layout>
          }
        />
        <Route
          path="/settings"
          element={
            <Layout>
              <Settings />
            </Layout>
          }
        />
        {privateConfigContext.isAdministrator && (
          <>
            <Route
              path="/chatbot/:id/settings"
              element={
                <Layout>
                  <ChatbotConfigContextProvider>
                    <ChatBot admin={true} />
                  </ChatbotConfigContextProvider>
                </Layout>
              }
            />
            <Route
              path="/tools"
              element={
                <Layout>
                  <Tools />
                </Layout>
              }
            /><Route
            path="/usage"
            element={
              <Layout>
                <Usage />
              </Layout>
            }
          />

          </>
        )}
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </>
  )
}
