import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabase'
import { AppDataProvider } from './hooks/AppDataProvider'
import { useAppData } from './hooks/useAppData'
import { AddGroceriesView } from './components/AddGroceriesView'
import { InventoryView } from './components/InventoryView'
import { PlannerView } from './components/PlannerView'

type Tab = 'add' | 'inventory' | 'planner'

const TABS: { id: Tab; label: string }[] = [
  { id: 'add', label: 'Add Groceries' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'planner', label: 'Meal Planner' },
]

export default function App() {
  if (!isSupabaseConfigured) return <SetupScreen />
  return (
    <AppDataProvider>
      <Shell />
    </AppDataProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('add')
  const { loading, error } = useAppData()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
          <h1 className="text-xl font-bold text-emerald-700">Grocery Planner</h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            {tab === 'add' && <AddGroceriesView />}
            {tab === 'inventory' && <InventoryView />}
            {tab === 'planner' && <PlannerView />}
          </>
        )}
      </main>
    </div>
  )
}

function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-700">Grocery Planner</h1>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Connect your Supabase project
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            In your Supabase project, open the <b>SQL Editor</b>, paste the
            contents of <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code>{' '}
            from this project, and run it.
          </li>
          <li>
            Copy your <b>Project URL</b> and <b>publishable key</b> (starts with{' '}
            <code className="rounded bg-slate-100 px-1">sb_publishable_</code>).
            Get them from the <b>Connect</b> button in the dashboard.
          </li>
          <li>
            Fill them into <code className="rounded bg-slate-100 px-1">.env.local</code>:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
            </pre>
          </li>
          <li>Restart the dev server and reload this page.</li>
        </ol>
      </div>
    </div>
  )
}
