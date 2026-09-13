import { http, HttpResponse } from 'msw'
import { server } from './msw'

// FakePerson is one person in the fake team. `allocated` is keyed by the Monday
// of a week; weeks that aren't listed have nothing scheduled.
export type FakePerson = {
  id: number
  name: string
  weeklyHours: number
  allocated?: Record<string, number>
}

// fakeApi serves GET /api/capacity and PATCH /api/people/{id} from an in-memory
// team, following api/openapi.yaml: the range is widened to whole Monday–Sunday
// weeks, and a PATCH changes what later GETs return. It logs every request, so
// a test can check what the grid sent and how often.
export function fakeApi(team: FakePerson[]) {
  const people = team.map((p) => ({ ...p }))
  const capacityRequests: { from: string; to: string }[] = []
  const patches: { id: number; body: unknown }[] = []

  server.use(
    http.get('/api/capacity', ({ request }) => {
      const params = new URL(request.url).searchParams
      const from = params.get('from') ?? ''
      const to = params.get('to') ?? ''
      capacityRequests.push({ from, to })

      const mondays = mondaysCovering(from, to)
      return HttpResponse.json({
        weeks: mondays.map((start) => ({ start, end: shift(start, 6) })),
        people: people.map(({ id, name, weeklyHours, allocated = {} }) => ({
          id,
          name,
          weeklyHours,
          allocated: mondays.map((monday) => allocated[monday] ?? 0),
        })),
      })
    }),
    http.patch('/api/people/:id', async ({ params, request }) => {
      const id = Number(params.id)
      const body = (await request.json()) as { weeklyHours: number }
      patches.push({ id, body })

      const person = people.find((p) => p.id === id)
      if (!person) return new HttpResponse('person not found', { status: 404 })
      person.weeklyHours = body.weeklyHours
      return HttpResponse.json({ id: person.id, name: person.name, weeklyHours: person.weeklyHours })
    }),
  )

  return { capacityRequests, patches }
}

// The date math is written out here rather than imported from lib/dates, so the
// fake can't share a bug with the code under test.
function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function mondaysCovering(from: string, to: string): string[] {
  const sinceMonday = (new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7
  const mondays: string[] = []
  for (let monday = shift(from, -sinceMonday); monday <= to; monday = shift(monday, 7)) {
    mondays.push(monday)
  }
  return mondays
}
