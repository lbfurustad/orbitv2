import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  count?: number
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function Card({ title, count, children, className = '', action }: CardProps) {
  return (
    <div className={`bg-surface rounded-lg border border-border overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 h-10 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[13px] font-medium text-text-primary">{title}</h3>
            {count !== undefined && (
              <span className="text-[11px] font-mono text-text-muted tabular-nums bg-wash/[0.04] px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="py-1">
        {children}
      </div>
    </div>
  )
}
