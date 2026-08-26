import { useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { computeInventory, rowKey, sortByExpiryThenName } from '../lib/inventory'
import { fmtQty } from '../lib/utils'
import { type Meal } from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { ItemCombobox } from './ItemCombobox'
import { InfoTooltip } from './InfoTooltip'
import { TimePicker } from './TimePicker'
import { UnitSelect } from './UnitSelect'
import { btnPrimary, inputCls } from './ui'

export function AllocationModal({
  meal,
  onRename,
  onClose,
}: {
  meal: Meal
  onRename: (name: string) => Promise<boolean>
  onClose: () => void
}) {
  const { entries, allocations, meals, wishlist, untracked, allowedItems, units, run } = useAppData()
  const [selectedKey, setSelectedKey] = useState('')
  const [qty, setQty] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wlSelectedId, setWlSelectedId] = useState('')
  const [wlQty, setWlQty] = useState('')
  const [wlError, setWlError] = useState<string | null>(null)
  const [unName, setUnName] = useState('')
  const [unUnit, setUnUnit] = useState<string>('')
  const [unQty, setUnQty] = useState('')
  const [unError, setUnError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [timeDraft, setTimeDraft] = useState(meal.meal_time ?? '')
  const [peopleDraft, setPeopleDraft] = useState(
    meal.people != null ? String(meal.people) : '',
  )
  const [showWishlistForm, setShowWishlistForm] = useState(false)
  const [showAllocationForm, setShowAllocationForm] = useState(false)
  const [showUntrackedForm, setShowUntrackedForm] = useState(false)

  useEffect(() => {
    if (!unUnit && units.length > 0) setUnUnit(units[0].name)
  }, [units, unUnit])

  const inventory = useMemo(
    () => sortByExpiryThenName(computeInventory(entries, allocations, meals)),
    [entries, allocations, meals],
  )

  const mealAllocations = allocations.filter((a) => a.meal_id === meal.id)
  const mealWishlist = wishlist.filter((w) => w.meal_id === meal.id)
  const mealUntracked = untracked.filter((u) => u.meal_id === meal.id)

  const options = inventory.filter(
    (r) =>
      r.leftover > 0 ||
      mealAllocations.some((a) => a.item_id === r.itemId && a.unit === r.unit),
  )

  const wlOptions = useMemo(
    () => [...allowedItems].sort((a, b) => a.name.localeCompare(b.name)),
    [allowedItems],
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

  const addWishlist = async () => {
    const item = allowedItems.find((i) => i.id === wlSelectedId)
    const q = Number(wlQty)
    if (!item || !(q > 0)) {
      setWlError('Choose an item and enter a quantity above 0.')
      return
    }
    const ok = await run(() =>
      api.upsertWishlistAllocation(meal.id, item.id, item.unit, q),
    )
    if (ok) {
      setWlQty('')
      setWlError(null)
    }
  }

  const addUntracked = async () => {
    const name = unName.trim()
    const q = Number(unQty)
    if (!name || !(q > 0)) {
      setUnError('Enter an ingredient name and a quantity above 0.')
      return
    }
    if (!unUnit) {
      setUnError('Pick a unit — add one in Settings.')
      return
    }
    const ok = await run(() =>
      api.upsertUntrackedIngredient(meal.id, name, unUnit, q),
    )
    if (ok) {
      setUnName('')
      setUnQty('')
      setUnUnit(units[0]?.name ?? '')
      setUnError(null)
    }
  }

  const submitRename = async () => {
    const name = nameDraft.trim()
    if (!name || name === meal.name) {
      setEditingName(false)
      return
    }
    const ok = await onRename(name)
    if (ok) setEditingName(false)
  }

  const changeTime = (v: string | null) => {
    setTimeDraft(v ?? '')
    if (v === (meal.meal_time ?? null)) return
    void run(() => api.updateMeal(meal.id, { mealTime: v ?? null }))
  }

  const savePeople = async () => {
    const p = Number(peopleDraft)
    const next =
      peopleDraft.trim() !== '' && Number.isFinite(p) && p >= 1
        ? Math.floor(p)
        : null
    if (next === meal.people) return
    await run(() => api.updateMeal(meal.id, { people: next }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                className={`${inputCls} w-full px-2 py-1 text-lg font-semibold`}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitRename()
                  if (e.key === 'Escape') setEditingName(false)
                }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <h3 className="min-w-0 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{meal.name}</h3>
                <InfoTooltip
                  text={
                    meal.cooked
                      ? 'Cooked — these groceries were consumed.'
                      : 'Allocate groceries from your inventory, add what you still need to buy, or note other untracked ingredients.'
                  }
                />
                <button
                  className="shrink-0 rounded px-1 py-0.5 text-sm text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                  onClick={() => {
                    setNameDraft(meal.name)
                    setEditingName(true)
                  }}
                  title="Rename meal"
                >
                  &#x270E;
                </button>
              </div>
            )}
          </div>
          <button
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Time</span>
            <TimePicker
              value={timeDraft || null}
              onChange={changeTime}
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>People</span>
            <input
              type="number"
              min={1}
              placeholder="&mdash;"
              aria-label="Number of people eating"
              className={`${inputCls} w-16 px-1.5 py-1 text-xs`}
              value={peopleDraft}
              onChange={(e) => setPeopleDraft(e.target.value)}
              onBlur={() => void savePeople()}
            />
          </label>
        </div>

        <section className="mt-5">
          <div className="flex items-center">
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            To-Buy List
          </h4>
          <InfoTooltip text="Groceries to buy for this meal — buy them in Groceries to stock your inventory. A meal can only be cooked once its to-buy list is fully bought." />
          {!meal.cooked && (
            <button
              type="button"
              aria-label="Add to to-buy list"
              title={showWishlistForm ? 'Hide form' : 'Add to to-buy list'}
              onClick={() => setShowWishlistForm((v) => !v)}
              className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          )}
          </div>
          <ul className="mt-2 space-y-2">
            {mealWishlist.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                Nothing on the to-buy list yet.
              </li>
            )}
            {mealWishlist.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {w.allowed_items?.name ?? 'Unknown'}
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    {' '}
                    &middot; {fmtQty(w.quantity)} {w.unit}
                  </span>
                </span>
                {!meal.cooked && (
                  <button
                    className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => void run(() => api.deleteWishlistAllocation(w.id))}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!meal.cooked && showWishlistForm && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[180px] flex-1">
                  <ItemCombobox
                    options={wlOptions}
                    value={wlSelectedId}
                    onChange={(id) => {
                      setWlSelectedId(id)
                      setWlError(null)
                    }}
                    placeholder="Choose a grocery…"
                  />
                </div>
                <input
                  className={`${inputCls} w-24`}
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Qty"
                  value={wlQty}
                  onChange={(e) => {
                    setWlQty(e.target.value)
                    setWlError(null)
                  }}
                />
                <button className={btnPrimary} onClick={() => void addWishlist()}>
                  Add to To-Buy List
                </button>
              </div>
              {wlError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{wlError}</p>
              )}
              {wlOptions.length === 0 && mealWishlist.length === 0 && (
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                  No groceries configured yet. Add the items you want to buy in{' '}
                  <em>Settings</em>.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            From inventory
          </h4>
          <InfoTooltip text="Groceries already in stock, reserved for this meal." />
          {!meal.cooked && (
            <button
              type="button"
              aria-label="Allocate from inventory"
              title={showAllocationForm ? 'Hide form' : 'Allocate from inventory'}
              onClick={() => setShowAllocationForm((v) => !v)}
              className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          )}
          </div>
          <ul className="mt-2 space-y-2">
            {mealAllocations.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                No groceries allocated from inventory yet.
              </li>
            )}
            {mealAllocations.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {a.items?.name ?? 'Unknown'}
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    {' '}
                    &middot; {fmtQty(a.quantity)} {a.unit}
                  </span>
                </span>
                {!meal.cooked && (
                  <button
                    className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => void run(() => api.deleteAllocation(a.id))}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!meal.cooked && showAllocationForm && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
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
              {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
              {options.length === 0 && (
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                  No leftovers available. Add stock in Groceries first.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Other ingredients
          </h4>
          <InfoTooltip text="Free-text ingredients that aren't tracked in inventory or the to-buy list. Cooking or deleting the meal never affects them." />
          {!meal.cooked && (
            <button
              type="button"
              aria-label="Add other ingredient"
              title={showUntrackedForm ? 'Hide form' : 'Add other ingredient'}
              onClick={() => setShowUntrackedForm((v) => !v)}
              className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          )}
          </div>
          <ul className="mt-2 space-y-2">
            {mealUntracked.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                No other ingredients added.
              </li>
            )}
            {mealUntracked.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {u.name}
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    {' '}
                    &middot; {fmtQty(u.quantity)} {u.unit}
                  </span>
                </span>
                {!meal.cooked && (
                  <button
                    className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => void run(() => api.deleteUntrackedIngredient(u.id))}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!meal.cooked && showUntrackedForm && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputCls} min-w-[180px] flex-1`}
                  type="text"
                  placeholder="Ingredient name…"
                  value={unName}
                  onChange={(e) => {
                    setUnName(e.target.value)
                    setUnError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addUntracked()
                  }}
                />
                <UnitSelect
                  value={unUnit}
                  className="w-24"
                  onChange={(v) => {
                    setUnUnit(v)
                    setUnError(null)
                  }}
                  ariaLabel="Unit"
                />
                <input
                  className={`${inputCls} w-24`}
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Qty"
                  value={unQty}
                  onChange={(e) => {
                    setUnQty(e.target.value)
                    setUnError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addUntracked()
                  }}
                />
                <button className={btnPrimary} onClick={() => void addUntracked()}>
                  Add
                </button>
              </div>
              {unError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{unError}</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
