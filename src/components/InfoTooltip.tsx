export function InfoTooltip({
  text,
  label = 'More info',
}: {
  text: string
  label?: string
}) {
  return (
    <span className="group relative ml-1.5 inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="inline-flex rounded-full p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-64 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-center text-xs leading-snug text-white opacity-0 shadow-md transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-slate-700"
      >
        {text}
      </span>
    </span>
  )
}