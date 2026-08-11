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
import { btnDanger, inputCls } from './ui'

export function PlannerView() {
  const { meals, allocations, entries, run } = useAppData()
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [addingCell, setAddingCell] = useState<{
    day: number
    slot: MealSlot
  } | null>(null)
  const [newMealName, setNewMealName] = useState('')

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

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <section className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Meal planner</h2>
            <p className="mt-1 text-sm text-slate-500">
              Plan the week. Click a meal to allocate groceries; mark it cooked
              to consume them from inventory.
            </p>
          </div>
          <button className={btnDanger} onClick={() => void clearWeek()}>
            Clear uncooked meals
          </button>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="grid min-w-[860px] grid-cols-[70px_repeat(7,minmax(0,1fr))] gap-1.5">
            <div />
            {DAYS.map((d) => (
              <div
                key={d}
                className="rounded-lg bg-slate-100 py-1.5 text-center text-sm font-semibold text-slate-600"
              >
                {d}
              </div>
            ))}

            {SLOTS.map((slot) => (
              <Fragment key={slot}>
                <div className="flex items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                      className="min-h-[90px] space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-1.5"
                    >
                      {cellMeals.map((meal) => (
                        <MealCard
                          key={meal.id}
                          meal={meal}
                          allocationCount={allocationCount(meal.id)}
                          selected={meal.id === selectedMealId}
                          onSelect={() => setSelectedMealId(meal.id)}
                          onCook={() => void run(() => api.markCooked(meal.id))}
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
                              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
                          className="w-full rounded-md border border-dashed border-slate-300 py-1 text-xs text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
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
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Leftovers</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Unallocated stock, soonest expiry first
        </p>
        <ul className="mt-3 space-y-2">
          {rows.length === 0 && (
            <li className="text-sm text-slate-400">
              Everything is allocated or the inventory is empty.
            </li>
          )}
          {rows.map((r) => (
            <li
              key={`${r.itemId}-${r.unit}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate text-slate-700">
                {r.name}
                <span className="text-slate-400">
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
