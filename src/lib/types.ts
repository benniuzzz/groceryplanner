export interface Item {
  id: string
  name: string
  created_at: string
}

export interface StockEntry {
  id: string
  item_id: string
  quantity: number
  unit: string
  expiry_date: string | null
  cost: number | null
  added_at: string
  consumed_at: string | null
  deleted_at: string | null
  deleted_why: string | null
  items?: { name: string }
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export interface Meal {
  id: string
  name: string
  day: number
  slot: MealSlot
  cooked: boolean
  created_at: string
}

export interface Allocation {
  id: string
  meal_id: string
  item_id: string
  unit: string
  quantity: number
  items?: { id: string; name: string }
}

export interface InventoryRow {
  itemId: string
  name: string
  unit: string
  total: number
  allocated: number
  leftover: number
  earliestExpiry: string | null
  entries: StockEntry[]
}

export const UNITS = [
  'pcs',
  'kg',
  'g',
  'L',
  'ml',
  'cans',
  'packs',
  'boxes',
  'bags',
  'bunches',
  'other',
] as const

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}
