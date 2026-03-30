import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { DailyData } from '../lib/types'

export function TodayView() {
  const [data, setData] = useState<DailyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.today().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-base">
        <p className="text-text-muted text-sm">Laster...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-text-primary mb-1">
          {data?.date ? formatDate(data.date) : 'I dag'}
        </h1>
        <p className="text-text-muted text-sm mb-8">{data?.date}</p>

        {/* Tasks */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
            Oppgaver
          </h2>
          {data?.tasks && data.tasks.length > 0 ? (
            <ul className="space-y-1">
              {data.tasks.map((task: any) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors"
                >
                  <span
                    className={`w-4 h-4 rounded border flex-shrink-0 ${
                      task.done
                        ? 'bg-accent/20 border-accent'
                        : 'border-border-hover'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      task.done
                        ? 'text-text-muted line-through'
                        : 'text-text-primary'
                    }`}
                  >
                    {task.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted text-sm">Ingen oppgaver for i dag</p>
          )}
        </section>

        {/* Calendar Events */}
        <section>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
            Kalender
          </h2>
          {data?.calendarEvents && data.calendarEvents.length > 0 ? (
            <ul className="space-y-1">
              {data.calendarEvents.map((evt: any) => (
                <li
                  key={evt.ical_uid}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors"
                >
                  <span className="text-xs text-text-muted w-14 flex-shrink-0">
                    {evt.is_all_day
                      ? 'Hele dagen'
                      : evt.start_time?.slice(11, 16)}
                  </span>
                  <span className="text-sm text-text-primary">
                    {evt.subject}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted text-sm">Ingen hendelser i dag</p>
          )}
        </section>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
