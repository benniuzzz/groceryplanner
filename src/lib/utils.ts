export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function fmtQty(n: number): string {
  return String(round2(n))
}

const costFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

export function fmtCost(n: number): string {
  return costFormatter.format(n)
}

export function formatTime12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  if (!Number.isFinite(h) || !mStr) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${mStr} ${period}`
}

export function mealDetailsLabel(meal: {
  meal_time: string | null
  people: number | null
}): string | null {
  const parts: string[] = []
  if (meal.meal_time) parts.push(formatTime12(meal.meal_time))
  if (meal.people != null) {
    parts.push(`${meal.people} ${meal.people === 1 ? 'person' : 'people'}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
