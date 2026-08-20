import { useEffect, useState } from 'react'
import * as api from '../lib/api'
import { useAppData } from '../hooks/useAppData'
import { btnDanger, btnPrimary, btnSecondary, inputCls } from './ui'
import { UnitSelect } from './UnitSelect'

export function SettingsView() {
  const { allowedItems, units, run } = useAppData()
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [newUnitName, setNewUnitName] = useState('')
  const [unitError, setUnitError] = useState<string | null>(null)

  useEffect(() => {
    if (!newUnit && units.length > 0) setNewUnit(units[0].name)
  }, [units, newUnit])

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

  const save = (id: string, name: string, unit: string) => {
    void run(() => api.updateAllowedItem(id, name, unit))
  }

  const remove = (id: string, name: string) => {
    if (
      confirm(
        `Remove "${name}" from the allowed list? Existing inventory and history are kept, but it can no longer be added in Shopping.`,
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

  const saveUnit = (id: string, name: string) => {
    void run(() => api.updateUnit(id, name))
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

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Item names</h2>
        <p className="mt-1 max-w-prose text-sm text-slate-500 dark:text-slate-400">
          Only items listed here can be logged in Shopping; each one&apos;s unit is
          applied automatically.
        </p>

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
              No allowed items yet. Add one above, then head to the Shopping page
              to log groceries.
            </p>
          ) : (
            <ul className="space-y-2">
              {allowedItems.map((item) => (
                <AllowedItemRow
                  key={item.id}
                  item={item}
                  onSave={save}
                  onRemove={remove}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quantity units</h2>
        <p className="mt-1 max-w-prose text-sm text-slate-500 dark:text-slate-400">
          These appear in the unit dropdown wherever you log or allocate
          groceries. A unit that is in use on inventory or meals cannot be
          renamed or deleted.
        </p>

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
              {units.map((unit) => (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  onSave={saveUnit}
                  onRemove={removeUnit}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function AllowedItemRow({
  item,
  onSave,
  onRemove,
}: {
  item: { id: string; name: string; unit: string }
  onSave: (id: string, name: string, unit: string) => void
  onRemove: (id: string, name: string) => void
}) {
  const [name, setName] = useState(item.name)
  const [unit, setUnit] = useState(item.unit)
  const dirty = name.trim() !== item.name || unit !== item.unit

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <input
        className={`${inputCls} min-w-[180px] flex-1`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Item name"
      />
      <UnitSelect
        value={unit}
        onChange={setUnit}
        className="w-36"
        ariaLabel="Unit"
      />
      <div className="flex items-center gap-2">
        <button
          className={btnSecondary}
          disabled={!dirty}
          onClick={() => onSave(item.id, name.trim(), unit)}
        >
          Save
        </button>
        <button className={btnDanger} onClick={() => onRemove(item.id, item.name)}>
          Remove
        </button>
      </div>
    </li>
  )
}

function UnitRow({
  unit,
  onSave,
  onRemove,
}: {
  unit: { id: string; name: string }
  onSave: (id: string, name: string) => void
  onRemove: (id: string, name: string) => void
}) {
  const [name, setName] = useState(unit.name)
  const dirty = name.trim() !== unit.name

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <input
        className={`${inputCls} min-w-[180px] flex-1`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Unit name"
      />
      <div className="flex items-center gap-2">
        <button
          className={btnSecondary}
          disabled={!dirty}
          onClick={() => onSave(unit.id, name.trim())}
        >
          Save
        </button>
        <button className={btnDanger} onClick={() => onRemove(unit.id, unit.name)}>
          Remove
        </button>
      </div>
    </li>
  )
}
