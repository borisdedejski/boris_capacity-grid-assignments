import { create } from 'zustand'
import { addDays, mondayOf, today } from '@/lib/dates'

// The date range the team overview shows, as YYYY-MM-DD. It lives in a store
// rather than in one component because the logged-time timeline will sit next to
// the capacity grid and follow the same range. Screen state only: server data
// belongs to TanStack Query.
type RangeState = {
  from: string
  to: string
  setRange: (from: string, to: string) => void
  // setWeeks sets a range of whole weeks starting at the Monday of `from`.
  setWeeks: (from: string, weeks: number) => void
  // shiftWeeks moves the whole range by a number of weeks, keeping its length.
  shiftWeeks: (weeks: number) => void
}

export const DEFAULT_WEEKS = 4

export const useRangeStore = create<RangeState>()((set) => ({
  // Opens on the current week, four weeks ahead: the horizon a manager plans on.
  from: mondayOf(today()),
  to: addDays(mondayOf(today()), 7 * DEFAULT_WEEKS - 1),
  setRange: (from, to) => set({ from, to }),
  setWeeks: (from, weeks) => {
    const monday = mondayOf(from)
    set({ from: monday, to: addDays(monday, 7 * weeks - 1) })
  },
  shiftWeeks: (weeks) =>
    set((s) => ({ from: addDays(s.from, 7 * weeks), to: addDays(s.to, 7 * weeks) })),
}))
