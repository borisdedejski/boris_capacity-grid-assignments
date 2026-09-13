import { useMemo, useRef, useState } from 'react'
import { useTable } from '@tanstack/react-table'
import type { Header } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TooltipProvider } from '@/components/ui/tooltip'
import { buildColumns, WEEK_COLUMN_PREFIX, type GridRow } from '@/grid/columns'
import { EditingProvider } from '@/grid/editing'
import { gridFeatures } from '@/grid/features'
import { useCapacity } from '@/hooks/useCapacity'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { formatHours, formatPercent, isOverAllocated, peakUtilization } from '@/lib/allocation'
import type { Week } from '@/lib/capacity'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

type Props = {
  from: string
  to: string
}

const NO_ROWS: GridRow[] = []
const NO_WEEKS: Week[] = []
const ROW_HEIGHT = 45 // px, measured after mount; this is the estimate
const SEARCH_DELAY = 200 // ms after the last keystroke before the rows filter

// CapacityGrid renders one row per person and one column per week, on
// TanStack Table: sort by any column, search by name, or show only the people
// who are over somewhere in the range. Rows are virtualised, so only the
// ones in view exist in the DOM however many people there are.
export function CapacityGrid({ from, to }: Props) {
  const query = useCapacity(from, to)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [overOnly, setOverOnly] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const weeks = query.data?.weeks ?? NO_WEEKS
  const rows = useMemo(
    () => query.data?.people.map((p) => ({ ...p, peak: peakUtilization(p) })) ?? NO_ROWS,
    [query.data],
  )
  const columns = useMemo(() => buildColumns(weeks), [weeks])

  const table = useTable({
    features: gridFeatures,
    columns,
    data: rows,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => column.id === 'name',
    initialState: { sorting: [{ id: 'name', desc: false }] },
  })

  // Typing filters once it pauses. Enter applies at once, and so does clearing
  // the box, so the rows never lag behind an empty field.
  const applySearch = useDebouncedCallback((value: string) => table.setGlobalFilter(value), SEARCH_DELAY)

  const tableRows = table.getRowModel().rows
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => tableRows[index]!.id,
    overscan: 8,
    // Until the scroll box is measured (and always under jsdom), size a
    // window of rows rather than none.
    initialRect: { width: 1200, height: 720 },
  })

  if (query.isPending) return <GridSkeleton />
  if (query.error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">Couldn't load capacity</p>
        <p className="mt-1 text-muted-foreground">{query.error.message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const visible = tableRows.map((r) => r.original)
  const overCount = rows.filter(isOverAllocated).length
  const teamCapacity = rows.reduce((sum, p) => sum + p.weeklyHours, 0) * weeks.length
  const teamAllocated = rows.reduce((sum, p) => sum + p.allocated.reduce((a, b) => a + b, 0), 0)

  const items = virtualizer.getVirtualItems()
  const paddingTop = items[0]?.start ?? 0
  const paddingBottom = items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0

  return (
    <TooltipProvider>
      <EditingProvider value={{ editingId, setEditingId }}>
        <div className={cn('space-y-3 transition-opacity duration-200', query.isPlaceholderData && 'opacity-60')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatDate(weeks[0].start)} – {formatDate(weeks[weeks.length - 1].end)}
              </span>
              <span className="mx-2">·</span>
              {rows.length} people
              <span className="mx-2">·</span>
              <span className={cn(overCount > 0 && 'font-medium text-red-700')}>
                {overCount} over-allocated
              </span>
              <span className="mx-2">·</span>
              team at {formatPercent(teamCapacity > 0 ? teamAllocated / teamCapacity : null)}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Find a person"
                  aria-label="Find a person"
                  className="w-52 pl-8"
                  value={search}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearch(value)
                    if (value === '') {
                      applySearch.cancel()
                      table.setGlobalFilter('')
                    } else {
                      applySearch(value)
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch.flush()}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-pressed={overOnly}
                className={cn(overOnly && 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100 hover:text-red-900')}
                onClick={() => {
                  const next = !overOnly
                  setOverOnly(next)
                  table.getColumn('peak')?.setFilterValue(next ? true : undefined)
                }}
              >
                <TriangleAlert data-icon="inline-start" />
                Over-allocated only
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="max-h-[72vh] overflow-auto rounded-lg border bg-card">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className={cn(
                          'border-b bg-muted px-3 py-2 text-xs font-medium whitespace-nowrap text-muted-foreground',
                          header.column.id === 'name' ? 'sticky left-0 z-30 min-w-56 text-left' : 'text-right',
                        )}
                      >
                        {header.isPlaceholder ? null : <SortableHeader header={header} table={table} />}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columns.length} style={{ height: paddingTop }} />
                  </tr>
                )}
                {items.map((item) => {
                  const row = tableRows[item.index]!
                  return (
                    <tr
                      key={row.id}
                      data-index={item.index}
                      ref={virtualizer.measureElement}
                      className="group hover:bg-muted/40"
                      onDoubleClick={() => setEditingId(row.original.id)}
                    >
                      {row.getAllCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            'border-b p-0 align-middle',
                            cell.column.id === 'name' && 'sticky left-0 z-10 bg-card group-hover:bg-muted',
                          )}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  )
                })}
                {paddingBottom > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columns.length} style={{ height: paddingBottom }} />
                  </tr>
                )}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-muted-foreground">
                      {overOnly
                        ? 'Nobody matching is over-allocated in this range.'
                        : `No one called “${search}”.`}
                    </td>
                  </tr>
                )}
              </tbody>
              {visible.length > 0 && (
                <tfoot className="sticky bottom-0 z-20">
                  <TeamRow people={visible} weeks={weeks} />
                </tfoot>
              )}
            </table>
          </div>

          <Legend />
        </div>
      </EditingProvider>
    </TooltipProvider>
  )
}

