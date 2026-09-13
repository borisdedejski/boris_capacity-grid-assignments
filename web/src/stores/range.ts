import { create } from 'zustand'

// The date range the team overview shows, as YYYY-MM-DD. It lives in a store
// rather than in one component because the logged-time timeline will sit next to
// the capacity grid and follow the same range. Screen state only: server data
// belongs to TanStack Query.
type RangeState = {
  from: string
  to: string
  setRange: (from: string, to: string) => void
}

export const useRangeStore = create<RangeState>()((set) => ({
  // The range the grid loads first. Widen it if you want to see more.
  from: '2025-12-29',
  to: '2026-01-16',
  setRange: (from, to) => set({ from, to }),
}))
