import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, type FakePerson } from '@/test/fakeApi'
import { renderWithClient } from '@/test/render'
import { CapacityGrid } from './CapacityGrid'

// Searching by name filters the rows already on screen; nothing goes to the
// API. Kept apart from CapacityGrid.test.tsx while that file is being written;
// fold it in afterwards.

const team: FakePerson[] = [
  { id: 1, name: 'Ana Ferreira', weeklyHours: 40 },
  { id: 2, name: 'Bo Lindqvist', weeklyHours: 40 },
  { id: 5, name: 'Eli Nakamura', weeklyHours: 0 },
]

const personRow = (name: string) => screen.queryByRole('row', { name: new RegExp(name) })
const searchBox = () => screen.getByRole('searchbox', { name: 'Find a person' })

describe('CapacityGrid search', () => {
  it('filters once typing pauses, not on every keystroke, and sends nothing', async () => {
    const api = fakeApi(team)
    const user = userEvent.setup()
    const { client } = renderWithClient(<CapacityGrid from="2026-01-05" to="2026-01-18" />)
    await screen.findByRole('row', { name: /Ana Ferreira/ })
    // Background loads of neighbouring ranges finish first, so the count is stable.
    await waitFor(() => expect(client.isFetching()).toBe(0))
    const requestsBefore = api.capacityRequests.length

    await user.type(searchBox(), 'eli')
    // Straight after the last keystroke nothing has changed yet...
    expect(personRow('Ana Ferreira')).toBeInTheDocument()
    expect(personRow('Bo Lindqvist')).toBeInTheDocument()

    // ...and once typing has stopped only the match is left.
    await waitFor(() => expect(personRow('Ana Ferreira')).not.toBeInTheDocument())
    expect(personRow('Bo Lindqvist')).not.toBeInTheDocument()
    expect(personRow('Eli Nakamura')).toBeInTheDocument()
    expect(api.capacityRequests).toHaveLength(requestsBefore)
  })

  it('applies at once on Enter and when the box is cleared', async () => {
    fakeApi(team)
    const user = userEvent.setup()
    renderWithClient(<CapacityGrid from="2026-01-05" to="2026-01-18" />)
    await screen.findByRole('row', { name: /Ana Ferreira/ })

    await user.type(searchBox(), 'nobody{Enter}')
    expect(screen.getByText('No one called “nobody”.')).toBeInTheDocument()

    await user.clear(searchBox())
    expect(personRow('Ana Ferreira')).toBeInTheDocument()
    expect(personRow('Bo Lindqvist')).toBeInTheDocument()
    expect(personRow('Eli Nakamura')).toBeInTheDocument()
  })
})
