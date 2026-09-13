import { useRangeStore } from '@/stores/range'
import { CapacityGrid } from './CapacityGrid'

export function App() {
  const from = useRangeStore((s) => s.from)
  const to = useRangeStore((s) => s.to)

  return (
    <main className="mx-auto max-w-7xl px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Team capacity</h1>
      <p className="mb-6 text-sm text-muted-foreground tabular-nums">
        {from} to {to}
      </p>
      <CapacityGrid from={from} to={to} />
    </main>
  )
}
