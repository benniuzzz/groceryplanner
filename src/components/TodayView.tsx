import { useMemo, useState } from 'react'
import { formatDateTime } from '../lib/dates'
import { fmtQty } from '../lib/utils'
import {
  SLOTS,
  SLOT_LABELS,
  type Allocation,
  type Meal,
  type MealSlot,
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
    pill: 'bg-emerald-100 text-emerald-700',
    card: 'border-emerald-200 bg-emerald-50/40',
    dish: 'text-emerald-900',
  },
  lunch: {
    pill: 'bg-amber-100 text-amber-800',
    card: 'border-amber-200 bg-amber-50/40',
    dish: 'text-amber-900',
  },
  dinner: {
    pill: 'bg-sky-100 text-sky-700',
    card: 'border-sky-200 bg-sky-50/40',
    dish: 'text-sky-900',
  },
}

export function TodayView({
  meals,
  allocations,
}: {
  meals: Meal[]
  allocations: Allocation[]
}) {
  const today = new Date()
  const dateLabel = formatDateTime(today.toISOString())
  const slotMeals = (slot: MealSlot) =>
    meals.filter((m) => m.slot === slot)
  const [copied, setCopied] = useState(false)

  const text = useMemo(
    () => buildTodayText(meals, allocations, dateLabel),
    [meals, allocations, dateLabel],
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
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-700">Today</h3>
          <span className="text-xs text-slate-500">{dateLabel}</span>
        </div>
        <div className="group relative">
          <button
            type="button"
            aria-label="Copy today's meals"
            onClick={() => void copy()}
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
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
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
          >
            <div
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${SLOT_ACCENTS[slot].pill}`}
            >
              {SLOT_LABELS[slot]}
            </div>
            <div className="mt-2 space-y-2">
              {slotMeals(slot).length === 0 && (
                <p className="text-sm text-slate-400">No meal planned</p>
              )}
              {slotMeals(slot).map((meal) => (
                <div
                  key={meal.id}
                  className={`rounded-lg border p-2 text-sm ${
                    meal.cooked
                      ? 'border-slate-200 bg-slate-100'
                      : SLOT_ACCENTS[slot].card
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        meal.cooked
                          ? 'text-slate-400 line-through'
                          : SLOT_ACCENTS[slot].dish
                      }`}
                    >
                      {meal.name}
                    </span>
                    {meal.cooked && (
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Cooked
                      </span>
                    )}
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {mealAllocations(allocations, meal.id).map((a) => (
                      <li key={a.id} className="text-slate-600">
                        {a.items?.name ?? 'Unknown'}
                        <span className="text-slate-400">
                          {' '}
                          &middot; {fmtQty(a.quantity)} {a.unit}
                        </span>
                      </li>
                    ))}
                    {mealAllocations(allocations, meal.id).length === 0 && (
                      <li className="text-xs text-slate-400">
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

function buildTodayText(
  meals: Meal[],
  allocations: Allocation[],
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
      const allocs = mealAllocations(allocations, meal.id)
      if (allocs.length === 0) {
        lines.push('      No ingredients allocated')
      }
      for (const a of allocs) {
        lines.push(`      - ${a.items?.name ?? 'Unknown'}: ${fmtQty(a.quantity)} ${a.unit}`)
      }
    }
  }

  return lines.join('\n')
}