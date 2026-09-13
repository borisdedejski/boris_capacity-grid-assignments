import { z } from 'zod'
import { fetchJson } from './api'
import { Week } from './capacity'

// Hand-written copy of AllocationsResponse in api/openapi.yaml. Change both together.

export const ProjectAllocation = z.object({
  id: z.number().int(),
  name: z.string(),
  // Hours on Monday through Friday.
  days: z.array(z.number().nonnegative()).length(5),
})
export type ProjectAllocation = z.infer<typeof ProjectAllocation>

export const AllocationsResponse = z.object({ week: Week, projects: z.array(ProjectAllocation) })
export type AllocationsResponse = z.infer<typeof AllocationsResponse>

// fetchAllocations loads one person's week, per project and weekday.
export function fetchAllocations(personId: number, week: string): Promise<AllocationsResponse> {
  return fetchJson(`/api/people/${personId}/allocations?${new URLSearchParams({ week })}`, AllocationsResponse)
}
