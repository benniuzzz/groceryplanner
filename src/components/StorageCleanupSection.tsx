import { useState } from 'react'
import * as api from '../lib/api'
import { btnSecondary, enterStagger } from './ui'
import { InfoTooltip } from './InfoTooltip'

export function StorageCleanupSection() {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cleanup = async () => {
    if (busy) return
    if (
      !confirm(
        'Delete meal photos no longer attached to a meal? This frees up cloud storage and cannot be undone.',
      )
    )
      return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const removed = await api.cleanupOrphanedMealPhotos()
      setNotice(
        removed > 0
          ? `Deleted ${removed} orphaned photo${removed === 1 ? '' : 's'}.`
          : 'No orphaned photos found — storage is already clean.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cleanup failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="animate-fade-up" style={{ animationDelay: '300ms' }}>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Meal photo storage
        <InfoTooltip text="Recipe photos live in Supabase Storage and count towards your storage quota. This keeps the one photo each meal currently uses and deletes everything else in the bucket — leftovers from deleted meals and from uploads that were replaced or interrupted." />
      </h2>

      <div className="mt-4 space-y-4" style={enterStagger(1, 40, 10)}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Replacing or abandoning a photo can leave the old file in the cloud
          where nothing points at it any more. Removing those is safe: the photo
          a meal still displays is never touched.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => void cleanup()}
          >
            {busy ? 'Cleaning…' : 'Clean up orphaned photos'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {notice && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {notice}
          </p>
        )}
      </div>
    </section>
  )
}
