import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { api } from '../../lib/api'
import type { Whiteboard } from '../../lib/types'

export function WhiteboardEditor() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [wb, setWb] = useState<Whiteboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const excalidrawRef = useRef<any>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDataRef = useRef<any>(null)

  useEffect(() => {
    if (!id) return
    api.whiteboard(id).then(data => {
      setWb(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      if (!pendingDataRef.current || !id) return
      setSaving(true)
      try {
        let thumbnail: string | undefined
        const excalidrawApi = excalidrawRef.current
        if (excalidrawApi) {
          try {
            const blob = await exportToBlob({
              elements: excalidrawApi.getSceneElements(),
              appState: { ...excalidrawApi.getAppState(), exportWithDarkMode: true },
              files: excalidrawApi.getFiles(),
              getDimensions: () => ({ width: 320, height: 180, scale: 1 }),
            })
            thumbnail = await blobToDataUrl(blob)
          } catch {}
        }
        await api.saveWhiteboard(id, pendingDataRef.current, thumbnail)
        setLastSaved(new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      } catch {}
      setSaving(false)
    }, 2000)
  }, [id])

  const handleChange = useCallback((elements: any[], appState: any, files: any) => {
    pendingDataRef.current = {
      type: 'excalidraw',
      version: 2,
      source: 'orbit',
      elements,
      appState: { viewBackgroundColor: appState.viewBackgroundColor },
      files,
    }
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (pendingDataRef.current && id) {
        api.saveWhiteboard(id, pendingDataRef.current).catch(() => {})
      }
    }
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-dvh text-text-muted text-[13px]">Laster whiteboard...</div>
  if (!wb) return <div className="flex items-center justify-center h-dvh text-text-muted text-[13px]">Whiteboard ikke funnet</div>

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-sidebar shrink-0 z-10">
        <button onClick={() => navigate('/whiteboards')} className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors">
          <ArrowLeft size={16} />
        </button>
        <span className="text-[14px] font-medium text-text-primary truncate flex-1">{wb.name}</span>
        <div className="flex items-center gap-2 text-[11px] text-text-muted/50">
          {saving && (
            <span className="flex items-center gap-1">
              <FloppyDisk size={12} className="animate-pulse" /> Lagrer...
            </span>
          )}
          {!saving && lastSaved && (
            <span>Lagret {lastSaved}</span>
          )}
        </div>
      </div>

      <div className="flex-1 relative excalidraw-container">
        <Excalidraw
          excalidrawAPI={(api: any) => {
            excalidrawRef.current = api
          }}
          initialData={{
            elements: wb.data?.elements || [],
            appState: {
              ...wb.data?.appState,
              theme: 'dark',
            },
            files: wb.data?.files,
          }}
          onChange={handleChange}
          theme="dark"
        />
      </div>
    </div>
  )
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
