import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

// renderWithClient gives each test its own query cache. Retries are off so a
// failed request fails the test at once instead of after three backoffs. The
// provider is a wrapper, so `rerender` keeps the same cache.
export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...render(ui, { wrapper }) }
}
