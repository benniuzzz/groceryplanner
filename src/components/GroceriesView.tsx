import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { computeInventory, rowKey } from '../lib/inventory'
import { formatDate, formatDateTime } from '../lib/dates'
import { fmtCost, fmtQty } from '../lib/utils'
import type { Allocation, AllowedItem, Meal, StockEntry } from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { ExpiryBadge } from './ExpiryBadge'
import { AddStockModal } from './AddStockModal'
import { AddToListModal } from './AddToListModal'
import { BuyWishlistModal } from './BuyWishlistModal'
import { btnDanger, btnPrimary, inputCls } from './ui'

interface WishlistGroup {
  item: AllowedItem
  total: number
  mealIds: Set<string>
  rows: { id: string; mealId: string | null; quantity: number }[]
}

type SortKey = 'name' | 'leftover' | 'expiry'

export function GroceriesView({
  onOpenSettings,
}: {
  onOpenSettings: () => void
}) {
  const {
    allowedItems,
    entries,
    allocations,
    allEntries,
    wishlist,
    meals,
    run,
  } = useAppData()
  const [message, setMessage] = useState<string | null>(null)

  const itemById = useMemo(() => {
    const map = new Map<string, (typeof allowedItems)[number]>()
    for (const item of allowedItems) map.set(item.id, item)
    return map
  }, [allowedItems])

  const mealById = useMemo(
    () => new Map(meals.map((m) => [m.id, m.name])),
    [meals],
  )

  const wishlistGroups = useMemo(() => {
    const groups = new Map<string, WishlistGroup>()
    for (const w of wishlist) {
      const item = itemById.get(w.allowed_item_id)
      if (!item) continue
      let group = groups.get(item.id)
      if (!group) {
        group = { item, total: 0, mealIds: new Set(), rows: [] }
        groups.set(item.id, group)
      }
      group.total += w.quantity
      if (w.meal_id !== null) group.mealIds.add(w.meal_id)
      group.rows.push({ id: w.id, mealId: w.meal_id, quantity: w.quantity })
    }
    return [...groups.values()].sort((a, b) =>
      a.item.name.localeCompare(b.item.name),
    )
  }, [wishlist, itemById])

  const buyWishlist = async (
    group: WishlistGroup,
    fields: { bought: string; expiry: string; cost: string },
  ): Promise<string | null> => {
    const expiry = fields.expiry || null
    const cost = fields.cost.trim() === '' ? null : Number(fields.cost)
    const total = group.rows.reduce((sum, r) => sum + r.quantity, 0)
    const boughtTotal =
      fields.bought.trim() === '' ? total : Number(fields.bought)
    if (!Number.isFinite(boughtTotal) || boughtTotal <= 0) {
      return 'Enter how many you bought (greater than 0).'
    }
    // Distribute the purchased quantity across meals in a stable order,
    // filling each meal's list fully before moving on. Any leftover after
    // the last meal (over-purchase) is attached to the last purchased row so
    // it lands as free, unallocated stock.
    const ordered = [...group.rows].sort((a, b) => a.id.localeCompare(b.id))
    let remaining = boughtTotal
    const ids: string[] = []
    const qtys: number[] = []
    for (const r of ordered) {
      const share = Math.min(remaining, r.quantity)
      if (share > 0) {
        ids.push(r.id)
        qtys.push(share)
        remaining -= share
      }
    }
    if (remaining > 0 && ids.length > 0) {
      qtys[qtys.length - 1] += remaining
    }
    if (ids.length === 0) {
      return 'This item has nothing left to buy.'
    }
    const ok = await run(() => api.purchaseWishlist(ids, qtys, expiry, cost))
    if (!ok) {
      return 'Could not complete the purchase.'
    }
    setMessage('Bought from your to-buy list — added to inventory.')
    return null
  }

  const removeFromList = async (group: WishlistGroup) => {
    const ids = group.rows.filter((r) => r.mealId === null).map((r) => r.id)
    if (ids.length === 0) return
    await run(async () => {
      await Promise.all(ids.map((id) => api.deleteWishlistAllocation(id)))
    })
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Groceries</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your meals&apos; to-buy list, current stock, and purchase history in
          one place — buying from the list lands straight in inventory.
        </p>
        {message && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {message}
          </p>
        )}
      </section>

      <ToBuyListSection
        groups={wishlistGroups}
        mealById={mealById}
        onBuy={buyWishlist}
        onRemove={removeFromList}
        onOpenSettings={onOpenSettings}
      />

      <InventorySection
        entries={entries}
        allocations={allocations}
        meals={meals}
        run={run}
        onOpenSettings={onOpenSettings}
      />

      <PurchaseHistorySection entries={allEntries} run={run} />
    </div>
  )
}

