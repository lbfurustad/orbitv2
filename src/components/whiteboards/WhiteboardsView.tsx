import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PencilCircle, Plus, Trash, Clock, Folder } from '@phosphor-icons/react'
import { api } from '../../lib/api'
import { useQuery } from '../../lib/hooks/useQuery'
import type { Whiteboard } from '../../lib/types'

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'na'
  if (diff < 3600) return `${Math.floor(diff / 60)} min siden`
  if (diff < 86400) return `${Math.floor(diff / 3600)}t siden`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'i gar'
  if (days < 7) return `${days} dager siden`
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

export function WhiteboardsView() {
  const navigate = useNavigate()
  const { data: whiteboards, loading, refetch } = useQuery<Whiteboard[]>(() => api.whiteboards())
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async () => {
    const name = newName.trim() || 'Nytt whiteboard'
    setCreating(false)
    setNewName('')
    const result = await api.createWhiteboard({ name })
    navigate(`/whiteboards/${result.id}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    await api.deleteWhiteboard(id)
    refetch()
  }

  return (
    <div className="max-w-[780px] mx-auto px-10 py-8">
      <PencilCircle size={28} weight="duotone" className="text-pink-400 mb-3" />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight uppercase">Whiteboards</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-accent hover:bg-accent/10 transition-colors"
        >
          <Plus size={14} /> Nytt whiteboard
        </button>
      </div>

      {creating && (
        <div className="flex items-center gap-2 mb-6 p-3 rounded-lg border border-border bg-surface">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
            placeholder="Navn pa whiteboard..."
            className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted/40 outline-none"
          />
          <button onClick={handleCreate} className="px-3 py-1 rounded-md text-[12px] text-white bg-accent hover:bg-accent-hover transition-colors">
            Opprett
          </button>
          <button onClick={() => { setCreating(false); setNewName('') }} className="text-[12px] text-text-muted hover:text-text-secondary">
            Avbryt
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-[13px] text-text-muted">Laster...</div>
      ) : !whiteboards || whiteboards.length === 0 ? (
        <div className="py-16 text-center">
          <PencilCircle size={40} className="text-text-muted/20 mx-auto mb-3" />
          <p className="text-[13px] text-text-muted mb-4">Ingen whiteboards enna</p>
          <button onClick={() => setCreating(true)} className="text-[13px] text-accent hover:text-accent-hover transition-colors">
            Opprett ditt forste whiteboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {whiteboards.map(wb => (
            <Link
              key={wb.id}
              to={`/whiteboards/${wb.id}`}
              className="group rounded-lg border border-border hover:border-border-hover bg-surface hover:bg-wash/[0.02] transition-all overflow-hidden"
            >
              <div className="h-[120px] bg-base flex items-center justify-center border-b border-border/50">
                {wb.thumbnail ? (
                  <img src={wb.thumbnail} alt="" className="w-full h-full object-contain p-2" />
                ) : (
                  <PencilCircle size={32} className="text-text-muted/15" />
                )}
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-medium text-text-secondary group-hover:text-text-primary transition-colors truncate">
                    {wb.name}
                  </h3>
                  <button
                    onClick={e => handleDelete(e, wb.id)}
                    className="p-0.5 rounded text-text-muted/0 group-hover:text-text-muted hover:!text-red-400 transition-colors shrink-0"
                  >
                    <Trash size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted/60">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {timeAgo(wb.updated_at)}
                  </span>
                  {wb.project_name && (
                    <span className="flex items-center gap-1 truncate">
                      <Folder size={10} /> {wb.project_name}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
