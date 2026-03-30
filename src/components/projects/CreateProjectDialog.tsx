import { useState, useEffect, useRef } from 'react'
import { X, Circle } from '@phosphor-icons/react'
import { api } from '../../lib/api'

interface CreateProjectDialogProps {
  onClose: () => void
  onCreated: () => void
}

const STATUS_OPTIONS = [
  { id: 'active', label: 'Active' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'someday', label: 'Someday' },
]

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1', color: 'text-danger' },
  { value: 2, label: 'P2', color: 'text-warning' },
  { value: 3, label: 'P3', color: 'text-accent' },
]

export function CreateProjectDialog({ onClose, onCreated }: CreateProjectDialogProps) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'work' | 'personal'>('work')
  const [status, setStatus] = useState('active')
  const [priority, setPriority] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // Global escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await api.createProject({
        name: name.trim(),
        scope,
        status,
        priority: priority ?? undefined,
        description: description.trim() || undefined,
      })
      onCreated()
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-[420px] max-w-[90vw] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-semibold text-text-primary">Nytt prosjekt</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-wash/[0.04] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-5">
          <label className="text-[12px] text-text-muted block mb-1.5">Navn</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Prosjektnavn..."
            className="bg-transparent border-b border-border focus:border-accent text-[14px] text-text-primary py-2 w-full placeholder:text-text-muted/40 transition-colors"
          />
        </div>

        {/* Scope */}
        <div className="mb-5">
          <label className="text-[12px] text-text-muted block mb-1.5">Scope</label>
          <div className="flex gap-2">
            <button
              onClick={() => setScope('work')}
              className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                scope === 'work'
                  ? 'bg-red-400/10 text-red-400 border-red-400/20'
                  : 'border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
              }`}
            >
              Jobb
            </button>
            <button
              onClick={() => setScope('personal')}
              className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                scope === 'personal'
                  ? 'bg-purple-400/10 text-purple-400 border-purple-400/20'
                  : 'border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
              }`}
            >
              Privat
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="mb-5">
          <label className="text-[12px] text-text-muted block mb-1.5">Status</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                  status === s.id
                    ? 'bg-accent/10 text-accent border-accent/20'
                    : 'border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="mb-5">
          <label className="text-[12px] text-text-muted block mb-1.5">Prioritet (valgfritt)</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => setPriority(priority === p.value ? null : p.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                  priority === p.value
                    ? `${p.color} border-current/20 bg-current/10`
                    : 'border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
                }`}
              >
                <Circle size={10} weight={priority === p.value ? 'fill' : 'bold'} className={priority === p.value ? p.color : ''} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="text-[12px] text-text-muted block mb-1.5">Beskrivelse (valgfritt)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Kort beskrivelse..."
            className="w-full bg-transparent border-b border-border focus:border-accent text-[13px] text-text-secondary focus:text-text-primary resize-none py-2 min-h-[60px] placeholder:text-text-muted/40 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] text-text-muted hover:text-text-secondary transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Oppretter...' : 'Opprett prosjekt'}
          </button>
        </div>
      </div>
    </div>
  )
}
