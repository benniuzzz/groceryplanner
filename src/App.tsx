import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabase'
import { AppDataProvider } from './hooks/AppDataProvider'
import { useAppData } from './hooks/useAppData'
import { AddGroceriesView } from './components/AddGroceriesView'
import { InventoryView } from './components/InventoryView'
import { PlannerView } from './components/PlannerView'
import { Sidebar } from './components/Sidebar'
import type { Tab } from './components/nav'

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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const { loading, error } = useAppData()

  const toggleCollapse = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      } catch {
        // ignore storage failures (e.g. blocked storage)
      }
      return next
    })
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        active={tab}
        onSelect={setTab}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg px-1.5 py-1 text-slate-600 hover:bg-slate-100"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-emerald-700">Grocery Planner</h1>
        </div>

        <main className="flex-1 px-4 py-6 lg:px-8">
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
