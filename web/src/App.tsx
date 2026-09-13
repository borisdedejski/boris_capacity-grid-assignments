import { formatDate } from '@/lib/dates'
import { useRangeStore } from '@/stores/range'
import { CapacityGrid } from './CapacityGrid'
import { RangeControls } from './RangeControls'

export function App() {
  const from = useRangeStore((s) => s.from)
  const to = useRangeStore((s) => s.to)

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Team capacity</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Allocated hours against weekly capacity, {formatDate(from)} to {formatDate(to)}.
          </p>
        </div>
        <RangeControls />
      </div>
      <CapacityGrid from={from} to={to} />
    </main>
  )
}
