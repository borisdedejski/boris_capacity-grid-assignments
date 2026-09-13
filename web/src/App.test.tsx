import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRangeStore } from '@/stores/range'
import { fakeApi } from '@/test/fakeApi'
import { renderWithClient } from '@/test/render'
import { App } from './App'

const team = [{ id: 1, name: 'Ana Ferreira', weeklyHours: 40 }]

describe('App', () => {
  // The store opens on the current week; pin it so the weeks are known.
  beforeEach(() => useRangeStore.setState({ from: '2026-01-05', to: '2026-01-18' }))

  it('steps back and forward a week at a time, keeping the range length', async () => {
    const api = fakeApi(team)
    const user = userEvent.setup()
    renderWithClient(<App />)
    await screen.findByText('5 Jan')

    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(await screen.findByText('19 Jan')).toBeInTheDocument()
    expect(screen.queryByText('5 Jan')).not.toBeInTheDocument()
    expect(api.capacityRequests).toContainEqual({ from: '2026-01-12', to: '2026-01-25' })

    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(await screen.findByText('29 Dec')).toBeInTheDocument()
    expect(api.capacityRequests).toContainEqual({ from: '2025-12-29', to: '2026-01-11' })
  })

  it('loads the range chosen in the date fields or with a length preset', async () => {
    const api = fakeApi(team)
    const user = userEvent.setup()
    renderWithClient(<App />)
    await screen.findByText('5 Jan')

    // A date input's value is set in one go, as a picker does.
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-02-01' } })
    expect(await screen.findByText('26 Jan')).toBeInTheDocument()
    expect(api.capacityRequests).toContainEqual({ from: '2026-01-05', to: '2026-02-01' })

    await user.click(screen.getByRole('button', { name: '8 wk' }))
    expect(await screen.findByText('23 Feb')).toBeInTheDocument()
    expect(api.capacityRequests).toContainEqual({ from: '2026-01-05', to: '2026-03-01' })
  })
})
