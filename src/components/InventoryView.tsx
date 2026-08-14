import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { computeInventory, rowKey } from '../lib/inventory'
import { formatDate } from '../lib/dates'
import { fmtQty } from '../lib/utils'
import { useAppData } from '../hooks/useAppData'
import { ExpiryBadge } from './ExpiryBadge'
import { btnDanger } from './ui'

type SortKey = 'name' | 'leftover' | 'expiry'

export function InventoryView() {
  const { entries, allocations, meals, run } = useAppData()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [hideZero, setHideZero] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const rows = useMemo(
    () => computeInventory(entries, allocations, meals),
    [entries, allocations, meals],
  )

  const visible = useMemo(() => {
    let list = hideZero ? rows.filter((r) => r.leftover > 0) : rows
    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'leftover') return b.leftover - a.leftover
      if (!a.earliestExpiry && !b.earliestExpiry)
        return a.name.localeCompare(b.name)
      if (!a.earliestExpiry) return 1
      if (!b.earliestExpiry) return -1
      return a.earliestExpiry.localeCompare(b.earliestExpiry)
    })
    return list
  }, [rows, sortKey, hideZero])

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Inventory</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Everything currently in stock, accumulated over your shopping trips.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            title="Clear all inventory"
            onClick={() => {
              if (
                confirm(
                  'Clear all inventory? This permanently deletes your entire stock and history.',
                )
              ) {
                void run(() => api.clearPurchaseHistory())
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M19 6l-1.5 14.1A2 2 0 0 1 15.5 22h-7a2 2 0 0 1-2-1.9L5 6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={(e) => setHideZero(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600 dark:border-slate-600"
            />
            Hide used up
          </label>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-500"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="name">Sort: Name</option>
            <option value="leftover">Sort: Leftover</option>
            <option value="expiry">Sort: Expiry</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">In stock</th>
              <th className="px-4 py-3 font-medium">Allocated</th>
              <th className="px-4 py-3 font-medium">Leftover</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  No groceries in your inventory yet. Add some from the Shopping tab.
                </td>
              </tr>
            )}
            {visible.map((row) => {
              const key = rowKey(row)
              const isOpen = expanded.has(key)
              return [
                <tr
                  key={key}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  onClick={() => toggle(key)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {fmtQty(row.total)} {row.unit}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {row.allocated > 0 ? `${fmtQty(row.allocated)} ${row.unit}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmtQty(row.leftover)} {row.unit}
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryBadge date={row.earliestExpiry} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 dark:text-slate-500">
                    {row.entries.length > 1
                      ? isOpen
                        ? '▴'
                        : '▾'
                      : ''}
                  </td>
                </tr>,
                isOpen ? (
                  <tr key={`${key}-detail`} className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Shopping batches
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {row.entries.map((e) => (
                          <li
                            key={e.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span className="text-slate-600 dark:text-slate-300">
                              {fmtQty(e.quantity)} {row.unit}
                              <span className="text-slate-400 dark:text-slate-500">
                                {' '}
                                &middot; added{' '}
                                {new Date(e.added_at).toLocaleDateString(undefined, {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </span>
                            <span className="flex items-center gap-3">
                              <ExpiryBadge date={e.expiry_date} compact />
                              <button
                                className={btnDanger}
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  if (
                                    confirm(
                                      `Remove this batch (${fmtQty(e.quantity)} ${row.unit}${e.expiry_date ? `, expires ${formatDate(e.expiry_date)}` : ''})? Do this if it was used up or went bad.`,
                                    )
                                  ) {
                                    void run(() => api.deleteStockEntry(e.id))
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null,
              ]
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
