import { compressImage } from './image'
import { supabase, supabaseKey, supabaseUrl } from './supabase'
import type {
  AllowedItem,
  Allocation,
  Meal,
  MealSlot,
  MealUntracked,
  MealWishlist,
  Purchase,
  PushSettings,
  StockEntry,
  Unit,
} from './types'

export async function fetchAllowedItems(): Promise<AllowedItem[]> {
  const { data, error } = await supabase
    .from('allowed_items')
    .select('*')
    .order('name')
  if (error) throw error
  return data as AllowedItem[]
}

export async function addAllowedItem(
  name: string,
  unit: string,
): Promise<void> {
  const { error } = await supabase.from('allowed_items').insert({ name, unit })
  if (error) throw error
}

export async function updateAllowedItem(
  id: string,
  newName: string,
  newUnit: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('allowed_items')
    .select('name')
    .eq('id', id)
    .single()
  if (error) throw error
  const oldName = (data as { name: string }).name
  const { error: updateError } = await supabase
    .from('allowed_items')
    .update({ name: newName, unit: newUnit })
    .eq('id', id)
  if (updateError) throw updateError
  if (oldName !== newName) {
    const { error: renameError } = await supabase
      .from('items')
      .update({ name: newName })
      .ilike('name', oldName)
    if (renameError) throw renameError
  }
}

export async function removeAllowedItem(id: string): Promise<void> {
  const { error } = await supabase.from('allowed_items').delete().eq('id', id)
  if (error) throw error
}

export async function fetchUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Unit[]
}

export async function addUnit(name: string): Promise<void> {
  const { error } = await supabase.from('units').insert({ name })
  if (error) throw error
}

export async function updateUnit(id: string, newName: string): Promise<void> {
  const { data, error } = await supabase
    .from('units')
    .select('name')
    .eq('id', id)
    .single()
  if (error) throw error
  const oldName = (data as { name: string }).name
  if (oldName !== newName) {
    const { data: inUse, error: checkError } = await supabase.rpc('unit_in_use', {
      p_unit: oldName,
    })
    if (checkError) throw checkError
    if (inUse === true) {
      throw new Error(
        `"${oldName}" is in use on inventory or meals and cannot be renamed.`,
      )
    }
  }
  const { error: updateError } = await supabase
    .from('units')
    .update({ name: newName })
    .eq('id', id)
  if (updateError) throw updateError
}

export async function removeUnit(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('units')
    .select('name')
    .eq('id', id)
    .single()
  if (error) throw error
  const name = (data as { name: string }).name
  const { data: inUse, error: checkError } = await supabase.rpc('unit_in_use', {
    p_unit: name,
  })
  if (checkError) throw checkError
  if (inUse === true) {
    throw new Error(
      `"${name}" is in use on inventory or meals and cannot be deleted.`,
    )
  }
  const { error: deleteError } = await supabase
    .from('units')
    .delete()
    .eq('id', id)
  if (deleteError) throw deleteError
}

export async function fetchStockEntries(): Promise<StockEntry[]> {
  const { data, error } = await supabase
    .from('stock_entries')
    .select('*, items(name)')
    .is('deleted_at', null)
    .is('consumed_at', null)
    .order('added_at', { ascending: false })
  if (error) throw error
  return data as StockEntry[]
}

export async function fetchPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('purchased_at', { ascending: false })
  if (error) throw error
  return data as Purchase[]
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

export async function fetchMealWishlist(): Promise<MealWishlist[]> {
  const { data, error } = await supabase
    .from('meal_wishlist')
    .select('*, allowed_items(id, name, unit)')
  if (error) throw error
  return data as MealWishlist[]
}

export async function fetchMealUntracked(): Promise<MealUntracked[]> {
  const { data, error } = await supabase.from('meal_untracked').select('*')
  if (error) throw error
  return data as MealUntracked[]
}

export interface NewGrocery {
  name: string
  quantity: number
  unit: string
  expiry_date: string | null
  cost: number | null
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
    cost: r.cost,
  }))
  const { error } = await supabase.from('stock_entries').insert(inserts)
  if (error) throw error
}

