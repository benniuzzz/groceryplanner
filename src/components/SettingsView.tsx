import { useEffect, useState } from 'react'
import * as api from '../lib/api'
import { useAppData } from '../hooks/useAppData'
import { btnIconDanger, btnPrimary, enterStagger, inputCls } from './ui'
import { DailyNotificationSection } from './DailyNotificationSection'
import { InfoTooltip } from './InfoTooltip'
import { UnitSelect } from './UnitSelect'

export function SettingsView() {
  const { allowedItems, units, run } = useAppData()
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [newUnitName, setNewUnitName] = useState('')
  const [unitError, setUnitError] = useState<string | null>(null)
  const [itemDrafts, setItemDrafts] = useState<
    Record<string, { name: string; unit: string }>
  >({})
  const [unitDrafts, setUnitDrafts] = useState<Record<string, { name: string }>>(
    {},
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!newUnit && units.length > 0) setNewUnit(units[0].name)
  }, [units, newUnit])

  useEffect(() => {
    setItemDrafts((prev) => {
      const ids = new Set(allowedItems.map((i) => i.id))
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => ids.has(id)),
      )
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [allowedItems])

  useEffect(() => {
    setUnitDrafts((prev) => {
      const ids = new Set(units.map((u) => u.id))
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => ids.has(id)),
      )
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [units])

  const dirtyItems = allowedItems.filter((item) => {
    const d = itemDrafts[item.id]
    return d ? d.name.trim() !== item.name || d.unit !== item.unit : false
  })
  const dirtyUnits = units.filter((unit) => {
    const d = unitDrafts[unit.id]
    return d ? d.name.trim() !== unit.name : false
  })
  const dirtyCount = dirtyItems.length + dirtyUnits.length

  const setItemDraft = (id: string, name: string, unit: string) => {
    setItemDrafts((prev) => ({ ...prev, [id]: { name, unit } }))
    setSaved(false)
    setSaveError(null)
  }

  const setUnitDraft = (id: string, name: string) => {
    setUnitDrafts((prev) => ({ ...prev, [id]: { name } }))
    setSaved(false)
    setSaveError(null)
  }

  const saveAll = async () => {
    const itemEdits = dirtyItems.map((item) => ({
      id: item.id,
      name: (itemDrafts[item.id]?.name ?? item.name).trim(),
      unit: itemDrafts[item.id]?.unit ?? item.unit,
    }))
    const unitEdits = dirtyUnits.map((unit) => ({
      id: unit.id,
      name: (unitDrafts[unit.id]?.name ?? unit.name).trim(),
    }))
    if (itemEdits.some((e) => !e.name)) {
      setSaveError('Fill in every item name before saving.')
      return
    }
    if (unitEdits.some((e) => !e.name)) {
      setSaveError('Fill in every unit name before saving.')
      return
    }
    setSaving(true)
    const ok = await run(async () => {
      for (const e of itemEdits) {
        await api.updateAllowedItem(e.id, e.name, e.unit)
      }
      for (const e of unitEdits) {
        await api.updateUnit(e.id, e.name)
      }
    })
    setSaving(false)
    if (ok) {
      setItemDrafts({})
      setUnitDrafts({})
      setSaveError(null)
      setSaved(true)
    }
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) {
      setError('Enter an item name.')
      return
    }
    if (
      allowedItems.some(
        (a) => a.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError(`"${name}" is already in the list.`)
      return
    }
    if (!newUnit) {
      setError('Pick a unit — add one in the Quantity units section below.')
      return
    }
    const ok = await run(() => api.addAllowedItem(name, newUnit))
    if (ok) {
      setNewName('')
      setNewUnit(units[0]?.name ?? '')
      setError(null)
    }
  }

  const remove = (id: string, name: string) => {
    if (
      confirm(
        `Remove "${name}" from the allowed list? Existing inventory and history are kept, but it can no longer be added in Groceries.`,
      )
    ) {
      void run(() => api.removeAllowedItem(id))
    }
  }

  const addUnit = async () => {
    const name = newUnitName.trim()
    if (!name) {
      setUnitError('Enter a unit name.')
      return
    }
    if (units.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      setUnitError(`"${name}" is already in the list.`)
      return
    }
    const ok = await run(() => api.addUnit(name))
    if (ok) {
      setNewUnitName('')
      setUnitError(null)
    }
  }

  const removeUnit = (id: string, name: string) => {
    if (
      confirm(
        `Remove "${name}" from the unit list? It can no longer be selected for new entries; existing inventory and history keep their unit.`,
      )
    ) {
      void run(() => api.removeUnit(id))
    }
  }

  const saveBtnLabel = saving
    ? 'Saving…'
    : dirtyCount > 0
      ? 'Save changes'
      : saved
        ? 'Saved'
        : 'Save changes'

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Settings
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {dirtyCount > 0
                ? `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}`
                : 'All changes are saved'}
            </p>
          </div>
          <button
            className={
              saved && dirtyCount === 0
                ? btnSaved
                : btnPrimary
            }
            disabled={dirtyCount === 0 || saving}
            onClick={() => void saveAll()}
          >
            <span className="flex items-center gap-2">
              {saved && dirtyCount === 0 && !saving && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              {saveBtnLabel}
            </span>
          </button>
        </div>
        {saveError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {saveError}
          </p>
        )}
      </div>

      <section className="animate-fade-up">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Item names
          <InfoTooltip text="Only items listed here can be logged in Groceries; each one's unit is applied automatically." />
        </h2>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-1 min-w-[200px] flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">New item name</span>
            <input
              className={inputCls}
              placeholder="e.g. Eggs"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setError(null)
              }}
            />
          </label>
          <label className="flex w-36 flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unit</span>
            <UnitSelect
              value={newUnit}
              onChange={(v) => {
                setNewUnit(v)
                setError(null)
              }}
              ariaLabel="Unit"
            />
          </label>
          <button className={btnPrimary} onClick={() => void add()}>
            Add item
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-6">
          {allowedItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
              No allowed items yet. Add one above, then head to the Groceries page
              to log groceries.
            </p>
          ) : (
            <ul className="space-y-2">
              {allowedItems.map((item, i) => (
                <AllowedItemRow
                  key={item.id}
                  item={item}
                  draft={itemDrafts[item.id]}
                  index={i}
                  onChange={(name, unit) => setItemDraft(item.id, name, unit)}
                  onRemove={remove}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
          className="animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Quantity units
          <InfoTooltip text="These appear in the unit dropdown wherever you log or allocate groceries. A unit that is in use on inventory or meals cannot be renamed or deleted." />
        </h2>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-1 min-w-[200px] flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">New unit</span>
            <input
              className={inputCls}
              placeholder="e.g. dozen"
              value={newUnitName}
              onChange={(e) => {
                setNewUnitName(e.target.value)
                setUnitError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addUnit()
              }}
            />
          </label>
          <button className={btnPrimary} onClick={() => void addUnit()}>
            Add unit
          </button>
        </div>
        {unitError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{unitError}</p>
        )}

        <div className="mt-6">
          {units.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
              No units configured. Add one above — it will appear in every unit
              dropdown.
            </p>
          ) : (
            <ul className="space-y-2">
              {units.map((unit, i) => (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  draft={unitDrafts[unit.id]}
                  index={i}
                  onChange={(name) => setUnitDraft(unit.id, name)}
                  onRemove={removeUnit}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <DailyNotificationSection />
    </div>
  )
}

const btnSaved =
  'rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'

function AllowedItemRow({
  item,
  draft,
  index,
  onChange,
  onRemove,
}: {
  item: { id: string; name: string; unit: string }
  draft: { name: string; unit: string } | undefined
  index: number
  onChange: (name: string, unit: string) => void
  onRemove: (id: string, name: string) => void
}) {
  const name = draft?.name ?? item.name
  const unit = draft?.unit ?? item.unit
  const dirty = name.trim() !== item.name || unit !== item.unit

  return (
    <li
      className="animate-fade-up flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      style={enterStagger(1 + index, 40, 10)}
    >
      <input
        className={`${inputCls} min-w-[180px] flex-1`}
        value={name}
        onChange={(e) => onChange(e.target.value, unit)}
        aria-label="Item name"
      />
      <UnitSelect
        value={unit}
        onChange={(v) => onChange(name, v)}
        className="w-36"
        ariaLabel="Unit"
      />
      {dirty && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          edited
        </span>
      )}
      <button
        type="button"
        className={btnIconDanger}
        title={`Remove "${item.name}"`}
        aria-label={`Remove "${item.name}"`}
        onClick={() => onRemove(item.id, item.name)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M19 6l-1.5 14.1A2 2 0 0 1 15.5 22h-7a2 2 0 0 1-2-1.9L5 6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </li>
  )
}

function UnitRow({
  unit,
  draft,
  index,
  onChange,
  onRemove,
}: {
  unit: { id: string; name: string }
  draft: { name: string } | undefined
  index: number
  onChange: (name: string) => void
  onRemove: (id: string, name: string) => void
}) {
  const name = draft?.name ?? unit.name
  const dirty = name.trim() !== unit.name

  return (
    <li
      className="animate-fade-up flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      style={enterStagger(1 + index, 40, 10)}
    >
      <input
        className={`${inputCls} min-w-[180px] flex-1`}
        value={name}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Unit name"
      />
      {dirty && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          edited
        </span>
      )}
      <button
        type="button"
        className={btnIconDanger}
        title={`Remove "${unit.name}"`}
        aria-label={`Remove "${unit.name}"`}
        onClick={() => onRemove(unit.id, unit.name)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M19 6l-1.5 14.1A2 2 0 0 1 15.5 22h-7a2 2 0 0 1-2-1.9L5 6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </li>
  )
}