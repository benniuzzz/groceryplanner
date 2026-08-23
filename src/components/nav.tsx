import type { ReactNode } from 'react'

export type Tab = 'groceries' | 'planner' | 'settings'

interface NavItem {
  id: Tab
  label: string
  icon: ReactNode
}

const iconCls = 'h-5 w-5 shrink-0'

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'groceries',
    label: 'Groceries',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
        <path d="M6 7h12a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    ),
  },
  {
    id: 'planner',
    label: 'Meal Planner',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={iconCls} aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
]