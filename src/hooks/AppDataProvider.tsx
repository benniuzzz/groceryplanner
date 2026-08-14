import { useCallback, useEffect, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import type { Allocation, Item, Meal, StockEntry } from '../lib/types'
import { DataContext } from './DataContext'

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [allEntries, setAllEntries] = useState<StockEntry[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [itemsData, entriesData, mealsData, allocationsData] =
        await Promise.all([
          api.fetchItems(),
          api.fetchStockEntries(true),
          api.fetchMeals(),
          api.fetchAllocations(),
        ])
      setItems(itemsData)
      const active = entriesData.filter(
        (e) => e.deleted_at === null && e.consumed_at === null,
      )
      setEntries(active)
      setAllEntries(entriesData)
      setMeals(mealsData)
      setAllocations(allocationsData)
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
      value={{ items, entries, allEntries, meals, allocations, loading, error, refresh, run }}
    >
      {children}
    </DataContext.Provider>
  )
}
