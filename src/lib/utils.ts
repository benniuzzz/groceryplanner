export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function fmtQty(n: number): string {
  return String(round2(n))
}