export async function removeStock(id: string, qty: number): Promise<void> {
  const { error } = await supabase.rpc('remove_stock', {
    p_stock_entry_id: id,
    p_qty: qty,
  })
  if (error) throw error
}

export async function clearInventory(): Promise<void> {
  const { error } = await supabase.rpc('clear_inventory')
  if (error) throw error
}

export async function clearPurchases(): Promise<void> {
  const { error } = await supabase.rpc('clear_purchases')
  if (error) throw error
}

export async function createMeal(
  name: string,
  day: number,
  slot: MealSlot,
  mealTime?: string | null,
  people?: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('meals')
    .insert({ name, day, slot, meal_time: mealTime ?? null, people: people ?? null })
  if (error) throw error
}

export interface MealPatch {
  name?: string
  mealTime?: string | null
  people?: number | null
  recipeUrl?: string | null
  photoPath?: string | null
  remarks?: string | null
}

export async function updateMeal(id: string, patch: MealPatch): Promise<void> {
  const update: Record<string, string | number | null> = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.mealTime !== undefined) update.meal_time = patch.mealTime
  if (patch.people !== undefined) update.people = patch.people
  if (patch.recipeUrl !== undefined) update.recipe_url = patch.recipeUrl
  if (patch.photoPath !== undefined) update.photo_path = patch.photoPath
  if (patch.remarks !== undefined) update.remarks = patch.remarks
  const { error } = await supabase.from('meals').update(update).eq('id', id)
  if (error) throw error
}

const PHOTO_BUCKET = 'meal-photos'

