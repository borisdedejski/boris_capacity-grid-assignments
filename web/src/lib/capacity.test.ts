import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { server } from '@/test/msw'
import { fetchCapacity } from './capacity'
import { updatePersonHours } from './people'

const response = {
  weeks: [{ start: '2026-01-05', end: '2026-01-11' }],
  people: [{ id: 1, name: 'Ana', weeklyHours: 40, allocated: [46] }],
}

describe('fetchCapacity', () => {
  it('sends the range and returns the parsed response', async () => {
    let url = ''
    server.use(
      http.get('/api/capacity', ({ request }) => {
        url = request.url
        return HttpResponse.json(response)
      }),
    )

    await expect(fetchCapacity('2026-01-05', '2026-01-11')).resolves.toEqual(response)
    expect(new URL(url).search).toBe('?from=2026-01-05&to=2026-01-11')
  })

  it('rejects a person whose allocated entries do not line up with the weeks', async () => {
    server.use(
      http.get('/api/capacity', () =>
        HttpResponse.json({ ...response, people: [{ ...response.people[0], allocated: [46, 5] }] }),
      ),
    )

    await expect(fetchCapacity('2026-01-05', '2026-01-11')).rejects.toBeInstanceOf(z.ZodError)
  })
})

describe('updatePersonHours', () => {
  it('patches the person and returns the updated one', async () => {
    let body: unknown
    server.use(
      http.patch('/api/people/1', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 1, name: 'Ana', weeklyHours: 32 })
      }),
    )

    await expect(updatePersonHours(1, 32)).resolves.toEqual({ id: 1, name: 'Ana', weeklyHours: 32 })
    expect(body).toEqual({ weeklyHours: 32 })
  })
})
