import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as api from '../lib/api'
import type { Recipe } from '../lib/types'
import { fmtQty } from '../lib/utils'
import { useAppData } from '../hooks/useAppData'
import { ItemCombobox } from './ItemCombobox'
import { InfoTooltip } from './InfoTooltip'
import { UnitSelect } from './UnitSelect'
import PhotoViewer from './PhotoViewer'
import { btnDanger, btnIconDanger, btnPrimary, btnSecondary, inputCls } from './ui'

// Deleting a photo only ever reclaims space, so a failed delete must not undo
// or contradict a database write that already succeeded. Anything left behind
// is picked up by Settings → "Clean up orphaned photos".
async function removePhotoQuietly(path: string): Promise<void> {
  try {
    await api.deleteMealPhoto(path)
  } catch {
    // best-effort; the sweep is the backstop
  }
}

export function RecipeModal({
  recipe,
  onClose,
}: {
  recipe: Recipe
  onClose: () => void
}) {
  const { allowedItems, units, run } = useAppData()
  const [ingSelectedId, setIngSelectedId] = useState('')
  const [ingQty, setIngQty] = useState('')
  const [ingError, setIngError] = useState<string | null>(null)
  const [unName, setUnName] = useState('')
  const [unUnit, setUnUnit] = useState('')
  const [unQty, setUnQty] = useState('')
  const [unError, setUnError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [urlDraft, setUrlDraft] = useState(recipe.recipe_url ?? '')
  const [remarksDraft, setRemarksDraft] = useState(recipe.remarks ?? '')
  const [uploading, setUploading] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showIngForm, setShowIngForm] = useState(false)
  const [showUnForm, setShowUnForm] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => {
    if (!unUnit && units.length > 0) setUnUnit(units[0].name)
  }, [units, unUnit])

  const ingredients = recipe.recipe_ingredients ?? []
  const others = recipe.recipe_untracked ?? []

  const ingOptions = useMemo(
    () => [...allowedItems].sort((a, b) => a.name.localeCompare(b.name)),
    [allowedItems],
  )

  const addIngredient = async () => {
    const item = allowedItems.find((i) => i.id === ingSelectedId)
    const q = Number(ingQty)
    if (!item || !(q > 0)) {
      setIngError('Choose a grocery and enter a quantity above 0.')
      return
    }
    const ok = await run(() =>
      api.upsertRecipeIngredient(recipe.id, item.id, item.unit, q),
    )
    if (ok) {
      setIngQty('')
      setIngError(null)
    }
  }

  const addUntracked = async () => {
    const name = unName.trim()
    const q = Number(unQty)
    if (!name || !(q > 0)) {
      setUnError('Enter an ingredient name and a quantity above 0.')
      return
    }
    if (!unUnit) {
      setUnError('Pick a unit — add one in Settings.')
      return
    }
    const ok = await run(() =>
      api.upsertRecipeUntracked(recipe.id, name, unUnit, q),
    )
    if (ok) {
      setUnName('')
      setUnQty('')
      setUnUnit(units[0]?.name ?? '')
      setUnError(null)
    }
  }

  const submitRename = async () => {
    const name = nameDraft.trim()
    if (!name || name === recipe.name) {
      setEditingName(false)
      return
    }
    const ok = await run(() => api.updateRecipe(recipe.id, { name }))
    if (ok) setEditingName(false)
  }

  const saveRecipeUrl = async () => {
    const next = urlDraft.trim() !== '' ? urlDraft.trim() : null
    if (next === (recipe.recipe_url ?? null)) return
    await run(() => api.updateRecipe(recipe.id, { recipeUrl: next }))
  }

  const saveRemarks = async () => {
    const next = remarksDraft.trim() !== '' ? remarksDraft.trim() : null
    if (next === (recipe.remarks ?? null)) return
    await run(() => api.updateRecipe(recipe.id, { remarks: next }))
  }

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file || uploading) return
    setUploading(true)
    try {
      const path = await api.uploadPhoto(recipe.id, file)
      const oldPath = recipe.photo_path
      // Commit the path to the row first: while the recipe points at the new
      // photo, losing the old one to a failed delete is only a storage
      // orphan, whereas losing the new one would break the recipe.
      const saved = await run(() => api.updateRecipe(recipe.id, { photoPath: path }))
      if (!saved) {
        // Nothing references this upload, so it is unreachable already.
        await removePhotoQuietly(path)
        return
      }
      if (oldPath && oldPath !== path) await removePhotoQuietly(oldPath)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Photo upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = async () => {
    const path = recipe.photo_path
    if (!path) return
    await run(async () => {
      await api.updateRecipe(recipe.id, { photoPath: null })
      await api.deleteMealPhoto(path)
    })
  }

  const deleteRecipe = async () => {
    if (!confirm(`Delete recipe "${recipe.name}"?`)) return
    const ok = await run(() => api.deleteRecipe(recipe.id, recipe.photo_path))
    if (ok) onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                className={`${inputCls} w-full px-2 py-1 text-lg font-semibold`}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitRename()
                  if (e.key === 'Escape') setEditingName(false)
                }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <h3 className="min-w-0 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{recipe.name}</h3>
                <InfoTooltip text="Reusable meal template. Plan it into a week slot from the Meal Planner — ingredients in stock are reserved there, the rest joins its to-buy list." />
                <button
                  className="shrink-0 rounded px-1 py-0.5 text-sm text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                  onClick={() => {
                    setNameDraft(recipe.name)
                    setEditingName(true)
                  }}
                  title="Rename recipe"
                >
                  &#x270E;
                </button>
              </div>
            )}
          </div>
          <button
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </div>

        <section className="mt-5">
          <div className="flex items-center">
            <h4 className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              Recipe
            </h4>
            <InfoTooltip text="Optional extras: a link to the recipe, a photo of it (camera or upload), and free-form remarks." />
          </div>
          <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Recipe link</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  aria-label="Recipe URL"
                  className={`${inputCls} min-w-0 flex-1 px-2 py-1.5 text-sm`}
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onBlur={() => void saveRecipeUrl()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
                {recipe.recipe_url && (
                  <a
                    href={recipe.recipe_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Open &#x2197;
                  </a>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Photo</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {recipe.photo_path && (
                  <button
                    type="button"
                    title="View full size"
                    onClick={() => setViewerOpen(true)}
                    className="cursor-zoom-in"
                  >
                    <img
                      src={api.mealPhotoUrl(recipe.photo_path)}
                      alt={`Recipe photo for ${recipe.name}`}
                      className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                    />
                  </button>
                )}
                <button
                  type="button"
                  className={`${btnPrimary} px-3 py-1.5 text-xs`}
                  disabled={uploading}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Take photo
                </button>
                <button
                  type="button"
                  className={`${btnSecondary} px-3 py-1.5 text-xs`}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload
                </button>
                {recipe.photo_path && (
                  <button
                    type="button"
                    className={btnIconDanger}
                    disabled={uploading}
                    title="Remove photo"
                    aria-label="Remove photo"
                    onClick={() => void removePhoto()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M19 6l-1.5 14.1A2 2 0 0 1 15.5 22h-7a2 2 0 0 1-2-1.9L5 6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                )}
                {uploading && (
                  <span className="text-sm text-slate-400 dark:text-slate-500">Uploading…</span>
                )}
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void handlePhotoFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handlePhotoFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Remarks</span>
              <textarea
                rows={2}
                placeholder="Anything worth remembering about this meal…"
                aria-label="Remarks"
                className={`${inputCls} mt-1 w-full resize-y px-2 py-1.5 text-sm`}
                value={remarksDraft}
                onChange={(e) => setRemarksDraft(e.target.value)}
                onBlur={() => void saveRemarks()}
              />
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center">
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Ingredients
            </h4>
            <InfoTooltip text="Groceries from your configured list. When a meal is planned from this recipe, whatever is in stock is reserved for the meal and the rest is added to its to-buy list." />
            <button
              type="button"
              aria-label="Add ingredient"
              title={showIngForm ? 'Hide form' : 'Add ingredient'}
              onClick={() => setShowIngForm((v) => !v)}
              className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {ingredients.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                No configured ingredients yet.
              </li>
            )}
            {ingredients.map((ing) => (
              <li
                key={ing.id}
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {ing.allowed_items?.name ?? 'Unknown'}
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    {' '}
                    &middot; {fmtQty(ing.quantity)} {ing.unit}
                  </span>
                </span>
                <button
                  type="button"
                  className={btnIconDanger}
                  title={`Remove ${ing.allowed_items?.name ?? 'item'} from the recipe`}
                  aria-label={`Remove ${ing.allowed_items?.name ?? 'item'} from the recipe`}
                  onClick={() => void run(() => api.deleteRecipeIngredient(ing.id))}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M19 6l-1.5 14.1A2 2 0 0 1 15.5 22h-7a2 2 0 0 1-2-1.9L5 6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          {showIngForm && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[180px] flex-1">
                  <ItemCombobox
                    options={ingOptions}
                    value={ingSelectedId}
                    onChange={(id) => {
                      setIngSelectedId(id)
                      setIngError(null)
                    }}
                    placeholder="Choose a grocery…"
                  />
                </div>
                <input
                  className={`${inputCls} w-24`}
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Qty"
                  value={ingQty}
                  onChange={(e) => {
                    setIngQty(e.target.value)
                    setIngError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addIngredient()
                  }}
                />
                <button className={btnPrimary} onClick={() => void addIngredient()}>
                  Add
                </button>
              </div>
              {ingError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{ingError}</p>
              )}
              {ingOptions.length === 0 && ingredients.length === 0 && (
                <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                  No groceries configured yet. Add the items you want to buy in{' '}
                  <em>Settings</em>.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Other ingredients
            </h4>
            <InfoTooltip text="Free-text ingredients that aren't tracked in inventory or the configured list. Planned meals get them as 'Other ingredients'." />
            <button
              type="button"
              aria-label="Add other ingredient"
              title={showUnForm ? 'Hide form' : 'Add other ingredient'}
              onClick={() => setShowUnForm((v) => !v)}
              className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {others.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                No other ingredients added.
              </li>
            )}
            {others.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {u.name}
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    {' '}
                    &middot; {fmtQty(u.quantity)} {u.unit}
                  </span>
                </span>
                <button
                  type="button"
                  className={btnIconDanger}
                  title={`Remove ${u.name} from other ingredients`}
                  aria-label={`Remove ${u.name} from other ingredients`}
                  onClick={() => void run(() => api.deleteRecipeUntracked(u.id))}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M19 6l-1.5 14.1A2 2 0 0 1 15.5 22h-7a2 2 0 0 1-2-1.9L5 6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          {showUnForm && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputCls} min-w-[180px] flex-1`}
                  type="text"
                  placeholder="Ingredient name…"
                  value={unName}
                  onChange={(e) => {
                    setUnName(e.target.value)
                    setUnError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addUntracked()
                  }}
                />
                <UnitSelect
                  value={unUnit}
                  className="w-24"
                  onChange={(v) => {
                    setUnUnit(v)
                    setUnError(null)
                  }}
                  ariaLabel="Unit"
                />
                <input
                  className={`${inputCls} w-24`}
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Qty"
                  value={unQty}
                  onChange={(e) => {
                    setUnQty(e.target.value)
                    setUnError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addUntracked()
                  }}
                />
                <button className={btnPrimary} onClick={() => void addUntracked()}>
                  Add
                </button>
              </div>
              {unError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{unError}</p>
              )}
            </div>
          )}
        </section>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            className={btnDanger}
            onClick={() => void deleteRecipe()}
          >
            Delete recipe
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      {viewerOpen && recipe.photo_path && (
        <PhotoViewer
          src={api.mealPhotoUrl(recipe.photo_path)}
          alt={`Recipe photo for ${recipe.name}`}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>,
    document.body,
  )
}
