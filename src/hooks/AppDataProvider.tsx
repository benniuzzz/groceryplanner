import { useCallback, useEffect, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import type {
  AllowedItem,
  Allocation,
  Item,
  Meal,
  MealUntracked,
  MealWishlist,
  StockEntry,
  Unit,
} from '../lib/types'
import { DataContext } from './DataContext'

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [allowedItems, setAllowedItems] = useState<AllowedItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [allEntries, setAllEntries] = useState<StockEntry[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [wishlist, setWishlist] = useState<MealWishlist[]>([])
  const [untracked, setUntracked] = useState<MealUntracked[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [
        allowedData,
        itemsData,
        unitsData,
        entriesData,
        mealsData,
        allocationsData,
        wishlistData,
        untrackedData,
      ] = await Promise.all([
        api.fetchAllowedItems(),
        api.fetchItems(),
        api.fetchUnits(),
        api.fetchStockEntries(true),
        api.fetchMeals(),
        api.fetchAllocations(),
        api.fetchMealWishlist(),
        api.fetchMealUntracked(),
      ])
      setAllowedItems(allowedData)
      setItems(itemsData)
      setUnits(unitsData)
      const active = entriesData.filter(
        (e) => e.deleted_at === null && e.consumed_at === null,
      )
      setEntries(active)
      setAllEntries(entriesData)
      setMeals(mealsData)
      setAllocations(allocationsData)
      setWishlist(wishlistData)
      setUntracked(untrackedData)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn()
        await refresh()
        return true
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Something went wrong')
        return false
      }
    },
    [refresh],
  )

  return (
    <DataContext.Provider
      value={{ allowedItems, items, units, entries, allEntries, meals, allocations, wishlist, untracked, loading, error, refresh, run }}
    >
      {children}
    </DataContext.Provider>
  )
}
