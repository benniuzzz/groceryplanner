import type { Meal } from '../lib/types'

export function MealCard({
  meal,
  allocationCount,
  selected,
  onSelect,
  onToggleCook,
  onDelete,
}: {
  meal: Meal
  allocationCount: number
  selected: boolean
  onSelect: () => void
  onToggleCook: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-2 text-left text-sm transition-colors ${
        meal.cooked
          ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
          : selected
            ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40'
            : 'border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700'
      }`}
    >
      <div className={`font-medium ${meal.cooked ? 'line-through' : 'text-slate-800 dark:text-slate-100'}`}>
        {meal.name}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5">
          {allocationCount > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {allocationCount} item{allocationCount === 1 ? '' : 's'}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <button
            className={
              meal.cooked
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-300 hover:text-emerald-600 dark:text-slate-600 dark:hover:text-emerald-400'
            }
            onClick={(e) => {
              e.stopPropagation()
              onToggleCook()
            }}
            title={meal.cooked ? 'Uncook and restore stock' : 'Mark cooked'}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <path
                d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
              />
            </svg>
          </button>
          <button
            className="text-xs text-slate-300 hover:text-red-600 dark:text-slate-600 dark:hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Delete meal"
          >
            &#x2715;
          </button>
        </span>
      </div>
    </div>
  )
}