type GridTable = ReturnType<typeof useTable<typeof gridFeatures, GridRow>>

function SortableHeader({ header, table }: { header: Header<typeof gridFeatures, GridRow, unknown>; table: GridTable }) {
  const column = header.column
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded px-1 py-0.5 -mx-1 hover:text-foreground',
        sorted && 'text-foreground',
      )}
      onClick={() => column.toggleSorting()}
      aria-label={`Sort by ${column.id.startsWith(WEEK_COLUMN_PREFIX) ? 'week' : column.id}`}
    >
      <table.FlexRender header={header} />
      <Icon className={cn('size-3.5', !sorted && 'opacity-40')} aria-hidden />
    </button>
  )
}

// TeamRow sums whatever rows are visible, so it follows the search and filter.
function TeamRow({ people, weeks }: { people: GridRow[]; weeks: Week[] }) {
  const capacity = people.reduce((sum, p) => sum + p.weeklyHours, 0)
  return (
    <tr className="bg-muted font-medium">
      <td className="sticky left-0 z-30 border-t bg-muted px-3 py-2">
        {people.length === 1 ? '1 person' : `${people.length} people`}
        <span className="ml-2 font-normal text-muted-foreground tabular-nums">{formatHours(capacity)} h/wk</span>
      </td>
      <td className="border-t" />
      <td className="border-t" />
      {weeks.map((w, i) => {
        const allocated = people.reduce((sum, p) => sum + (p.allocated[i] ?? 0), 0)
        const over = allocated > capacity
        return (
          <td key={w.start} className={cn('border-t px-3 py-2 text-right tabular-nums', over && 'text-red-700')}>
            {formatHours(allocated)} h
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {formatPercent(capacity > 0 ? allocated / capacity : null)}
            </span>
          </td>
        )
      })}
    </tr>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-red-50 ring-1 ring-red-300" /> over capacity
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-amber-50 ring-1 ring-amber-300" /> exactly full
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1 w-6 rounded-full bg-foreground/50" /> share of capacity
      </span>
      <span className="ml-auto">Click a week for its projects. Click the capacity, or double-click a row, to change weekly hours.</span>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading capacity">
      <div className="h-5 w-72 animate-pulse rounded bg-muted" />
      <div className="rounded-lg border">
        <div className="h-9 border-b bg-muted" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-3 py-2.5 last:border-b-0">
            <div className="size-7 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="ml-auto flex gap-6">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="h-4 w-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
