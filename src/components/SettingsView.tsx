import { useState } from 'react'
import * as api from '../lib/api'
import { UNITS } from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { btnDanger, btnPrimary, btnSecondary, inputCls } from './ui'

export function SettingsView() {
  const { allowedItems, run } = useAppData()
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('pcs')
  const [error, setError] = useState<string | null>(null)

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
    const ok = await run(() => api.addAllowedItem(name, newUnit))
    if (ok) {
      setNewName('')
      setNewUnit('pcs')
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

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Item names</h2>
      <p className="mt-1 max-w-prose text-sm text-slate-500 dark:text-slate-400">
        Only the items listed here can be logged in the Shopping page. The unit
        you choose for each item is applied automatically, so you won&apos;t
        pick a unit when adding groceries.
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
          <select
            className={inputCls}
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
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
      <select
        className={`${inputCls} w-36`}
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        aria-label="Unit"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
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