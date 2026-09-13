import { z } from 'zod'
import { fetchJson } from './api'

// Hand-written copy of Person and UpdatePerson in api/openapi.yaml. Change both together.

export const Person = z.object({
  id: z.number().int(),
  name: z.string(),
  weeklyHours: z.number(),
})
export type Person = z.infer<typeof Person>

// WeeklyHours is the same rule the API enforces, so the form can reject a
// value before the request goes out.
export const WeeklyHours = z.number().min(0).max(168)

// updatePersonHours calls PATCH /api/people/{id} and resolves with the updated
// person. Allocations don't change, so the caller can keep its capacity data
// and only replace weeklyHours for that person.
export function updatePersonHours(id: number, weeklyHours: number): Promise<Person> {
  return fetchJson(`/api/people/${id}`, Person, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weeklyHours }),
  })
}