function ToBuyListSection({
  groups,
  mealById,
  onBuy,
  onRemove,
  onOpenSettings,
}: {
  groups: WishlistGroup[]
  mealById: Map<string, string>
  onBuy: (
    group: WishlistGroup,
    fields: { bought: string; expiry: string; cost: string },
  ) => Promise<string | null>
  onRemove: (group: WishlistGroup) => Promise<boolean | void>
  onOpenSettings: () => void
}) {
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const openGroup = openItemId
    ? (groups.find((g) => g.item.id === openItemId) ?? null)
    : null

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100">
            To-Buy List
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Groceries you still need — from planned meals or added directly.
            Once bought, they&apos;re added to inventory and reserved for their
            meal so it can be cooked.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
          title="Add an item to the to-buy list"
          onClick={() => setShowAdd(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Nothing to buy yet. Add items from a meal in the <em>Meal Planner</em>{' '}
          or with the + button above.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {groups.map((group) => (
            <div
              key={group.item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/30"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {group.item.name}
                </span>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {fmtQty(group.total)} {group.item.unit}
                  {group.mealIds.size > 0 && (
                    <>
                      {' '}
                      &middot; for{' '}
                      {[...group.mealIds]
                        .map((id) => mealById.get(id) ?? 'Unknown')
                        .join(', ')}
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {group.rows.some((r) => r.mealId === null) && (
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    title="Remove from list"
                    onClick={() => {
                      const generalQty = group.rows
                        .filter((r) => r.mealId === null)
                        .reduce((sum, r) => sum + r.quantity, 0)
                      if (
                        confirm(
                          `Remove ${group.item.name} (${fmtQty(generalQty)} ${group.item.unit}) from your to-buy list?`,
                        )
                      ) {
                        void onRemove(group)
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                )}
                <button
                  className={btnPrimary}
                  onClick={() => setOpenItemId(group.item.id)}
                >
                  I bought this
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openGroup && (
        <BuyWishlistModal
          item={openGroup.item}
          total={openGroup.total}
          unit={openGroup.item.unit}
          onClose={() => setOpenItemId(null)}
          onConfirm={(fields) => onBuy(openGroup, fields)}
        />
      )}

      {showAdd && (
        <AddToListModal
          onOpenSettings={onOpenSettings}
          onClose={() => setShowAdd(false)}
        />
      )}
    </section>
  )
}

function InventorySection({
  entries,
  allocations,
  meals,
  run,
  onOpenSettings,
}: {
  entries: StockEntry[]
  allocations: Allocation[]
  meals: Meal[]
  run: (fn: () => Promise<void>) => Promise<boolean>
  onOpenSettings: () => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [removeQty, setRemoveQty] = useState<Record<string, string>>({})
  const [removeErr, setRemoveErr] = useState<Record<string, string>>({})
  const [showAdd, setShowAdd] = useState(false)

  const rows = useMemo(
    () => computeInventory(entries, allocations, meals),
    [entries, allocations, meals],
  )

  const visible = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'leftover') return b.leftover - a.leftover
      if (!a.earliestExpiry && !b.earliestExpiry)
        return a.name.localeCompare(b.name)
      if (!a.earliestExpiry) return 1
      if (!b.earliestExpiry) return -1
      return a.earliestExpiry.localeCompare(b.earliestExpiry)
    })
  }, [rows, sortKey])

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
          <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100">Inventory</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Everything in stock, gathered from your shopping trips.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
            title="Add items to inventory"
            onClick={() => setShowAdd(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
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
                  No groceries in your inventory yet. Use the + button above to add some.
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
                        Purchase batches
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
                              <input
                                className={`${inputCls} w-20`}
                                type="number"
                                min="0.01"
                                step="any"
                                title="Quantity to remove"
                                value={removeQty[e.id] ?? String(e.quantity)}
                                onChange={(ev) => {
                                  setRemoveQty((prev) => ({
                                    ...prev,
                                    [e.id]: ev.target.value,
                                  }))
                                  setRemoveErr((prev) => ({
                                    ...prev,
                                    [e.id]: '',
                                  }))
                                }}
                              />
                              <button
                                className={btnDanger}
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  const q = Number(removeQty[e.id] ?? e.quantity)
                                  if (!(q > 0)) {
                                    setRemoveErr((prev) => ({
                                      ...prev,
                                      [e.id]: 'Enter a quantity above 0.',
                                    }))
                                    return
                                  }
                                  if (q > e.quantity) {
                                    setRemoveErr((prev) => ({
                                      ...prev,
                                      [e.id]: `Only ${fmtQty(e.quantity)} ${row.unit} available in this batch.`,
                                    }))
                                    return
                                  }
                                  const full = q >= e.quantity
                                  const ok = confirm(
                                    full
                                      ? `Remove this batch (${fmtQty(e.quantity)} ${row.unit}${e.expiry_date ? `, expires ${formatDate(e.expiry_date)}` : ''})? Do this if it was used up or went bad.`
                                      : `Remove ${fmtQty(q)} ${row.unit} from this batch${e.expiry_date ? ` (expires ${formatDate(e.expiry_date)})` : ''}?`,
                                  )
                                  if (ok) void run(() => api.removeStock(e.id, q))
                                }}
                              >
                                Remove
                              </button>
                            </span>
                            {removeErr[e.id] && (
                              <p className="w-full text-xs text-red-600 dark:text-red-400">
                                {removeErr[e.id]}
                              </p>
                            )}
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

      {showAdd && (
        <AddStockModal
          onOpenSettings={onOpenSettings}
          onClose={() => setShowAdd(false)}
        />
      )}
    </section>
  )
}

function PurchaseHistorySection({
  entries,
  run,
}: {
  entries: StockEntry[]
  run: (fn: () => Promise<void>) => Promise<boolean>
}) {
  const groups = useMemo(() => {
    const map = new Map<string, StockEntry[]>()
    for (const e of entries) {
      const key = formatDateTime(e.added_at)
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()]
  }, [entries])

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100">Purchase History</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Every purchase you&apos;ve logged</p>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          title="Clear all purchase history"
          onClick={() => {
            if (
              confirm(
                'Clear all purchase history? This permanently deletes your entire stock and history.',
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
      </div>
      <div className="mt-3 max-h-[26rem] space-y-4 overflow-y-auto pr-1">
        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Nothing added yet.
          </p>
        )}
        {groups.map(([day, list]) => {
          const subtotal = list.reduce(
            (sum, e) => sum + (e.cost ?? 0),
            0,
          )
          return (
            <div key={day} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{day}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {list.length} item{list.length === 1 ? '' : 's'}
                  {subtotal > 0 && (
                    <>
                      {' '}
                      &middot; <span className="text-slate-500 dark:text-slate-400">{fmtCost(subtotal)}</span>
                    </>
                  )}
                </span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {list.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span
                      className={
                        e.deleted_at || e.consumed_at
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-200'
                      }
                    >
                      {e.items?.name ?? 'Unknown'}
                      <span className="text-slate-400 dark:text-slate-500">
                        {' '}
                        &middot; {fmtQty(e.quantity)} {e.unit}
                      </span>
                      {e.consumed_at && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                          consumed
                        </span>
                      )}
                      {e.deleted_at && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                          removed
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      {e.cost != null && (
                        <span className="text-slate-600 dark:text-slate-300">{fmtCost(e.cost)}</span>
                      )}
                      <ExpiryBadge date={e.expiry_date} compact />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
