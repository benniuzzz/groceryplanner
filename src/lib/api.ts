import { supabase } from './supabase'
import type { Allocation, Item, Meal, MealSlot, StockEntry } from './types'

export async function fetchItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Item[]
}

export async function fetchStockEntries(): Promise<StockEntry[]> {
  const { data, error } = await supabase
    .from('stock_entries')
    .select('*, items(name)')
    .order('added_at', { ascending: false })
  if (error) throw error
  return data as StockEntry[]
}

export async function fetchMeals(): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .order('day', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Meal[]
}

export async function fetchAllocations(): Promise<Allocation[]> {
  const { data, error } = await supabase
    .from('allocations')
    .select('*, items(id, name)')
  if (error) throw error
  return data as Allocation[]
}

export interface NewGrocery {
  name: string
  quantity: number
  unit: string
  expiry_date: string | null
}

export async function addGroceries(rows: NewGrocery[]): Promise<void> {
  const itemIds = new Map<string, string>()
  for (const row of rows) {
    const key = row.name.trim().toLowerCase()
    if (!itemIds.has(key)) {
      const { data, error } = await supabase.rpc('get_or_create_item', {
        p_name: row.name.trim(),
      })
      if (error) throw error
      itemIds.set(key, data as string)
    }
  }
  const inserts = rows.map((r) => ({
    item_id: itemIds.get(r.name.trim().toLowerCase())!,
    quantity: r.quantity,
    unit: r.unit,
    expiry_date: r.expiry_date,
  }))
  const { error } = await supabase.from('stock_entries').insert(inserts)
  if (error) throw error
}

export async function deleteStockEntry(id: string): Promise<void> {
  const { error } = await supabase.from('stock_entries').delete().eq('id', id)
  if (error) throw error
}

export async function createMeal(
  name: string,
  day: number,
  slot: MealSlot,
): Promise<void> {
  const { error } = await supabase.from('meals').insert({ name, day, slot })
  if (error) throw error
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw error
}

export async function markCooked(id: string): Promise<void> {
  const { error } = await supabase.rpc('cook_meal', { p_meal_id: id })
  if (error) throw error
}

export async function markUncooked(id: string): Promise<void> {
  const { error } = await supabase.rpc('uncook_meal', { p_meal_id: id })
  if (error) throw error
}

export async function clearUncookedMeals(): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('cooked', false)
  if (error) throw error
}

export async function upsertAllocation(
  mealId: string,
  itemId: string,
  unit: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase
    .from('allocations')
    .upsert(
      { meal_id: mealId, item_id: itemId, unit, quantity },
      { onConflict: 'meal_id,item_id,unit' },
    )
  if (error) throw error
}

export async function deleteAllocation(id: string): Promise<void> {
  const { error } = await supabase.from('allocations').delete().eq('id', id)
  if (error) throw error
}
