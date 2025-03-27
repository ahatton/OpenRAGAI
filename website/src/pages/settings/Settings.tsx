import { PrivateConfigContext } from '../../store/PrivateConfigContextProvider'
import { useContext } from 'react'
import { FileUpload } from '../../components/upload/FileUpload'
import { DeleteEmbedding } from '../../components/embeddingDelete/DeleteEmbedding'

export function Settings() {
  const privateConfigContext = useContext(PrivateConfigContext)

  return (
    <>
      {privateConfigContext.isAdministrator && <FileUpload></FileUpload>}
      {privateConfigContext.isAdministrator && (
        <DeleteEmbedding></DeleteEmbedding>
      )}
    </>
  )
}
