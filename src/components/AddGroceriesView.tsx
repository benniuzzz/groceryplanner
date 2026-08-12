import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { formatDateTime } from '../lib/dates'
import { fmtQty } from '../lib/utils'
import { UNITS, type StockEntry } from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { ExpiryBadge } from './ExpiryBadge'
import { btnPrimary, btnSecondary, inputCls } from './ui'

interface DraftRow {
  name: string
  quantity: string
  unit: string
  expiry: string
}

const emptyRow = (): DraftRow => ({
  name: '',
  quantity: '',
  unit: 'pcs',
  expiry: '',
})

export function AddGroceriesView() {
  const { items, entries, run } = useAppData()
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()])
  const [message, setMessage] = useState<string | null>(null)

  const suggestions = useMemo(
    () => items.map((i) => i.name).sort((a, b) => a.localeCompare(b)),
    [items],
  )

  const update = (index: number, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async () => {
    const valid = rows
      .filter((r) => r.name.trim() !== '' && Number(r.quantity) > 0)
      .map((r) => ({
        name: r.name.trim(),
        quantity: Number(r.quantity),
        unit: r.unit,
        expiry_date: r.expiry || null,
      }))
    if (valid.length === 0) {
      setMessage('Add at least one item with a name and a quantity above 0.')
      return
    }
    const ok = await run(() => api.addGroceries(valid))
    if (ok) {
      setRows([emptyRow()])
      setMessage(`Added ${valid.length} item${valid.length === 1 ? '' : 's'} to your inventory.`)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Add groceries</h2>
        <p className="mt-1 text-sm text-slate-500">
          Log what you bought. Items with the same name are merged in your
          inventory.
        </p>

        <datalist id="item-suggestions">
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div className="mt-4 space-y-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-2 items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_90px_100px_150px_auto]"
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Item name</span>
                <input
                  className={inputCls}
                  list="item-suggestions"
                  placeholder="e.g. Eggs"
                  value={row.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Quantity</span>
                <input
                  className={inputCls}
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="0"
                  value={row.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Unit</span>
                <select
                  className={inputCls}
                  value={row.unit}
                  onChange={(e) => update(i, { unit: e.target.value })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">
                  Expiry date <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <input
                  className={`${inputCls} w-full`}
                  type="date"
                  value={row.expiry}
                  onChange={(e) => update(i, { expiry: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="self-end rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                title="Remove row"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button className={btnSecondary} onClick={() => setRows((p) => [...p, emptyRow()])}>
            + Add another item
          </button>
          <button className={btnPrimary} onClick={() => void submit()}>
            Add to inventory
          </button>
        </div>
        {message && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}
      </section>

      <RecentAdditions entries={entries} />
    </div>
  )
}

function RecentAdditions({ entries }: { entries: StockEntry[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, StockEntry[]>()
    for (const e of entries) {
      const key = formatDateTime(e.added_at)
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()].slice(0, 7)
  }, [entries])

  return (
    <aside>
      <h3 className="text-sm font-semibold text-slate-900">Recent additions</h3>
      <p className="mt-0.5 text-xs text-slate-500">Your latest shopping trips</p>
      <div className="mt-3 space-y-4">
        {groups.length === 0 && (
          <p className="text-sm text-slate-400">Nothing added yet.</p>
        )}
        {groups.map(([day, list]) => (
          <div key={day} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-700">{day}</span>
              <span className="text-xs text-slate-400">
                {list.length} item{list.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {list.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700">
                    {e.items?.name ?? 'Unknown'}
                    <span className="text-slate-400">
                      {' '}
                      &middot; {fmtQty(e.quantity)} {e.unit}
                    </span>
                  </span>
                  <ExpiryBadge date={e.expiry_date} compact />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
