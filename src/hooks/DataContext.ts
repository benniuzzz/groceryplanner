import { createContext } from 'react'
import type {
  AllowedItem,
  Allocation,
  Item,
  Meal,
  MealWishlist,
  StockEntry,
} from '../lib/types'

export interface AppData {
  allowedItems: AllowedItem[]
  items: Item[]
  entries: StockEntry[]
  allEntries: StockEntry[]
  meals: Meal[]
  allocations: Allocation[]
  wishlist: MealWishlist[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  run: (fn: () => Promise<void>) => Promise<boolean>
}

export const DataContext = createContext<AppData | null>(null)
