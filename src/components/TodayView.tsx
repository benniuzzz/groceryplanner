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
  const slotMeals = (slot: MealSlot) =>
    meals.filter((m) => m.slot === slot)

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-emerald-600" />
        <h3 className="text-sm font-semibold text-emerald-700">Today</h3>
        <span className="text-xs text-slate-500">{formatDateTime(today.toISOString())}</span>
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