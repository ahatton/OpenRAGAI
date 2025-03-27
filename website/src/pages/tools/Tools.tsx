import { useContext } from 'react'
import { PrivateConfigContext } from '../../store/PrivateConfigContextProvider'
import { EmbeddingCreator } from '../../components/embeddingCreator/EmbeddingCreator'

export function Tools() {
  const privateConfigContext = useContext(PrivateConfigContext)

  return (
    <>
      {privateConfigContext.isAdministrator && (
        <EmbeddingCreator></EmbeddingCreator>
      )}
    </>
  )
}
