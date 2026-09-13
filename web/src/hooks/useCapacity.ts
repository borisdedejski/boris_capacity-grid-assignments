import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchCapacity } from '@/lib/capacity'

export const capacityKeys = {
  all: ['capacity'] as const,
  range: (from: string, to: string) => ['capacity', { from, to }] as const,
}

// useCapacity loads the grid for a range. While the user steps through weeks
// the previous range stays on screen until the new one arrives, so the grid
// never flashes empty.
export function useCapacity(from: string, to: string) {
  return useQuery({
    queryKey: capacityKeys.range(from, to),
    queryFn: () => fetchCapacity(from, to),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
