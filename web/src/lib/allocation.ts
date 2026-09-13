import type { PersonCapacity } from './capacity'

// How one week compares to capacity. With no capacity at all, any allocation
// is over: there is no ratio to show.
export type AllocationStatus = 'empty' | 'under' | 'full' | 'over'

export function allocationStatus(allocated: number, capacity: number): AllocationStatus {
  if (allocated > capacity) return 'over'
  if (allocated === 0) return 'empty'
  if (allocated === capacity) return 'full'
  return 'under'
}

// utilization is allocated / capacity, or null when capacity is 0.
export function utilization(allocated: number, capacity: number): number | null {
  return capacity > 0 ? allocated / capacity : null
}

// peakUtilization is the busiest week in the range, as a ratio. Infinity means
// hours are allocated against no capacity at all; 0 means nothing scheduled.
export function peakUtilization(person: PersonCapacity): number {
  const max = Math.max(0, ...person.allocated)
  if (max === 0) return 0
  return person.weeklyHours > 0 ? max / person.weeklyHours : Infinity
}

export function isOverAllocated(person: PersonCapacity): boolean {
  return person.allocated.some((h) => h > person.weeklyHours)
}

export function formatHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1).replace(/\.0$/, '')
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null) return '—'
  if (!Number.isFinite(ratio)) return '∞'
  return `${Math.round(ratio * 100)}%`
}
