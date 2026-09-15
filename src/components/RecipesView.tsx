import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useAppData } from '../hooks/useAppData'
import { InfoTooltip } from './InfoTooltip'
import { RecipeModal } from './RecipeModal'
import { btnPrimary, enterStagger, inputCls } from './ui'

export function RecipesView() {
  const { recipes, refresh } = useAppData()
  const [query, setQuery] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, query])

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) ?? null

  const createRecipe = async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const id = await api.createRecipe(name)
      await refresh()
      setNewName('')
      // Jump straight into the new recipe so ingredients/extras can be added.
      setSelectedRecipeId(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  const ingNames = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId)
    return [
      ...(recipe?.recipe_ingredients ?? []).map(
        (i) => i.allowed_items?.name ?? 'Unknown',
      ),
      ...(recipe?.recipe_untracked ?? []).map((u) => u.name),
    ]
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="animate-fade-up flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recipes
            <InfoTooltip text="Saved meals you can reuse: plan one into any planner slot and its ingredients are filled in automatically. Recipes stay here until you delete them." />
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="search"
              className={`${inputCls} w-44 px-2.5 py-1.5 text-sm sm:w-60`}
              placeholder="Search recipes…"
              aria-label="Search recipes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="animate-fade-up mt-3 flex items-center gap-2" style={{ animationDelay: '60ms' }}>
          <input
            className={`${inputCls} max-w-md flex-1 px-2.5 py-1.5 text-sm`}
            placeholder="New recipe name…"
            aria-label="New recipe name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void createRecipe()
              if (e.key === 'Escape') setNewName('')
            }}
          />
          <button
            className={btnPrimary}
            disabled={creating || !newName.trim()}
            onClick={() => void createRecipe()}
          >
            {creating ? 'Creating…' : '+ New recipe'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((recipe, i) => {
            const names = ingNames(recipe.id)
            const preview = names.slice(0, 3).join(' · ')
            return (
              <div
                key={recipe.id}
                onClick={() => setSelectedRecipeId(recipe.id)}
                className={`animate-fade-up cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-colors hover:border-emerald-400 dark:bg-slate-900 ${
                  recipe.id === selectedRecipeId
                    ? 'border-emerald-500 dark:border-emerald-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
                style={enterStagger(i, 30, 10)}
              >
                <div className="flex items-start gap-3">
                  {recipe.photo_path ? (
                    <a
                      href={api.mealPhotoUrl(recipe.photo_path)}
                      target="_blank"
                      rel="noreferrer"
                      title="Open full size"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={api.mealPhotoUrl(recipe.photo_path)}
                        alt={`Recipe photo for ${recipe.name}`}
                        className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                      />
                    </a>
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {recipe.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      <span>
                        {names.length} ingredient{names.length === 1 ? '' : 's'}
                      </span>
                      {recipe.recipe_url && (
                        <a
                          href={recipe.recipe_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Open recipe link"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                        </a>
                      )}
                      {recipe.remarks && (
                        <span title={recipe.remarks} className="shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                            <path d="M16 13H8" />
                            <path d="M16 17H8" />
                          </svg>
                        </span>
                      )}
                    </div>
                    {preview !== '' && (
                      <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={names.join(' · ')}>
                        {preview}
                        {names.length > 3 ? ` · +${names.length - 3}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            {recipes.length === 0
              ? 'No recipes yet. Create one above, or open a meal in the Meal Planner and tap the bookmark to save it here.'
              : 'No recipes match your search.'}
          </div>
        )}
      </section>

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipeId(null)}
        />
      )}
    </div>
  )
}
