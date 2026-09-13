import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { server } from '@/test/msw'
import { ApiError, fetchJson } from './api'

const Thing = z.object({ id: z.number(), name: z.string() })

describe('fetchJson', () => {
  it('returns the body when it matches the schema', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ id: 1, name: 'Ana' })))

    await expect(fetchJson('/api/thing', Thing)).resolves.toEqual({ id: 1, name: 'Ana' })
  })

  it('rejects a body that does not match the schema', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ id: '1' })))

    await expect(fetchJson('/api/thing', Thing)).rejects.toBeInstanceOf(z.ZodError)
  })

  it('rejects a non-2xx response with its status and message', async () => {
    server.use(
      http.get('/api/thing', () => new HttpResponse('from must be before to', { status: 400 })),
    )

    const err = await fetchJson('/api/thing', Thing).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 400, message: 'from must be before to' })
  })
})
