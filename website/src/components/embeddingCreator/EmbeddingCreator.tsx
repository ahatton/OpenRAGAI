import { Button, Grid, TextField, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { MuiFileInput } from 'mui-file-input'
import Close from '@mui/icons-material/Close'

export function EmbeddingCreator() {
  const [embeddings, setEmbeddings] = useState<Array<string>>([])
  const textFieldRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelected = (newValue: File | null) => {
    setSelectedFile(newValue)
  }

  const handleAdd = () => {
    if (textFieldRef.current !== null && textFieldRef.current.value !== '') {
      setEmbeddings((prevEmbeddings) => [
        ...prevEmbeddings,
        // @ts-ignore
        textFieldRef.current.value.replaceAll('\n', ' '),
      ])
      textFieldRef.current.value = ''
    }
  }

  const handleAddFile = () => {
    if (selectedFile !== null) {
      selectedFile.text().then((text) => {
        setEmbeddings((prevEmbeddings) => [
          ...prevEmbeddings,
          ...text.split('\n'),
        ])
      })

      setSelectedFile(null)
    }
  }

  const downloadTxtFile = () => {
    const element = document.createElement('a')
    const file = new Blob([embeddings.join('\n')], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = 'embeddings_file.txt'
    document.body.appendChild(element) // Required for this to work in FireFox
    element.click()
  }

  // @ts-ignore
  return (
    <>
      <Grid container>
        <Grid item sm={12} mb={2}>
          <Typography variant={'h6'}>Create an embedding file</Typography>
        </Grid>
        <Grid item sm={12} mb={2}>
          <Typography variant={'body1'}>
            To create an embedding file, paste your content for a single
            embedding into the input box below. You can add multiple embeddings
            by pasting in content and clicking the 'Add' button multiple times.
            Once you've finished adding all the content you need, click the
            'Download' button to get the file. This file will be correctly
            formatted and ready for uploading on the settings page. You can add
            content from an existing file by selecting a file and clicking the
            'Add File' button.
          </Typography>
        </Grid>
        <Grid item>
          <MuiFileInput
            clearIconButtonProps={{
              title: 'Remove',
              children: <Close fontSize="small" />,
            }}
            inputProps={{ accept: '.txt' }}
            label={'Add File'}
            placeholder={'Click to select a file'}
            value={selectedFile}
            onChange={handleFileSelected}
          />
        </Grid>
        <Button variant={'contained'} type={'button'} onClick={handleAddFile}>
          Add File
        </Button>
        <Grid item xs={12} mb={2} mt={2}>
          <TextField
            multiline={true}
            fullWidth={true}
            label={'Embedding to add'}
            inputRef={textFieldRef}
          />
        </Grid>
        <Grid item xs={5} sm={3} lg={1}>
          <Button
            variant="contained"
            color="primary"
            fullWidth={true}
            onClick={handleAdd}
          >
            Add Content
          </Button>
        </Grid>
        {embeddings.length > 0 && (
          <>
            <Grid item xs={5} sm={3} lg={1} ml={3}>
              <Button
                variant="contained"
                color="success"
                fullWidth={true}
                onClick={downloadTxtFile}
              >
                Download File
              </Button>
            </Grid>
            <Grid item xs={2} ml={2}>
              <Typography variant={'body1'}>
                {embeddings.length} line(s)
              </Typography>
            </Grid>
          </>
        )}
      </Grid>
    </>
  )
}
