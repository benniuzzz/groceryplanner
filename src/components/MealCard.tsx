import { useState } from 'react'
import type { Meal } from '../lib/types'
import { inputCls } from './ui'

export function MealCard({
  meal,
  allocationCount,
  wishlistCount,
  untrackedCount,
  canCook,
  selected,
  onSelect,
  onToggleCook,
  onDelete,
  onRename,
}: {
  meal: Meal
  allocationCount: number
  wishlistCount: number
  untrackedCount: number
  canCook: boolean
  selected: boolean
  onSelect: () => void
  onToggleCook: () => void
  onDelete: () => void
  onRename: (name: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')

  const startRename = () => {
    setEditName(meal.name)
    setEditing(true)
  }

  const submitRename = async () => {
    const name = editName.trim()
    if (!name || name === meal.name) {
      setEditing(false)
      return
    }
    const ok = await onRename(name)
    if (ok) setEditing(false)
  }

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
      {editing ? (
        <input
          autoFocus
          className={`${inputCls} w-full min-w-0 px-2 py-1`}
          value={editName}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submitRename()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <div className="flex items-center gap-1">
          <div className={`min-w-0 truncate font-medium ${meal.cooked ? 'line-through' : 'text-slate-800 dark:text-slate-100'}`}>
            {meal.name}
          </div>
          <button
            className="ml-auto shrink-0 text-xs text-slate-300 hover:text-emerald-600 dark:text-slate-600 dark:hover:text-emerald-400"
            onClick={(e) => {
              e.stopPropagation()
              startRename()
            }}
            title="Rename meal"
          >
            &#x270E;
          </button>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5">
          {wishlistCount > 0 && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {wishlistCount} to buy
            </span>
          )}
          {allocationCount > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {allocationCount} item{allocationCount === 1 ? '' : 's'}
            </span>
          )}
          {untrackedCount > 0 && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              {untrackedCount} other
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <button
            className={
              meal.cooked
                ? 'text-emerald-600 dark:text-emerald-400'
                : canCook
                  ? 'text-slate-300 hover:text-emerald-600 dark:text-slate-600 dark:hover:text-emerald-400'
                  : 'text-slate-200 dark:text-slate-700'
            }
            onClick={(e) => {
              e.stopPropagation()
              if (!meal.cooked && !canCook) return
              onToggleCook()
            }}
            disabled={!canCook && !meal.cooked}
            title={
              meal.cooked
                ? 'Uncook and restore stock'
                : canCook
                  ? 'Mark cooked'
                  : 'Buy all wishlist items first'
            }
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