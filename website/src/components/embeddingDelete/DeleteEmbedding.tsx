import { Box, Button, Grid, Typography } from '@mui/material'
import { useContext, useEffect, useState } from 'react'
import {
  addAndRemoveErrorAlert,
  addAndRemoveSuccessAlert,
} from '../../store/alertSlice'
import { useDispatch } from 'react-redux'
import { fetchAuthSession } from 'aws-amplify/auth'
import { PrivateConfigContext } from '../../store/PrivateConfigContextProvider'

export function DeleteEmbedding() {
  const dispatch = useDispatch()
  const privateContext = useContext(PrivateConfigContext)
  const [allEmbeddings, setAllEmbeddings] = useState([])

  useEffect(() => {
    fetchAuthSession().then((authSession) => {
      const getOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          Authorization: authSession.tokens.idToken.toString(),
        },
      }
      try {
        fetch(
          `/api/admin/chatbot/${privateContext.chatBotsConfig.chatbots[0].id}/config`,
          getOptions,
        )
          .then((res) => res.json())
          .then((response) => {
            setAllEmbeddings(response.allEmbeddingNames)
          })
      } catch (error) {
        const message = 'Unknown error'
        addAndRemoveErrorAlert(message)(dispatch)
      }
    })
  }, [dispatch, privateContext.chatBotsConfig.chatbots])

  const handleDelete = (embeddingName: string) => {
    fetchAuthSession().then((authSession) => {
      const deleteOptions = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          Authorization: authSession.tokens.idToken.toString(),
        },
        body: JSON.stringify({
          embeddingName,
        }),
      }
      try {
        fetch(`/api/admin/embedding`, deleteOptions).then((r) => {
          if (r.ok) {
            setAllEmbeddings((prevEmbeddings) =>
              prevEmbeddings.filter((name) => name !== embeddingName),
            )
            addAndRemoveSuccessAlert('Embedding deleted')(dispatch)
          } else {
            const message = 'Embedding failed to delete'
            addAndRemoveErrorAlert(message)(dispatch)
          }
        })
      } catch (error) {
        const message = 'Embedding failed to delete'
        addAndRemoveErrorAlert(message)(dispatch)
      }
    })
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} mb={2}>
          <Typography variant="h6">Delete an embedding</Typography>
          <Typography variant="body1">
            You can delete an embedding by clicking delete.
          </Typography>
          <Typography variant="body1">
            WARNING once you delete it you cannot get it back. Make sure you
            have your original file or you no longer require this embedding.
          </Typography>
        </Grid>
        {allEmbeddings.map((embeddingName) => (
          <Grid item xs={12} key={embeddingName}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              border={1}
              borderRadius={4}
              p={2}
              mb={2}
              maxWidth={600}
              borderColor={'red'}
            >
              <Typography variant="body1" mr={2}>
                {embeddingName}
              </Typography>
              <Button
                variant="contained"
                type="button"
                color="error"
                onClick={() => handleDelete(embeddingName)}
              >
                Delete
              </Button>
            </Box>
          </Grid>
        ))}
      </Grid>
    </>
  )
}
