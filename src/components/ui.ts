export const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900'

export const btnPrimary =
  'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'

export const btnSecondary =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

export const comboPanel =
  'absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900'

export const comboOption =
  'w-full cursor-pointer px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'

export const comboOptionActive =
  'w-full cursor-pointer px-3 py-2 text-left text-sm bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'

export const btnDanger =
  'rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950'

export const enterStagger = (index: number, step = 40, cap = 10) => ({
  animationDelay: `${Math.min(index, cap) * step}ms`,
})

export const navItemBase =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'

export const navItemActive =
  'bg-emerald-600 text-white hover:bg-emerald-600'

export const navItemInactive =
  'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
