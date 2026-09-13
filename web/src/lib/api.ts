import type { z } from 'zod'

// ApiError is a non-2xx response. The API sends errors as plain text
// (http.Error), which becomes the message.
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// fetchJson requests an API endpoint and checks the body against schema, so a
// response that breaks the contract fails here instead of rendering wrong numbers.
export async function fetchJson<T extends z.ZodType>(
  url: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T>> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new ApiError(res.status, (await res.text()) || res.statusText)
  }
  return schema.parse(await res.json())
}
