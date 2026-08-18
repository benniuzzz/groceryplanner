import { Fragment, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { computeInventory, sortByExpiryThenName } from '../lib/inventory'
import { fmtQty } from '../lib/utils'
import {
  DAYS,
  SLOTS,
  SLOT_LABELS,
  type InventoryRow,
  type MealSlot,
} from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { MealCard } from './MealCard'
import { AllocationModal } from './AllocationModal'
import { ExpiryBadge } from './ExpiryBadge'
import { TodayView } from './TodayView'
import { inputCls } from './ui'

export function PlannerView() {
  const { meals, allocations, entries, wishlist, run } = useAppData()
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [addingCell, setAddingCell] = useState<{
    day: number
    slot: MealSlot
  } | null>(null)
  const [newMealName, setNewMealName] = useState('')

  const today = (new Date().getDay() + 6) % 7

  const inventory = useMemo(
    () => computeInventory(entries, allocations, meals),
    [entries, allocations, meals],
  )

  const leftovers = useMemo(
    () => sortByExpiryThenName(inventory.filter((r) => r.leftover > 0)),
    [inventory],
  )

  const selectedMeal = meals.find((m) => m.id === selectedMealId) ?? null

  const allocationCount = (mealId: string) =>
    allocations.filter((a) => a.meal_id === mealId).length

  const wishlistCount = (mealId: string) =>
    wishlist.filter((w) => w.meal_id === mealId).length

  const canCook = (mealId: string) => wishlistCount(mealId) === 0

  const todayMeals = meals.filter((m) => m.day === today)

  const addMeal = async (day: number, slot: MealSlot) => {
    const name = newMealName.trim()
    if (!name) return
    const ok = await run(() => api.createMeal(name, day, slot))
    if (ok) {
      setAddingCell(null)
      setNewMealName('')
    }
  }

  const clearWeek = async () => {
    if (!confirm('Remove all uncooked meals and their allocations?')) return
    const ok = await run(() => api.clearUncookedMeals())
    if (ok) setSelectedMealId(null)
  }

  const clearCooked = async () => {
    if (!confirm('Remove all cooked meals and their allocations?')) return
    const ok = await run(() => api.clearCookedMeals())
    if (ok) setSelectedMealId(null)
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <section className="min-w-0 flex-1">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Meal planner</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Plan the week. Click a meal to allocate groceries; mark it cooked
            to consume them from inventory.
          </p>
        </div>

        <TodayView meals={todayMeals} allocations={allocations} wishlist={wishlist} />

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-end gap-2">
            <div className="group relative">
              <button
                type="button"
                aria-label="Clear uncooked meals"
                onClick={() => void clearWeek()}
                className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
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
                  <path d="M19 20H11" />
                  <path d="M21 16l-7-7-6 6-4 4V9a1 1 0 0 1 .29-.71l9.5-9.5a1 1 0 0 1 1.41 0l5.6 5.6a1 1 0 0 1 0 1.41L15 12l6 6z" />
                </svg>
              </button>
              <span className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
                Clear uncooked meals
              </span>
            </div>
            <div className="group relative">
              <button
                type="button"
                aria-label="Clear cooked meals"
                onClick={() => void clearCooked()}
                className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
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
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
              <span className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
                Clear cooked meals
              </span>
            </div>
          </div>
          <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1400px] grid-cols-[70px_repeat(7,minmax(180px,1fr))] gap-1.5">
            <div className="sticky left-0 z-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
            {DAYS.map((d, day) => (
              <div
                key={d}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-sm font-semibold ${
                  day === today
                    ? 'bg-amber-400 text-amber-950 shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {d}
                {day === today && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Today
                  </span>
                )}
              </div>
            ))}

            {SLOTS.map((slot) => (
              <Fragment key={slot}>
                <div className="sticky left-0 z-10 flex items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {SLOT_LABELS[slot]}
                </div>
                {DAYS.map((_, day) => {
                  const cellMeals = meals.filter(
                    (m) => m.day === day && m.slot === slot,
                  )
                  const isAdding =
                    addingCell?.day === day && addingCell.slot === slot
                  return (
                    <div
                      key={`${slot}-${day}`}
                      className={`min-h-[130px] space-y-1.5 rounded-lg border p-2 ${
                        day === today
                          ? 'border-amber-300 bg-amber-50/70 ring-1 ring-amber-300 dark:border-amber-700 dark:bg-amber-950/40 dark:ring-amber-700'
                          : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50'
                      }`}
                    >
                      {cellMeals.map((meal) => (
                        <MealCard
                          key={meal.id}
                          meal={meal}
                          allocationCount={allocationCount(meal.id)}
                          wishlistCount={wishlistCount(meal.id)}
                          canCook={canCook(meal.id)}
                          selected={meal.id === selectedMealId}
                          onSelect={() => setSelectedMealId(meal.id)}
                          onToggleCook={() =>
                            void run(() =>
                              meal.cooked
                                ? api.markUncooked(meal.id)
                                : api.markCooked(meal.id),
                            )
                          }
                          onDelete={() => {
                            if (confirm(`Delete meal "${meal.name}"?`)) {
                              if (selectedMealId === meal.id)
                                setSelectedMealId(null)
                              void run(() => api.deleteMeal(meal.id))
                            }
                          }}
                        />
                      ))}
                      {isAdding ? (
                        <div className="space-y-1.5">
                          <input
                            autoFocus
                            className={`${inputCls} w-full px-2 py-1.5`}
                            placeholder="Meal name"
                            value={newMealName}
                            onChange={(e) => setNewMealName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void addMeal(day, slot)
                              if (e.key === 'Escape') {
                                setAddingCell(null)
                                setNewMealName('')
                              }
                            }}
                          />
                          <div className="flex gap-1">
                            <button
                              className="flex-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                              onClick={() => void addMeal(day, slot)}
                            >
                              Add
                            </button>
                            <button
                              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                              onClick={() => {
                                setAddingCell(null)
                                setNewMealName('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="w-full rounded-md border border-dashed border-slate-300 py-1.5 text-sm text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-500 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                          onClick={() => {
                            setAddingCell({ day, slot })
                            setNewMealName('')
                          }}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
          </div>
        </div>
      </section>

      <LeftoverSidebar rows={leftovers} />

      {selectedMeal && (
        <AllocationModal
          meal={selectedMeal}
          onClose={() => setSelectedMealId(null)}
        />
      )}
    </div>
  )
}

function LeftoverSidebar({ rows }: { rows: InventoryRow[] }) {
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Leftovers</h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Unallocated stock, soonest expiry first
        </p>
        <ul className="mt-3 space-y-2">
          {rows.length === 0 && (
            <li className="text-sm text-slate-400 dark:text-slate-500">
              Everything is allocated or the inventory is empty.
            </li>
          )}
          {rows.map((r) => (
            <li
              key={`${r.itemId}-${r.unit}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                {r.name}
                <span className="text-slate-400 dark:text-slate-500">
                  {' '}
                  &middot; {fmtQty(r.leftover)} {r.unit}
                </span>
              </span>
              <ExpiryBadge date={r.earliestExpiry} compact />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
