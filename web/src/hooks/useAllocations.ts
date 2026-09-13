import { useQuery } from '@tanstack/react-query'
import { fetchAllocations } from '@/lib/allocations'

// useAllocations is the drill-down behind a grid cell. Allocations don't
// change from this UI, so a week stays fresh for a while once loaded.
export function useAllocations(personId: number, week: string) {
  return useQuery({
    queryKey: ['allocations', personId, week] as const,
    queryFn: () => fetchAllocations(personId, week),
    staleTime: 5 * 60_000,
  })
}
