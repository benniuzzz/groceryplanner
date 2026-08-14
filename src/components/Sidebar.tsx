import { NAV_ITEMS, type Tab } from './nav'
import { navItemActive, navItemBase, navItemInactive } from './ui'
import type { Theme } from '../hooks/useTheme'
import { ThemeToggle } from './ThemeToggle'

export function Sidebar({
  active,
  onSelect,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  theme,
  onToggleTheme,
}: {
  active: Tab
  onSelect: (tab: Tab) => void
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  theme: Theme
  onToggleTheme: () => void
}) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 md:transition-[width] ${
          collapsed ? 'md:w-14' : 'md:w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`flex h-14 items-center gap-3 border-b border-slate-200 dark:border-slate-800 ${
            collapsed ? 'md:justify-center md:px-0' : ''
          } px-4`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 7h12a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
          </span>
          <h1
            className={`truncate text-lg font-bold text-emerald-700 dark:text-emerald-400 ${
              collapsed ? 'md:hidden' : ''
            }`}
          >
            Grocery Planner
          </h1>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active
            return (
              <button
                key={item.id}
                title={item.label}
                aria-label={item.label}
                onClick={() => {
                  onSelect(item.id)
                  onCloseMobile()
                }}
                className={`${navItemBase} ${
                  collapsed ? 'md:justify-center md:px-0' : ''
                } ${isActive ? navItemActive : navItemInactive}`}
              >
                {item.icon}
                <span
                  className={`inline ${
                    collapsed ? 'md:hidden' : ''
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} collapsed={collapsed} />

        <button
          onClick={onToggleCollapse}
          className="hidden items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:flex"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 shrink-0 transition-transform ${
              collapsed ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span className={collapsed ? 'md:hidden' : ''}>Collapse</span>
        </button>
      </aside>
    </>
  )
}