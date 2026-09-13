import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CapacityResponse } from '@/lib/capacity'
import { updatePersonHours } from '@/lib/people'
import { capacityKeys } from './useCapacity'

// useUpdatePersonHours saves a person's weekly hours and then patches every
// cached capacity range with the person the API returned. Nothing is refetched:
// allocations don't depend on weekly hours, and capacity for every week is
// weeklyHours, so the returned person is enough to keep every cell correct.
// Not optimistic on purpose: the request takes milliseconds and a rollback
// path would be more code than it saves.
export function useUpdatePersonHours() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, weeklyHours }: { id: number; weeklyHours: number }) =>
      updatePersonHours(id, weeklyHours),
    onSuccess: (person) => {
      queryClient.setQueriesData<CapacityResponse>({ queryKey: capacityKeys.all }, (cached) =>
        cached && {
          ...cached,
          people: cached.people.map((p) =>
            p.id === person.id ? { ...p, weeklyHours: person.weeklyHours } : p,
          ),
        },
      )
    },
  })
}
