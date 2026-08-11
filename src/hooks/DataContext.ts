import { createContext } from 'react'
import type { Allocation, Item, Meal, StockEntry } from '../lib/types'

export interface AppData {
  items: Item[]
  entries: StockEntry[]
  meals: Meal[]
  allocations: Allocation[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  run: (fn: () => Promise<void>) => Promise<boolean>
}

export const DataContext = createContext<AppData | null>(null)
