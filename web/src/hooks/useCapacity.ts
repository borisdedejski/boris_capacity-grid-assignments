import { useEffect } from 'react'
import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCapacity } from '@/lib/capacity'
import { addDays, mondayOf } from '@/lib/dates'

export const capacityKeys = {
  all: ['capacity'] as const,
  range: (from: string, to: string) => ['capacity', { from, to }] as const,
}

// A range is keyed by the whole weeks it covers, the same widening the API
// does, so two ranges that load the same weeks share one cache entry.
export function capacityQueryOptions(from: string, to: string) {
  const start = mondayOf(from)
  const end = addDays(mondayOf(to), 6)
  return queryOptions({
    queryKey: capacityKeys.range(start, end),
    queryFn: () => fetchCapacity(start, end),
    // Edits made here patch the cache directly, so a loaded range can stay
    // fresh for a while; stepping back to it is instant and sends nothing.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })
}

// useCapacity loads the grid for a range. The previous range stays on screen
// until the new one arrives, and once it has, the week before and after are
// fetched in the background so the next step either way is already cached.
export function useCapacity(from: string, to: string) {
  const queryClient = useQueryClient()
  const query = useQuery({ ...capacityQueryOptions(from, to), placeholderData: keepPreviousData })

  const settled = query.data !== undefined && !query.isPlaceholderData
  useEffect(() => {
    if (!settled) return
    for (const days of [-7, 7]) {
      void queryClient.prefetchQuery(capacityQueryOptions(addDays(from, days), addDays(to, days)))
    }
  }, [settled, from, to, queryClient])

  return query
}
