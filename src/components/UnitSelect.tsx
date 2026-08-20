import { useAppData } from '../hooks/useAppData'
import { inputCls } from './ui'

export function UnitSelect({
  value,
  onChange,
  className,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  ariaLabel?: string
}) {
  const { units, loading } = useAppData()
  const valueMissing =
    value.length > 0 && !units.some((u) => u.name === value)
  const empty = !loading && units.length === 0
  return (
    <select
      className={`${inputCls}${className ? ` ${className}` : ''}`}
      value={value}
      aria-label={ariaLabel}
      disabled={empty}
      onChange={(e) => onChange(e.target.value)}
    >
      {empty && !valueMissing ? (
        <option value="">Add units in Settings</option>
      ) : (
        <>
          {valueMissing && <option value={value}>{value}</option>}
          {units.map((u) => (
            <option key={u.id} value={u.name}>
              {u.name}
            </option>
          ))}
        </>
      )}
    </select>
  )
}
