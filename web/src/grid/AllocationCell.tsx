import { allocationStatus, formatHours, formatPercent, utilization } from '@/lib/allocation'
import { cn } from '@/lib/utils'

// AllocationCell is one person-week: the hours, and a bar of how much of the
// person's capacity they take. Over-allocation is red with the overage in
// hours, so it reads without doing arithmetic.
export function AllocationCell({ allocated, capacity }: { allocated: number; capacity: number }) {
  const status = allocationStatus(allocated, capacity)
  const ratio = utilization(allocated, capacity)
  const fill = ratio === null ? (allocated > 0 ? 100 : 0) : Math.min(ratio, 1) * 100

  return (
    <div
      className={cn(
        'flex h-full flex-col items-end justify-center gap-1 px-3 py-2',
        status === 'over' && 'bg-red-50',
        status === 'full' && 'bg-amber-50/70',
      )}
      title={`${formatHours(allocated)} of ${formatHours(capacity)} h (${formatPercent(ratio)})`}
    >
      <div className="flex items-baseline gap-1.5 tabular-nums leading-none">
        {status === 'over' && (
          <span className="rounded bg-red-600 px-1 py-0.5 text-[10px] font-semibold text-white">
            +{formatHours(allocated - capacity)} h
          </span>
        )}
        <span
          className={cn(
            status === 'empty' && 'text-muted-foreground/50',
            status === 'over' && 'font-semibold text-red-800',
            status === 'full' && 'font-medium text-amber-900',
          )}
        >
          {status === 'empty' ? '—' : `${formatHours(allocated)} h`}
        </span>
      </div>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-black/8" aria-hidden>
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none',
            status === 'over' && 'bg-red-600',
            status === 'full' && 'bg-amber-500',
            status === 'under' && 'bg-foreground/50',
          )}
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  )
}
