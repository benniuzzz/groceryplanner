import type { Meal } from '../lib/types'

export function MealCard({
  meal,
  allocationCount,
  selected,
  onSelect,
  onCook,
  onDelete,
}: {
  meal: Meal
  allocationCount: number
  selected: boolean
  onSelect: () => void
  onCook: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-2 text-left text-sm transition-colors ${
        meal.cooked
          ? 'border-slate-200 bg-slate-100 text-slate-400'
          : selected
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-emerald-300'
      }`}
    >
      <div className={`font-medium ${meal.cooked ? 'line-through' : 'text-slate-800'}`}>
        {meal.name}
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        {meal.cooked ? (
          <span className="text-xs">Cooked</span>
        ) : (
          <button
            className="text-xs font-medium text-emerald-700 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              onCook()
            }}
          >
            Mark cooked
          </button>
        )}
        <span className="flex items-center gap-1.5">
          {allocationCount > 0 && (
            <span className="text-xs text-slate-400">
              {allocationCount} item{allocationCount === 1 ? '' : 's'}
            </span>
          )}
          <button
            className="text-xs text-slate-300 hover:text-red-600"
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
