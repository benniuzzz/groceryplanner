import { useEffect, useRef, useState } from 'react'
import { inputCls } from './ui'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = ['00', '15', '30', '45']

interface TimeParts {
  hour: string
  minute: string
  period: string
}

function parse(value: string | null): TimeParts {
  if (!value) return { hour: '', minute: '', period: '' }
  const [hStr, mStr] = value.split(':')
  const h24 = Number(hStr)
  if (!Number.isFinite(h24)) return { hour: '', minute: '', period: '' }
  return {
    hour: String(h24 % 12 || 12),
    minute: mStr && MINUTES.includes(mStr) ? mStr : '',
    period: h24 >= 12 ? 'PM' : 'AM',
  }
}

function compose({ hour, minute, period }: TimeParts): string | null {
  if (!hour || !minute || !period) return null
  let h = Number(hour) % 12
  if (period === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${minute}`
}

export function TimePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [draft, setDraft] = useState<TimeParts>(() => parse(value))
  const lastEmitted = useRef<string | null>(value)

  useEffect(() => {
    if ((value ?? null) !== lastEmitted.current) {
      setDraft(parse(value))
      lastEmitted.current = value ?? null
    }
  }, [value])

  const selectCls = `${inputCls} px-1.5 py-1 text-xs`

  const set = (next: Partial<TimeParts>) => {
    const merged = { ...draft, ...next }
    const composed = compose(merged)
    setDraft(merged)
    lastEmitted.current = composed
    onChange(composed)
  }

  return (
    <span className="inline-flex items-center gap-1">
      <select
        aria-label="Hour"
        title="Hour"
        className={`${selectCls} w-14`}
        value={draft.hour}
        onChange={(e) => set({ hour: e.target.value })}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={String(h)}>
            {h}
          </option>
        ))}
      </select>
      <select
        aria-label="Minute"
        title="Minute"
        className={selectCls}
        value={draft.minute}
        onChange={(e) => set({ minute: e.target.value })}
      >
        <option value="">--</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="AM or PM"
        title="AM or PM"
        className={selectCls}
        value={draft.period}
        onChange={(e) => set({ period: e.target.value })}
      >
        <option value="">--</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </span>
  )
}
