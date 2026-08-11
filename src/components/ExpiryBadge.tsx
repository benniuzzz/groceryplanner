import { daysUntil, formatDate } from '../lib/dates'

export function ExpiryBadge({
  date,
  compact = false,
}: {
  date: string | null
  compact?: boolean
}) {
  if (!date) {
    return <span className="text-xs text-slate-400">&mdash;</span>
  }
  const days = daysUntil(date)
  let cls = 'bg-emerald-100 text-emerald-800'
  let label = formatDate(date)
  if (days < 0) {
    cls = 'bg-red-100 text-red-800'
    label = compact ? 'Expired' : `Expired ${formatDate(date)}`
  } else if (days === 0) {
    cls = 'bg-red-100 text-red-800'
    label = 'Expires today'
  } else if (days <= 3) {
    cls = 'bg-amber-100 text-amber-800'
    label = compact ? `${days}d left` : `${days}d left (${formatDate(date)})`
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}
