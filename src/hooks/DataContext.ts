import { createContext } from 'react'
import type {
  AllowedItem,
  Allocation,
  Meal,
  MealUntracked,
  MealWishlist,
  Purchase,
  StockEntry,
  Unit,
} from '../lib/types'

export interface AppData {
  allowedItems: AllowedItem[]
  units: Unit[]
  entries: StockEntry[]
  purchases: Purchase[]
  meals: Meal[]
  allocations: Allocation[]
  wishlist: MealWishlist[]
  untracked: MealUntracked[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  run: (fn: () => Promise<void>) => Promise<boolean>
}

export const DataContext = createContext<AppData | null>(null)