// Compresses the picked/captured image client-side, uploads it to the public
// meal-photos bucket under the meal's id, and returns the object path to save
// on meals.photo_path.
export async function uploadMealPhoto(
  mealId: string,
  file: File,
): Promise<string> {
  const blob = await compressImage(file)
  const path = `${mealId}/${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  return path
}

export async function deleteMealPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path])
  if (error) throw error
}

export async function deleteMealPhotos(
  paths: (string | null | undefined)[],
): Promise<void> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  await removePhotoPaths(unique)
}

export function mealPhotoUrl(path: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

async function listPhotoEntries(
  prefix: string,
): Promise<{ name: string; id: string | null }[]> {
  const entries: { name: string; id: string | null }[] = []
  const limit = 1000
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list(prefix, { limit, offset })
    if (error) throw error
    const page = data ?? []
    entries.push(...page)
    if (page.length < limit) break
  }
  return entries
}

async function removePhotoPaths(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  if (error) throw error
  return paths.length
}

// Deletes every object in the bucket except the photo each meal currently
// points at. Two cases matter: folders belonging to deleted meals (nothing
// references them), and superseded uploads inside the folder of a LIVE meal —
// an interrupted or failed photo replace leaves the previous file behind, and
// because uploads are timestamped they never overwrite each other, so those
// orphans would otherwise pile up invisibly forever.
export async function cleanupOrphanedMealPhotos(): Promise<number> {
  const { data: mealRows, error: mealError } = await supabase
    .from('meals')
    .select('id, photo_path')
  if (mealError) throw mealError
  const referenced = new Map(
    (mealRows as { id: string; photo_path: string | null }[]).map((m) => [
      m.id,
      m.photo_path,
    ]),
  )

  const root = await listPhotoEntries('')
  const strayFiles = root.filter((e) => e.id !== null).map((e) => e.name)
  const folders = root.filter((e) => e.id === null).map((e) => e.name)

  let removed = await removePhotoPaths(strayFiles)
  for (const folder of folders) {
    const keep = referenced.get(folder) ?? null
    const inside = await listPhotoEntries(folder)
    removed += await removePhotoPaths(
      inside
        .filter((e) => e.id !== null)
        .map((e) => `${folder}/${e.name}`)
        .filter((p) => p !== keep),
    )
  }
  return removed
}

export async function deleteMeal(
  id: string,
  photoPath?: string | null,
): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw error
  await deleteMealPhotos([photoPath])
}

export async function markCooked(id: string): Promise<void> {
  const { error } = await supabase.rpc('cook_meal', { p_meal_id: id })
  if (error) throw error
}

export async function markUncooked(id: string): Promise<void> {
  const { error } = await supabase.rpc('uncook_meal', { p_meal_id: id })
  if (error) throw error
}

export async function clearUncookedMeals(
  photoPaths: (string | null)[] = [],
): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('cooked', false)
  if (error) throw error
  await deleteMealPhotos(photoPaths)
}

export async function clearCookedMeals(
  photoPaths: (string | null)[] = [],
): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('cooked', true)
  if (error) throw error
  await deleteMealPhotos(photoPaths)
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

export async function upsertWishlistAllocation(
  mealId: string,
  allowedItemId: string,
  unit: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase
    .from('meal_wishlist')
    .upsert(
      { meal_id: mealId, allowed_item_id: allowedItemId, unit, quantity },
      { onConflict: 'meal_id,allowed_item_id,unit' },
    )
  if (error) throw error
}

export async function deleteWishlistAllocation(id: string): Promise<void> {
  const { error } = await supabase.from('meal_wishlist').delete().eq('id', id)
  if (error) throw error
}

export async function addToToBuyList(
  allowedItemId: string,
  unit: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase
    .from('meal_wishlist')
    .upsert(
      { meal_id: null, allowed_item_id: allowedItemId, unit, quantity },
      { onConflict: 'meal_id,allowed_item_id,unit' },
    )
  if (error) throw error
}

export async function upsertUntrackedIngredient(
  mealId: string,
  name: string,
  unit: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase
    .from('meal_untracked')
    .upsert(
      { meal_id: mealId, name, unit, quantity },
      { onConflict: 'meal_id,name,unit' },
    )
  if (error) throw error
}

export async function deleteUntrackedIngredient(id: string): Promise<void> {
  const { error } = await supabase.from('meal_untracked').delete().eq('id', id)
  if (error) throw error
}

export async function purchaseWishlist(
  ids: string[],
  qtys: number[],
  expiryDate: string | null,
  cost: number | null,
): Promise<void> {
  const { error } = await supabase.rpc('purchase_wishlist', {
    p_ids: ids,
    p_qtys: qtys,
    p_expiry: expiryDate,
    p_cost: cost,
  })
  if (error) throw error
}

export async function fetchPushSettings(): Promise<PushSettings> {
  const { data, error } = await supabase
    .from('push_settings')
    .select('enabled, time, timezone, last_sent_on')
    .eq('id', true)
    .single()
  if (error) throw error
  return data as PushSettings
}

export async function savePushSettings(
  settings: Pick<PushSettings, 'enabled' | 'time' | 'timezone'>,
): Promise<void> {
  const { error } = await supabase
    .from('push_settings')
    .update(settings)
    .eq('id', true)
  if (error) throw error
}

export async function upsertPushSubscription(sub: {
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string
}): Promise<void> {
  // last_seen_at is refreshed on every (re-)register — push services rotate
  // endpoint URLs, so this is what lets run_maintenance() tell a device that
  // still opens the app apart from one whose endpoint was abandoned.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ ...sub, last_seen_at: new Date().toISOString() }, {
      onConflict: 'endpoint',
    })
  if (error) throw error
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
  if (error) throw error
}

// Forgets every device, not just this one. Needed because a household that
// re-installs browsers or stops using the app has no way to clear the rows the
// old endpoints left behind.
export async function deleteAllPushSubscriptions(): Promise<number> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .delete()
    .not('endpoint', 'is', null)
    .select('endpoint')
  if (error) throw error
  return (data as { endpoint: string }[]).length
}

export async function countPushSubscriptions(): Promise<number> {
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function sendTestPush(): Promise<{ sent: number }> {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-meal-push`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ force: true }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    sent?: number
    error?: string
  }
  if (!res.ok || json.error) {
    throw new Error(json.error ?? `Push function failed (HTTP ${res.status})`)
  }
  return { sent: json.sent ?? 0 }
}
