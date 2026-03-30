import { useState, useCallback } from 'react'
import { useQuery } from './useQuery'
import { api } from '../api'
import type { Document } from '../types'

export function useDocument(documentId: string) {
  const { data: document, loading, error, refetch } = useQuery<Document>(
    () => api.document(documentId),
    [documentId]
  )
  const [saving, setSaving] = useState(false)

  const saveContent = useCallback(async (content: string) => {
    setSaving(true)
    try {
      await api.updateDocument(documentId, { content })
      await refetch()
    } finally {
      setSaving(false)
    }
  }, [documentId, refetch])

  return { document, loading, error, saving, saveContent }
}
