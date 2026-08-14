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
