import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { fakeApi, type FakePerson } from '@/test/fakeApi'
import { server } from '@/test/msw'
import { renderWithClient } from '@/test/render'
import { CapacityGrid } from './CapacityGrid'

// The grid against a fake API: real components, query cache and Zod parsing,
// with only the network replaced.

// Two weeks: 5–11 Jan and 12–18 Jan 2026.
const FROM = '2026-01-05'
const TO = '2026-01-18'

const team: FakePerson[] = [
  // Over by 6 h in the first week.
  { id: 1, name: 'Ana Ferreira', weeklyHours: 40, allocated: { '2026-01-05': 46, '2026-01-12': 30, '2026-01-19': 12 } },
  // Exactly full, which is not over.
  { id: 2, name: 'Bo Lindqvist', weeklyHours: 40, allocated: { '2026-01-05': 40, '2026-01-12': 20 } },
  // No capacity, so any hours at all are over.
  { id: 5, name: 'Eli Nakamura', weeklyHours: 0, allocated: { '2026-01-05': 20 } },
]

const row = (name: string) => within(screen.getByRole('row', { name: new RegExp(name) }))
const capacityButton = (name: string) =>
  screen.getByRole('button', { name: `Edit weekly hours for ${name}` })

async function editHours(user: UserEvent, name: string, hours: string) {
  await user.click(capacityButton(name))
  const input = screen.getByRole('spinbutton', { name: 'Weekly hours' })
  await user.clear(input)
  await user.type(input, hours)
  await user.click(screen.getByRole('button', { name: 'Save' }))
}

describe('CapacityGrid', () => {
  it('flags every over-allocated week, including hours against zero capacity', async () => {
    fakeApi(team)
    const user = userEvent.setup()
    renderWithClient(<CapacityGrid from={FROM} to={TO} />)

    expect(await screen.findByText('2 over-allocated')).toBeInTheDocument()
    expect(row('Ana Ferreira').getByText('+6 h')).toBeInTheDocument()
    expect(row('Eli Nakamura').getByText('+20 h')).toBeInTheDocument()
    expect(row('Bo Lindqvist').queryByText(/^\+/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Over-allocated only' }))
    expect(screen.queryByRole('row', { name: /Bo Lindqvist/ })).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Ana Ferreira/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Eli Nakamura/ })).toBeInTheDocument()
  })

  describe('editing weekly hours', () => {
    it('updates the capacity, the overage and the count in place, without refetching', async () => {
      const api = fakeApi(team)
      const user = userEvent.setup()
      renderWithClient(<CapacityGrid from={FROM} to={TO} />)
      await screen.findByText('2 over-allocated')
      // The grid also prefetches neighbouring weeks in the background; capture
      // the count after that settles so the edit's own effect is isolated.
      const requestsBeforeEdit = api.capacityRequests.length

      await editHours(user, 'Ana Ferreira', '48')

      expect(await screen.findByText('1 over-allocated')).toBeInTheDocument()
      expect(capacityButton('Ana Ferreira')).toHaveTextContent('48 h')
      expect(row('Ana Ferreira').queryByText('+6 h')).not.toBeInTheDocument()
      expect(api.patches).toEqual([{ id: 1, body: { weeklyHours: 48 } }])
      // The grid patches its cached data with the saved person instead of
      // reloading the range: no new GET /api/capacity from the edit itself.
      expect(api.capacityRequests).toHaveLength(requestsBeforeEdit)
    })

    it('also corrects ranges already in the cache', async () => {
      fakeApi(team)
      const user = userEvent.setup()
      const { rerender } = renderWithClient(<CapacityGrid from={FROM} to={TO} />)
      await screen.findByText('2 over-allocated')

      // Step a week on and edit there...
      rerender(<CapacityGrid from="2026-01-12" to="2026-01-25" />)
      await screen.findByText('19 Jan')
      await editHours(user, 'Ana Ferreira', '48')
      await waitFor(() => expect(capacityButton('Ana Ferreira')).toHaveTextContent('48 h'))

      // ...then step back. The first range comes from the cache and is already right.
      rerender(<CapacityGrid from={FROM} to={TO} />)
      expect(await screen.findByText('5 Jan')).toBeInTheDocument()
      expect(capacityButton('Ana Ferreira')).toHaveTextContent('48 h')
      expect(screen.getByText('1 over-allocated')).toBeInTheDocument()
    })

    it('refuses hours outside 0–168 without calling the API', async () => {
      const api = fakeApi(team)
      const user = userEvent.setup()
      renderWithClient(<CapacityGrid from={FROM} to={TO} />)
      await screen.findByText('2 over-allocated')

      await editHours(user, 'Ana Ferreira', '200')

      expect(await screen.findByRole('alert')).toHaveTextContent('Enter a number from 0 to 168.')
      expect(api.patches).toHaveLength(0)
      expect(capacityButton('Ana Ferreira')).toHaveTextContent('40 h')
    })

    it('keeps the old numbers and shows why when the save fails', async () => {
      fakeApi(team)
      server.use(http.patch('/api/people/:id', () => new HttpResponse('internal error', { status: 500 })))
      const user = userEvent.setup()
      renderWithClient(<CapacityGrid from={FROM} to={TO} />)
      await screen.findByText('2 over-allocated')

      await editHours(user, 'Ana Ferreira', '48')

      expect(await screen.findByRole('alert')).toHaveTextContent('internal error')
      // The editor stays open with the value, so the manager can try again.
      expect(screen.getByRole('spinbutton', { name: 'Weekly hours' })).toHaveValue(48)
      expect(capacityButton('Ana Ferreira')).toHaveTextContent('40 h')
      expect(row('Ana Ferreira').getByText('+6 h')).toBeInTheDocument()
    })
  })
})
