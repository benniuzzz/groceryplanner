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
  type Recipe,
} from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { MealCard } from './MealCard'
import { AllocationModal } from './AllocationModal'
import { ExpiryBadge } from './ExpiryBadge'
import { InfoTooltip } from './InfoTooltip'
import { RecipePickerModal } from './RecipePickerModal'
import { TodayView } from './TodayView'
import { inputCls, enterStagger } from './ui'

export function PlannerView() {
  const { meals, allocations, entries, wishlist, untracked, run } = useAppData()
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [addingCell, setAddingCell] = useState<{
    day: number
    slot: MealSlot
  } | null>(null)
  const [choosingCell, setChoosingCell] = useState<{
    day: number
    slot: MealSlot
  } | null>(null)
  const [newMealName, setNewMealName] = useState('')
  const [draggingMealId, setDraggingMealId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{
    day: number
    slot: MealSlot
  } | null>(null)
  const [pickedUpMealId, setPickedUpMealId] = useState<string | null>(null)

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

  const pickedUpMeal = meals.find((m) => m.id === pickedUpMealId) ?? null

  const moveMeal = async (mealId: string, day: number, slot: MealSlot) => {
    const meal = meals.find((m) => m.id === mealId)
    if (!meal || (meal.day === day && meal.slot === slot)) return
    await run(() => api.updateMeal(mealId, { day, slot }))
  }

  const allocationCount = (mealId: string) =>
    allocations.filter((a) => a.meal_id === mealId).length

  const wishlistCount = (mealId: string) =>
    wishlist.filter((w) => w.meal_id === mealId).length

  const untrackedCount = (mealId: string) =>
    untracked.filter((u) => u.meal_id === mealId).length

  const canCook = (mealId: string) => wishlistCount(mealId) === 0

  const todayMeals = meals.filter((m) => m.day === today)

  const clearNewMealFields = () => {
    setNewMealName('')
  }

  const addMeal = async (day: number, slot: MealSlot) => {
    const name = newMealName.trim()
    if (!name) return
    const ok = await run(() => api.createMeal(name, day, slot))
    if (ok) {
      setAddingCell(null)
      clearNewMealFields()
    }
  }

  // Two-step add: pick a saved recipe (its ingredients get allocated from
  // stock / wishlisted by create_meal_from_recipe) or fall through to the
  // inline input for a brand-new meal, seeded with whatever was typed.
  const planFromRecipe = async (recipe: Recipe, day: number, slot: MealSlot) => {
    setChoosingCell(null)
    await run(async () => {
      await api.applyRecipeToMeal(recipe, day, slot)
    })
  }

  const clearWeek = async () => {
    if (!confirm('Remove all uncooked meals, their allocations and photos?'))
      return
    const ok = await run(() =>
      api.clearUncookedMeals(
        meals.filter((m) => !m.cooked).map((m) => m.photo_path),
      ),
    )
    if (ok) setSelectedMealId(null)
  }

  const clearCooked = async () => {
    if (!confirm('Remove all cooked meals, their allocations and photos?'))
      return
    const ok = await run(() =>
      api.clearCookedMeals(
        meals.filter((m) => m.cooked).map((m) => m.photo_path),
      ),
    )
    if (ok) setSelectedMealId(null)
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <section className="min-w-0 flex-1">
        <div className="animate-fade-up">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Meal planner
            <InfoTooltip text="Plan the week. Click a meal to allocate groceries; when it's cooked, they're consumed from inventory." />
          </h2>
        </div>

        <TodayView meals={todayMeals} allocations={allocations} wishlist={wishlist} untracked={untracked} />

        <div className="mt-4">
          {pickedUpMeal && (
            <div className="mb-2 flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              <span className="min-w-0 flex-1">
                Moving{' '}
                <span className="font-semibold">{pickedUpMeal.name}</span> — tap
                a slot to place it.
              </span>
              <button
                type="button"
                onClick={() => setPickedUpMealId(null)}
                className="shrink-0 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-900"
              >
                Cancel
              </button>
            </div>
          )}
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
                className={`animate-fade-up flex flex-col items-center gap-1 rounded-lg py-1.5 text-sm font-semibold ${
                  day === today
                    ? 'bg-amber-400 text-amber-950 shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
                style={enterStagger(day, 30, 6)}
              >
                {d}
                {day === today && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Today
                  </span>
                )}
              </div>
            ))}

            {SLOTS.map((slot, slotIdx) => (
              <Fragment key={slot}>
                <div
                  className="animate-fade-in sticky left-0 z-10 flex items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  style={{ animationDelay: '130ms' }}
                >
                  {SLOT_LABELS[slot]}
                </div>
                {DAYS.map((_, day) => {
                  const cellMeals = meals.filter(
                    (m) => m.day === day && m.slot === slot,
                  )
                  const isAdding =
                    addingCell?.day === day && addingCell.slot === slot
                  const isDragOver =
                    dragOverCell?.day === day && dragOverCell?.slot === slot
                  const isPickUpTarget = pickedUpMealId !== null
                  return (
                    <div
                      key={`${slot}-${day}`}
                      className={`animate-fade-in min-h-[130px] space-y-1.5 rounded-lg border p-2 ${
                        day === today
                          ? 'border-amber-300 bg-amber-50/70 ring-1 ring-amber-300 dark:border-amber-700 dark:bg-amber-950/40 dark:ring-amber-700'
                          : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50'
                      } ${
                        isDragOver
                          ? 'outline-2 outline-emerald-500 -outline-offset-2'
                          : ''
                      }`}
                      onClick={() => {
                        if (!isPickUpTarget) return
                        const mealId = pickedUpMealId
                        setPickedUpMealId(null)
                        void moveMeal(mealId, day, slot)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (!isDragOver) setDragOverCell({ day, slot })
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node | null))
                          return
                        setDragOverCell(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const mealId =
                          e.dataTransfer.getData('text/plain') || draggingMealId
                        setDragOverCell(null)
                        setDraggingMealId(null)
                        if (mealId) void moveMeal(mealId, day, slot)
                      }}
                      style={{
                        animationDelay: `${150 + (slotIdx + day) * 22}ms`,
                      }}
                    >
                      {cellMeals.map((meal) => (
                        <MealCard
                          key={meal.id}
                          meal={meal}
                          allocationCount={allocationCount(meal.id)}
                          wishlistCount={wishlistCount(meal.id)}
                          untrackedCount={untrackedCount(meal.id)}
                          canCook={canCook(meal.id)}
                          selected={meal.id === selectedMealId}
                          dragging={draggingMealId === meal.id}
                          pickedUp={pickedUpMealId === meal.id}
                          pickUpActive={pickedUpMealId !== null}
                          onSelect={() => {
                            if (pickedUpMealId === meal.id) {
                              setPickedUpMealId(null)
                              return
                            }
                            if (pickedUpMealId) return
                            setSelectedMealId(meal.id)
                          }}
                          onPickUp={() => setPickedUpMealId(meal.id)}
                          onDragStart={() => setDraggingMealId(meal.id)}
                          onDragEnd={() => {
                            setDraggingMealId(null)
                            setDragOverCell(null)
                          }}
                          onToggleCook={() =>
                            run(() =>
                              meal.cooked
                                ? api.markUncooked(meal.id)
                                : api.markCooked(meal.id),
                            )
                          }
                          onDelete={() => {
                            if (confirm(`Delete meal "${meal.name}"?`)) {
                              if (selectedMealId === meal.id)
                                setSelectedMealId(null)
                              void run(() =>
                                api.deleteMeal(meal.id, meal.photo_path),
                              )
                            }
                          }}
                          onRename={(name) =>
                            run(() => api.updateMeal(meal.id, { name }))
                          }
                        />
                      ))}
                      {isAdding ? (
                        <div className="space-y-1.5">
                          <input
                            autoFocus
                            className={`${inputCls} w-full px-2 py-1.5`}
                            placeholder="Meal name"
                            value={newMealName}
                            onClick={(e) => {
                              if (isPickUpTarget) e.stopPropagation()
                            }}
                            onChange={(e) => setNewMealName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void addMeal(day, slot)
                              if (e.key === 'Escape') {
                                setAddingCell(null)
                                clearNewMealFields()
                              }
                            }}
                          />
                          <div className="flex gap-1">
                            <button
                              className="flex-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                              onClick={() => {
                                if (isPickUpTarget) return
                                void addMeal(day, slot)
                              }}
                            >
                              Add
                            </button>
                            <button
                              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                              onClick={() => {
                                if (isPickUpTarget) return
                                setAddingCell(null)
                                clearNewMealFields()
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
                            if (isPickUpTarget) return
                            setChoosingCell({ day, slot })
                            clearNewMealFields()
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

      {choosingCell && (
        <RecipePickerModal
          day={choosingCell.day}
          slot={choosingCell.slot}
          onPick={(recipe) =>
            void planFromRecipe(recipe, choosingCell.day, choosingCell.slot)
          }
          onNewMeal={(seed) => {
            const cell = choosingCell
            setChoosingCell(null)
            setAddingCell(cell)
            setNewMealName(seed)
          }}
          onClose={() => setChoosingCell(null)}
        />
      )}

      {selectedMeal && (
        <AllocationModal
          meal={selectedMeal}
          onRename={(name) => run(() => api.updateMeal(selectedMeal.id, { name }))}
          onClose={() => setSelectedMealId(null)}
        />
      )}
    </div>
  )
}

function LeftoverSidebar({ rows }: { rows: InventoryRow[] }) {
  return (
    <aside
      className="animate-slide-in-right w-full shrink-0 lg:w-72"
      style={{ animationDelay: '220ms' }}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Leftovers
          <InfoTooltip text="Unallocated stock, soonest expiry first" />
        </h3>
        <ul className="mt-3 space-y-2">
          {rows.length === 0 && (
            <li className="text-sm text-slate-400 dark:text-slate-500">
              Everything is allocated or the inventory is empty.
            </li>
          )}
          {rows.map((r, i) => (
            <li
              key={`${r.itemId}-${r.unit}`}
              className="animate-fade-in flex items-center justify-between gap-2 text-sm"
              style={enterStagger(i, 30, 8)}
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
