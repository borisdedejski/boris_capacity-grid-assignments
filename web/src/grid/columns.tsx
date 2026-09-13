import { createColumnHelper } from '@tanstack/react-table'
import { formatPercent } from '@/lib/allocation'
import type { PersonCapacity, Week } from '@/lib/capacity'
import { formatDayMonth } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { AllocationCell } from './AllocationCell'
import { HoursEditor } from './HoursEditor'
import type { GridFeatures } from './features'

// GridRow is a person plus the derived figure the table sorts and filters on.
export type GridRow = PersonCapacity & {
  // Busiest week in the range as a ratio of capacity; Infinity when hours are
  // allocated against no capacity at all.
  peak: number
}

export const WEEK_COLUMN_PREFIX = 'week:'

const helper = createColumnHelper<GridFeatures, GridRow>()

// buildColumns returns the fixed columns followed by one column per week.
// Recreate it only when the weeks change.
export function buildColumns(weeks: Week[]) {
  return helper.columns([
    helper.accessor('name', {
      header: 'Person',
      cell: (info) => <PersonCell person={info.row.original} />,
      sortFn: 'alphanumeric',
      enableGlobalFilter: true,
    }),
    helper.accessor('weeklyHours', {
      header: 'Capacity',
      cell: (info) => <HoursEditor person={info.row.original} />,
      sortFn: 'basic',
      enableGlobalFilter: false,
    }),
    helper.accessor('peak', {
      header: 'Peak',
      cell: (info) => <PeakCell ratio={info.getValue()} />,
      sortFn: 'basic',
      sortDescFirst: true,
      // The "over-allocated only" switch sets this column's filter to true.
      filterFn: (row, _columnId, overOnly: boolean) => !overOnly || row.original.peak > 1,
      enableGlobalFilter: false,
    }),
    ...weeks.map((week, i) =>
      helper.accessor((row) => row.allocated[i] ?? 0, {
        id: `${WEEK_COLUMN_PREFIX}${week.start}`,
        header: () => (
          <span className="flex flex-col items-end leading-tight">
            <span>{formatDayMonth(week.start)}</span>
            <span className="text-[11px] font-normal text-muted-foreground/80">– {formatDayMonth(week.end)}</span>
          </span>
        ),
        cell: (info) => (
          <AllocationCell person={info.row.original} week={week} allocated={info.getValue()} />
        ),
        sortFn: 'basic',
        sortDescFirst: true,
        enableGlobalFilter: false,
      }),
    ),
  ])
}

const avatarTones = [
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-orange-100 text-orange-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
]

function PersonCell({ person }: { person: PersonCapacity }) {
  const parts = person.name.trim().split(/\s+/)
  const initials = `${parts[0]?.[0] ?? ''}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''}`
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase',
          avatarTones[person.id % avatarTones.length],
        )}
        aria-hidden
      >
        {initials}
      </span>
      <span className="truncate font-medium">{person.name}</span>
    </div>
  )
}

function PeakCell({ ratio }: { ratio: number }) {
  const over = ratio > 1
  return (
    <div
      className={cn(
        'px-3 py-2 text-right tabular-nums',
        ratio === 0 && 'text-muted-foreground/50',
        ratio === 1 && 'text-amber-900',
        over && 'font-semibold text-red-700',
      )}
    >
      {ratio === 0 ? '—' : formatPercent(ratio)}
    </div>
  )
}
