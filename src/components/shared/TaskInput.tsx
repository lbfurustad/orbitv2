import { useRef } from 'react'

interface TaskInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  placeholder?: string
}

export function TaskInput({ value, onChange, onSubmit, onCancel, placeholder }: TaskInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder={placeholder || 'Ny task...'}
        className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none py-[7px]"
      />
    </div>
  )
}
