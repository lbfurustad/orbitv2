interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-text-muted mb-3 opacity-40">{icon}</div>}
      <p className="text-text-secondary text-[13px] font-medium">{title}</p>
      {description && <p className="text-text-muted text-[12px] mt-1">{description}</p>}
    </div>
  )
}
