import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAllocations } from '@/hooks/useAllocations'
import { allocationStatus, formatHours, formatPercent, utilization } from '@/lib/allocation'
import type { PersonCapacity, Week } from '@/lib/capacity'
import { formatDate, formatDayMonth } from '@/lib/dates'
import { cn } from '@/lib/utils'

type Props = {
  person: PersonCapacity
  week: Week
  allocated: number
}

// AllocationCell is one person-week: the hours, and a bar of how much of the
// person's capacity they take. Over-allocation is red with the overage in
// hours, so it reads without doing arithmetic. Clicking opens the week split
// by project and weekday.
export function AllocationCell({ person, week, allocated }: Props) {
  const [open, setOpen] = useState(false)
  const capacity = person.weeklyHours
  const status = allocationStatus(allocated, capacity)
  const ratio = utilization(allocated, capacity)
  const fill = ratio === null ? 100 : Math.min(ratio, 1) * 100

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-full w-full flex-col items-end justify-center gap-1 px-3 py-2 text-left transition-shadow hover:ring-2 hover:ring-ring/40 hover:ring-inset data-[state=open]:ring-2 data-[state=open]:ring-ring/60 data-[state=open]:ring-inset',
            status === 'over' && 'bg-red-50',
            status === 'full' && 'bg-amber-50/70',
          )}
          aria-label={`${person.name}, week of ${formatDayMonth(week.start)}: ${formatHours(allocated)} of ${formatHours(capacity)} hours. Show projects.`}
          title={
            status === 'empty'
              ? `Free: nothing scheduled, ${formatHours(capacity)} h available · click for details`
              : `${formatHours(allocated)} of ${formatHours(capacity)} h (${formatPercent(ratio)}) · click for projects`
          }
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {status === 'empty' ? (
            // Nothing scheduled. Said in words, with no bar, so it can't be
            // mistaken for a cell that is still loading.
            <span className="flex items-baseline gap-1.5 leading-none">
              <span className="font-medium text-emerald-700">Free</span>
              {capacity > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">{formatHours(capacity)} h open</span>
              )}
            </span>
          ) : (
            <>
              <span className="flex items-baseline gap-1.5 tabular-nums leading-none">
                {status === 'over' && (
                  <span className="rounded bg-red-600 px-1 py-0.5 text-[10px] font-semibold text-white">
                    +{formatHours(allocated - capacity)} h
                  </span>
                )}
                <span
                  className={cn(
                    status === 'over' && 'font-semibold text-red-800',
                    status === 'full' && 'font-medium text-amber-900',
                  )}
                >
                  {formatHours(allocated)} h
                </span>
              </span>
              <span className="block h-1 w-20 overflow-hidden rounded-full bg-black/8" aria-hidden>
                <span
                  className={cn(
                    'block h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none',
                    status === 'over' && 'bg-red-600',
                    status === 'full' && 'bg-amber-500',
                    status === 'under' && 'bg-foreground/50',
                  )}
                  style={{ width: `${fill}%` }}
                />
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <WeekDetail person={person} week={week} />
      </PopoverContent>
    </Popover>
  )
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// WeekDetail lists the projects in a week with hours per weekday, and totals
// each day against a fifth of the weekly capacity. That per-day figure is an
// assumption: the data only knows hours per week.
function WeekDetail({ person, week }: { person: PersonCapacity; week: Week }) {
  const query = useAllocations(person.id, week.start)
  const perDay = person.weeklyHours / 5

  return (
    <div className="space-y-3">
      <PopoverHeader>
        <PopoverTitle>{person.name}</PopoverTitle>
        <PopoverDescription>
          {formatDate(week.start)} – {formatDate(week.end)} · {formatHours(person.weeklyHours)} h/wk
        </PopoverDescription>
      </PopoverHeader>

      {query.isPending && (
        <div className="space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}
      {query.error && (
        <div className="text-sm">
          <p className="text-destructive">{query.error.message}</p>
          <Button variant="outline" size="xs" className="mt-2" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {query.data && query.data.projects.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing scheduled this week. Every day is free.</p>
      )}
      {query.data && query.data.projects.length > 0 && (
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="pb-1 text-left font-medium">Project</th>
              {weekdays.map((d) => (
                <th key={d} scope="col" className="pb-1 text-right font-medium">{d}</th>
              ))}
              <th scope="col" className="pb-1 pl-2 text-right font-medium">Week</th>
            </tr>
          </thead>
          <tbody>
            {query.data.projects.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-1 pr-2 font-medium">{p.name}</td>
                {p.days.map((h, i) => (
                  <td key={i} className={cn('py-1 text-right', h === 0 && 'text-muted-foreground/40')}>
                    {h === 0 ? '·' : formatHours(h)}
                  </td>
                ))}
                <td className="py-1 pl-2 text-right">{formatHours(p.days.reduce((a, b) => a + b, 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="pt-1.5 pr-2">Total</td>
              {weekdays.map((_, i) => {
                const total = query.data.projects.reduce((sum, p) => sum + p.days[i]!, 0)
                return (
                  <td key={i} className={cn('pt-1.5 text-right', total > perDay && 'text-red-700')}>
                    {total === 0 ? <span className="text-emerald-700">free</span> : formatHours(total)}
                  </td>
                )
              })}
              <td className="pt-1.5 pl-2 text-right">
                {formatHours(query.data.projects.reduce((sum, p) => sum + p.days.reduce((a, b) => a + b, 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
      {query.data && query.data.projects.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Days over {formatHours(perDay)} h are red, taking {formatHours(person.weeklyHours)} h/wk as{' '}
          {formatHours(perDay)} h a day.
        </p>
      )}
    </div>
  )
}
