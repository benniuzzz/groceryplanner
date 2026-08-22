import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { formatDateTime } from '../lib/dates'
import { fmtCost, fmtQty } from '../lib/utils'
import type { AllowedItem, StockEntry } from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { ExpiryBadge } from './ExpiryBadge'
import { btnPrimary, inputCls } from './ui'

export function ShoppingView() {
  const { allowedItems, allEntries, wishlist, meals, run } = useAppData()
  const [message, setMessage] = useState<string | null>(null)
  const [purchaseFields, setPurchaseFields] = useState<
    Record<string, { expiry: string; cost: string; bought: string }>
  >({})

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
    const groups = new Map<
      string,
      {
        item: AllowedItem
        total: number
        mealIds: Set<string>
        rows: { id: string; quantity: number }[]
      }
    >()
    for (const w of wishlist) {
      const item = itemById.get(w.allowed_item_id)
      if (!item) continue
      let group = groups.get(item.id)
      if (!group) {
        group = { item, total: 0, mealIds: new Set(), rows: [] }
        groups.set(item.id, group)
      }
      group.total += w.quantity
      group.mealIds.add(w.meal_id)
      group.rows.push({ id: w.id, quantity: w.quantity })
    }
    return [...groups.values()].sort((a, b) =>
      a.item.name.localeCompare(b.item.name),
    )
  }, [wishlist, itemById])

  const fieldsFor = (itemId: string) =>
    purchaseFields[itemId] ?? { expiry: '', cost: '', bought: '' }

  const setField = (
    itemId: string,
    key: 'expiry' | 'cost' | 'bought',
    value: string,
  ) => {
    setPurchaseFields((prev) => ({
      ...prev,
      [itemId]: { ...fieldsFor(itemId), [key]: value },
    }))
  }

  const buyWishlist = async (
    itemId: string,
    rows: { id: string; quantity: number }[],
  ) => {
    const fields = fieldsFor(itemId)
    const expiry = fields.expiry || null
    const cost = fields.cost.trim() === '' ? null : Number(fields.cost)
    const total = rows.reduce((sum, r) => sum + r.quantity, 0)
    const boughtTotal =
      fields.bought.trim() === '' ? total : Number(fields.bought)
    if (!Number.isFinite(boughtTotal) || boughtTotal <= 0) {
      setMessage('Enter how many you bought (greater than 0).')
      return
    }
    // Distribute the purchased quantity across meals in a stable order,
    // filling each meal's wishlist fully before moving on. Any leftover after
    // the last meal (over-purchase) is attached to the last purchased row so
    // it lands as free, unallocated stock.
    const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id))
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
      setMessage('This item has no wishlist quantity to buy.')
      return
    }
    const ok = await run(() => api.purchaseWishlist(ids, qtys, expiry, cost))
    if (ok) {
      setPurchaseFields((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      setMessage('Bought from your meal wishlist — added to inventory.')
    }
  }

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Shopping</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Buy items from your meal wishlists — purchases land straight in
          inventory. To log other purchases, use the + button on the{' '}
          <em>Inventory</em> tab.
        </p>
        {message && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {message}
          </p>
        )}
      </section>

      <WishlistSection
        groups={wishlistGroups}
        mealById={mealById}
        fieldsFor={fieldsFor}
        setField={setField}
        onBuy={buyWishlist}
      />

      <AdditionHistory entries={allEntries} run={run} />
    </div>
  )
}

function WishlistSection({
  groups,
  mealById,
  fieldsFor,
  setField,
  onBuy,
}: {
  groups: {
    item: AllowedItem
    total: number
    mealIds: Set<string>
    rows: { id: string; quantity: number }[]
  }[]
  mealById: Map<string, string>
  fieldsFor: (itemId: string) => { expiry: string; cost: string; bought: string }
  setField: (
    itemId: string,
    key: 'expiry' | 'cost' | 'bought',
    value: string,
  ) => void
  onBuy: (itemId: string, rows: { id: string; quantity: number }[]) => void
}) {
  return (
    <section>
      <div>
        <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100">
          Meal Wishlist
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Groceries your meals still need. Once bought, they&apos;re added to
          inventory and reserved for their meal so it can be cooked.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          No items on any meal&apos;s wishlist yet. Add them from a meal in the{' '}
          <em>Meal Planner</em>.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {groups.map((group) => (
            <div
              key={group.item.id}
              className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/30 lg:flex-row lg:items-end"
            >
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {group.item.name}
                </span>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {fmtQty(group.total)} {group.item.unit} &middot; for{' '}
                  {[...group.mealIds]
                    .map((id) => mealById.get(id) ?? 'Unknown')
                    .join(', ')}
                </div>
              </div>
              <label className="flex flex-col gap-1 lg:w-28">
                <span className="text-xs font-medium text-slate-500">
                  Bought <span className="font-normal text-slate-400 dark:text-slate-500">(of {fmtQty(group.total)})</span>
                </span>
                <input
                  className={`${inputCls} w-full`}
                  type="number"
                  min="0"
                  step="any"
                  placeholder={String(group.total)}
                  value={fieldsFor(group.item.id).bought}
                  onChange={(e) =>
                    setField(group.item.id, 'bought', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col gap-1 lg:w-40">
                <span className="text-xs font-medium text-slate-500">
                  Expiry <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
                </span>
                <input
                  className={`${inputCls} w-full`}
                  type="date"
                  value={fieldsFor(group.item.id).expiry}
                  onChange={(e) =>
                    setField(group.item.id, 'expiry', e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col gap-1 lg:w-28">
                <span className="text-xs font-medium text-slate-500">
                  Cost <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
                </span>
                <input
                  className={`${inputCls} w-full`}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={fieldsFor(group.item.id).cost}
                  onChange={(e) =>
                    setField(group.item.id, 'cost', e.target.value)
                  }
                />
              </label>
              <button
                className={btnPrimary}
                onClick={() => void onBuy(group.item.id, group.rows)}
              >
                I bought this
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function AdditionHistory({
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
