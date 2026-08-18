import { useMemo, useState } from 'react'
import { formatDateTime } from '../lib/dates'
import { fmtQty } from '../lib/utils'
import {
  SLOTS,
  SLOT_LABELS,
  type Allocation,
  type Meal,
  type MealSlot,
  type MealWishlist,
} from '../lib/types'

const SLOT_ACCENTS: Record<
  MealSlot,
  {
    pill: string
    card: string
    dish: string
  }
> = {
  breakfast: {
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    card: 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/40',
    dish: 'text-emerald-900 dark:text-emerald-200',
  },
  lunch: {
    pill: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    card: 'border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/40',
    dish: 'text-amber-900 dark:text-amber-200',
  },
  dinner: {
    pill: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    card: 'border-sky-200 bg-sky-50/40 dark:border-sky-900 dark:bg-sky-950/40',
    dish: 'text-sky-900 dark:text-sky-200',
  },
}

export function TodayView({
  meals,
  allocations,
  wishlist,
}: {
  meals: Meal[]
  allocations: Allocation[]
  wishlist: MealWishlist[]
}) {
  const today = new Date()
  const dateLabel = formatDateTime(today.toISOString())
  const slotMeals = (slot: MealSlot) =>
    meals.filter((m) => m.slot === slot)
  const [copied, setCopied] = useState(false)

  const text = useMemo(
    () => buildTodayText(meals, allocations, wishlist, dateLabel),
    [meals, allocations, wishlist, dateLabel],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Today</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">{dateLabel}</span>
        </div>
        <div className="group relative">
          <button
            type="button"
            aria-label="Copy today's meals"
            onClick={() => void copy()}
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
          >
            {copied ? (
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
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
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
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <span className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-normal text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
            {copied ? 'Copied!' : "Copy today's meals"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SLOTS.map((slot) => (
          <div
            key={slot}
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${SLOT_ACCENTS[slot].pill}`}
            >
              {SLOT_LABELS[slot]}
            </div>
            <div className="mt-2 space-y-2">
              {slotMeals(slot).length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">No meal planned</p>
              )}
              {slotMeals(slot).map((meal) => (
                <div
                  key={meal.id}
                  className={`rounded-lg border p-2 text-sm ${
                    meal.cooked
                      ? 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                      : SLOT_ACCENTS[slot].card
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        meal.cooked
                          ? 'text-slate-400 line-through dark:text-slate-500'
                          : SLOT_ACCENTS[slot].dish
                      }`}
                    >
                      {meal.name}
                    </span>
                    {meal.cooked && (
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        Cooked
                      </span>
                    )}
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {mealIngredients(allocations, wishlist, meal.id).map((ig) => (
                      <li key={ig.key} className="text-slate-600 dark:text-slate-300">
                        {ig.name}
                        <span className="text-slate-400 dark:text-slate-500">
                          {' '}
                          &middot; {fmtQty(ig.quantity)} {ig.unit}
                        </span>
                      </li>
                    ))}
                    {mealIngredients(allocations, wishlist, meal.id).length === 0 && (
                      <li className="text-xs text-slate-400 dark:text-slate-500">
                        No ingredients allocated
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function mealAllocations(allocations: Allocation[], mealId: string) {
  return allocations.filter((a) => a.meal_id === mealId)
}

interface IngredientLine {
  key: string
  name: string
  quantity: number
  unit: string
}

function mealIngredients(
  allocations: Allocation[],
  wishlist: MealWishlist[],
  mealId: string,
): IngredientLine[] {
  const lines: IngredientLine[] = [
    ...mealAllocations(allocations, mealId).map((a) => ({
      key: a.id,
      name: a.items?.name ?? 'Unknown',
      quantity: a.quantity,
      unit: a.unit,
    })),
    ...wishlist
      .filter((w) => w.meal_id === mealId)
      .map((w) => ({
        key: w.id,
        name: w.allowed_items?.name ?? 'Unknown',
        quantity: w.quantity,
        unit: w.unit,
      })),
  ]
  return lines
}

function buildTodayText(
  meals: Meal[],
  allocations: Allocation[],
  wishlist: MealWishlist[],
  dateLabel: string,
): string {
  const lines: string[] = []
  lines.push(`Today \u00B7 ${dateLabel}`)

  for (const slot of SLOTS) {
    const slotMeals = meals.filter((m) => m.slot === slot)
    lines.push('')
    lines.push(`${SLOT_LABELS[slot]}:`)
    if (slotMeals.length === 0) {
      lines.push('  No meal planned')
    }
    for (const meal of slotMeals) {
      lines.push(`  - ${meal.name}`)
      const ings = mealIngredients(allocations, wishlist, meal.id)
      if (ings.length === 0) {
        lines.push('      No ingredients allocated')
      }
      for (const ig of ings) {
        lines.push(`      - ${ig.name}: ${fmtQty(ig.quantity)} ${ig.unit}`)
      }
    }
  }

  return lines.join('\n')
}