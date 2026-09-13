import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRangeStore } from '@/stores/range'
import { renderWithClient } from '@/test/render'
import { App } from './App'

describe('App', () => {
  beforeEach(() => useRangeStore.setState(useRangeStore.getInitialState()))

  it('shows the range from the store and follows changes to it', () => {
    renderWithClient(<App />)
    expect(screen.getByText('2025-12-29 to 2026-01-16')).toBeInTheDocument()

    act(() => useRangeStore.getState().setRange('2026-02-02', '2026-02-27'))
    expect(screen.getByText('2026-02-02 to 2026-02-27')).toBeInTheDocument()
  })
})
