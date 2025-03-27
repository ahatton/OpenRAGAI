import { useState } from 'react'
import { MuiFileInput } from 'mui-file-input'
import Close from '@mui/icons-material/Close'
import { Button, Grid, Typography } from '@mui/material'
import { fetchAuthSession } from 'aws-amplify/auth'
import { useDispatch } from 'react-redux'
import {
  addAndRemoveErrorAlert,
  addAndRemoveSuccessAlert,
} from '../../store/alertSlice'

export function FileUpload() {
  const dispatch = useDispatch()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelected = (newValue: File | null) => {
    setSelectedFile(newValue)
  }

  const handleUpload = async () => {
    if (selectedFile !== null) {
      if (selectedFile.type !== 'text/plain') {
        addAndRemoveErrorAlert('File must be a .txt file')(dispatch)
        return
      }
      const authSession = await fetchAuthSession()
      const presignedResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          Authorization: authSession.tokens.idToken.toString(),
        },
        body: JSON.stringify({
          filename: selectedFile.name,
        }),
      })
      if (presignedResponse.status !== 200) {
        addAndRemoveErrorAlert('Error uploading file')
        return
      }
      const { uploadURL } = await presignedResponse.json()
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: selectedFile,
      })
      if (uploadResponse.status !== 200) {
        addAndRemoveErrorAlert('Error uploading file')(dispatch)
        return
      } else {
        addAndRemoveSuccessAlert('File uploaded successfully')(dispatch)
      }
    } else {
      addAndRemoveErrorAlert('No file selected')(dispatch)
    }
  }

  return (
    <>
      <Grid container>
        <Grid item sm={12} mb={2}>
          <Typography variant={'h6'}>Upload an embedding file</Typography>
        </Grid>
        <Grid item>
          <MuiFileInput
            clearIconButtonProps={{
              title: 'Remove',
              children: <Close fontSize="small" />,
            }}
            inputProps={{ accept: '.txt' }}
            label={'File to upload'}
            placeholder={'Click to select a file'}
            value={selectedFile}
            onChange={handleFileSelected}
          />
        </Grid>
        <Button variant={'contained'} type={'button'} onClick={handleUpload}>
          Upload
        </Button>
      </Grid>
    </>
  )
}
