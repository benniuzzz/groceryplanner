import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import * as api from '../lib/api'
import type { Recipe } from '../lib/types'
import { DAYS, SLOT_LABELS, type MealSlot } from '../lib/types'
import { useAppData } from '../hooks/useAppData'
import { btnSecondary, inputCls } from './ui'

// Two-step chooser for "+ Add" in a planner cell: pick a saved recipe to plan
// into the cell, or fall through to the classic inline input for a brand-new
// meal (carrying any typed text over as the seed name).
export function RecipePickerModal({
  day,
  slot,
  onPick,
  onNewMeal,
  onClose,
}: {
  day: number
  slot: MealSlot
  onPick: (recipe: Recipe) => void
  onNewMeal: (seedName: string) => void
  onClose: () => void
}) {
  const { recipes } = useAppData()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, query])

  const ingredientCount = (r: Recipe) =>
    (r.recipe_ingredients?.length ?? 0) + (r.recipe_untracked?.length ?? 0)

  const seed = query.trim()

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="min-w-0 truncate text-base font-semibold text-slate-900 dark:text-slate-100">
            Add meal &middot; {DAYS[day]} {SLOT_LABELS[slot]}
          </h3>
          <button
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </div>

        <input
          autoFocus
          className={`${inputCls} mt-3 w-full px-2.5 py-2 text-sm`}
          placeholder="Search recipes…"
          aria-label="Search recipes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (filtered.length > 0) onPick(filtered[0])
              else if (seed !== '') onNewMeal(seed)
            }
            if (e.key === 'Escape') onClose()
          }}
        />

        <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <button
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-600"
                onClick={() => onPick(recipe)}
              >
                {recipe.photo_path ? (
                  <img
                    src={api.mealPhotoUrl(recipe.photo_path)}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-800 dark:text-slate-100">
                    {recipe.name}
                  </span>
                  <span className="block text-xs text-slate-400 dark:text-slate-500">
                    {ingredientCount(recipe)} ingredient
                    {ingredientCount(recipe) === 1 ? '' : 's'}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {recipes.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              No recipes saved yet — create a new meal below.
            </li>
          )}
          {recipes.length > 0 && filtered.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              No recipes match &ldquo;{seed}&rdquo;.
            </li>
          )}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Not reusing a recipe?
          </span>
          <button
            className={btnSecondary}
            onClick={() => onNewMeal(seed)}
          >
            + New meal{seed !== '' ? ` "${seed}"` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
