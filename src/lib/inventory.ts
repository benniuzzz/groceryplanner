import { round2 } from './utils'
import type { Allocation, InventoryRow, Meal, StockEntry } from './types'

export function rowKey(row: { itemId: string; unit: string }): string {
  return `${row.itemId}|${row.unit}`
}

export function computeInventory(
  entries: StockEntry[],
  allocations: Allocation[],
  meals: Meal[],
): InventoryRow[] {
  const cookedMealIds = new Set(meals.filter((m) => m.cooked).map((m) => m.id))
  const rows = new Map<string, InventoryRow>()

  for (const entry of entries) {
    const key = `${entry.item_id}|${entry.unit}`
    let row = rows.get(key)
    if (!row) {
      row = {
        itemId: entry.item_id,
        name: entry.items?.name ?? 'Unknown',
        unit: entry.unit,
        total: 0,
        allocated: 0,
        leftover: 0,
        earliestExpiry: null,
        entries: [],
      }
      rows.set(key, row)
    }
    row.total += entry.quantity
    row.entries.push(entry)
    if (
      entry.expiry_date &&
      (!row.earliestExpiry || entry.expiry_date < row.earliestExpiry)
    ) {
      row.earliestExpiry = entry.expiry_date
    }
  }

  for (const alloc of allocations) {
    if (cookedMealIds.has(alloc.meal_id)) continue
    const row = rows.get(`${alloc.item_id}|${alloc.unit}`)
    if (row) row.allocated += alloc.quantity
  }

  const result = [...rows.values()]
  for (const row of result) {
    row.total = round2(row.total)
    row.allocated = round2(row.allocated)
    row.leftover = Math.max(0, round2(row.total - row.allocated))
    row.entries.sort((a, b) => {
      if (a.expiry_date && b.expiry_date)
        return a.expiry_date.localeCompare(b.expiry_date)
      if (a.expiry_date) return -1
      if (b.expiry_date) return 1
      return b.added_at.localeCompare(a.added_at)
    })
  }
  return result
}

export function sortByExpiryThenName<T extends { earliestExpiry: string | null; name: string }>(
  list: T[],
): T[] {
  return [...list].sort((a, b) => {
    if (!a.earliestExpiry && !b.earliestExpiry)
      return a.name.localeCompare(b.name)
    if (!a.earliestExpiry) return 1
    if (!b.earliestExpiry) return -1
    return a.earliestExpiry.localeCompare(b.earliestExpiry) || a.name.localeCompare(b.name)
  })
}
