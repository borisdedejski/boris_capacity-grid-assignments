import { z } from 'zod'
import { fetchJson } from './api'

// Hand-written copy of CapacityResponse in api/openapi.yaml. Change both together.

export const Week = z.object({ start: z.iso.date(), end: z.iso.date() })
export type Week = z.infer<typeof Week>

export const PersonCapacity = z.object({
  id: z.number().int(),
  name: z.string(),
  // Capacity for every week. A week is over-allocated when allocated > weeklyHours.
  weeklyHours: z.number().nonnegative(),
  // Positional: allocated[i] belongs to weeks[i].
  allocated: z.array(z.number().nonnegative()),
})
export type PersonCapacity = z.infer<typeof PersonCapacity>

export const CapacityResponse = z
  .object({ weeks: z.array(Week), people: z.array(PersonCapacity) })
  .refine((r) => r.people.every((p) => p.allocated.length === r.weeks.length), {
    message: 'every person needs one allocated entry per week',
  })
export type CapacityResponse = z.infer<typeof CapacityResponse>

// fetchCapacity loads GET /api/capacity for an inclusive date range. The API
// widens it to whole weeks; read the weeks it actually returned.
export function fetchCapacity(from: string, to: string): Promise<CapacityResponse> {
  return fetchJson(`/api/capacity?${new URLSearchParams({ from, to })}`, CapacityResponse)
}
