import { useCallback, useEffect, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import type {
  AllowedItem,
  Allocation,
  Meal,
  MealUntracked,
  MealWishlist,
  Purchase,
  Recipe,
  StockEntry,
  Unit,
} from '../lib/types'
import { DataContext } from './DataContext'

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [allowedItems, setAllowedItems] = useState<AllowedItem[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [wishlist, setWishlist] = useState<MealWishlist[]>([])
  const [untracked, setUntracked] = useState<MealUntracked[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [
        allowedData,
        unitsData,
        entriesData,
        purchasesData,
        mealsData,
        allocationsData,
        wishlistData,
        untrackedData,
        recipesData,
      ] = await Promise.all([
        api.fetchAllowedItems(),
        api.fetchUnits(),
        api.fetchStockEntries(),
        api.fetchPurchases(),
        api.fetchMeals(),
        api.fetchAllocations(),
        api.fetchMealWishlist(),
        api.fetchMealUntracked(),
        api.fetchRecipes(),
      ])
      setAllowedItems(allowedData)
      setUnits(unitsData)
      setEntries(entriesData)
      setPurchases(purchasesData)
      setMeals(mealsData)
      setAllocations(allocationsData)
      setWishlist(wishlistData)
      setUntracked(untrackedData)
      setRecipes(recipesData)
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
        value={{ allowedItems, units, entries, purchases, meals, allocations, wishlist, untracked, recipes, loading, error, refresh, run }}
    >
      {children}
    </DataContext.Provider>
  )
}
