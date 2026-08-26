import type { Theme } from '../hooks/useTheme'

function SunIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  )
}

export function ThemeToggle({
  theme,
  onToggle,
  collapsed = false,
}: {
  theme: Theme
  onToggle: () => void
  collapsed?: boolean
}) {
  const dark = theme === 'dark'
  return (
    <>
      <div className={`px-4 py-2 ${collapsed ? 'md:hidden' : ''}`}>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          onClick={onToggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`relative h-8 w-[60px] shrink-0 rounded-full shadow-md transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            dark ? 'bg-white' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute left-1 top-1 block h-6 w-6 rounded-full transition-transform duration-300 ease-in-out ${
              dark ? 'translate-x-7 bg-slate-950' : 'translate-x-0 bg-white'
            }`}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center text-slate-800 transition-all duration-300 ${
                dark ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
              }`}
            >
              <SunIcon />
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center text-white transition-all duration-300 ${
                dark ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
              }`}
            >
              <MoonIcon />
            </span>
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={onToggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`hidden w-full items-center justify-center rounded-lg px-4 py-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
          collapsed ? 'md:flex' : 'md:hidden'
        }`}
      >
        {dark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
      </button>
    </>
  )
}
