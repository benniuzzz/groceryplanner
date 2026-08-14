import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { computeInventory, rowKey, sortByExpiryThenName } from '../lib/inventory'
import { fmtQty } from '../lib/utils'
import type { Meal } from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { btnPrimary, inputCls } from './ui'

export function AllocationModal({
  meal,
  onClose,
}: {
  meal: Meal
  onClose: () => void
}) {
  const { entries, allocations, meals, run } = useAppData()
  const [selectedKey, setSelectedKey] = useState('')
  const [qty, setQty] = useState('')
  const [error, setError] = useState<string | null>(null)

  const inventory = useMemo(
    () => sortByExpiryThenName(computeInventory(entries, allocations, meals)),
    [entries, allocations, meals],
  )

  const mealAllocations = allocations.filter((a) => a.meal_id === meal.id)

  const options = inventory.filter(
    (r) =>
      r.leftover > 0 ||
      mealAllocations.some((a) => a.item_id === r.itemId && a.unit === r.unit),
  )

  const add = async () => {
    const row = inventory.find((r) => rowKey(r) === selectedKey)
    const q = Number(qty)
    if (!row || !(q > 0)) {
      setError('Choose an item and enter a quantity above 0.')
      return
    }
    const existing = mealAllocations.find(
      (a) => a.item_id === row.itemId && a.unit === row.unit,
    )
    const available = row.leftover + (existing?.quantity ?? 0)
    if (q > available) {
      setError(`Only ${fmtQty(available)} ${row.unit} available for this meal.`)
      return
    }
    const ok = await run(() =>
      api.upsertAllocation(meal.id, row.itemId, row.unit, q),
    )
    if (ok) {
      setQty('')
      setError(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{meal.name}</h3>
            <p className="text-sm text-slate-500">
              {meal.cooked
                ? 'Cooked — these groceries were consumed from inventory.'
                : 'Allocate groceries from your inventory to this meal.'}
            </p>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {mealAllocations.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
              No groceries allocated yet.
            </li>
          )}
          {mealAllocations.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-800">
                {a.items?.name ?? 'Unknown'}
                <span className="font-normal text-slate-400">
                  {' '}
                  &middot; {fmtQty(a.quantity)} {a.unit}
                </span>
              </span>
              {!meal.cooked && (
                <button
                  className="text-xs text-slate-400 hover:text-red-600"
                  onClick={() => void run(() => api.deleteAllocation(a.id))}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {!meal.cooked && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={`${inputCls} min-w-[180px] flex-1`}
                value={selectedKey}
                onChange={(e) => {
                  setSelectedKey(e.target.value)
                  setError(null)
                }}
              >
                <option value="">Choose a grocery…</option>
                {options.map((r) => {
                  const existing = mealAllocations.find(
                    (a) => a.item_id === r.itemId && a.unit === r.unit,
                  )
                  const available = r.leftover + (existing?.quantity ?? 0)
                  return (
                    <option key={rowKey(r)} value={rowKey(r)}>
                      {r.name} — {fmtQty(available)} {r.unit} available
                    </option>
                  )
                })}
              </select>
              <input
                className={`${inputCls} w-24`}
                type="number"
                min="0.01"
                step="any"
                placeholder="Qty"
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value)
                  setError(null)
                }}
              />
              <button className={btnPrimary} onClick={() => void add()}>
                Allocate
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {options.length === 0 && (
              <p className="mt-2 text-sm text-slate-400">
                No leftovers available. Add to Shopping first.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
