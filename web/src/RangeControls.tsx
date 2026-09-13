import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addDays, mondayOf, today } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useRangeStore } from '@/stores/range'

const presets = [4, 8, 13] // weeks

// RangeControls moves the shared range a week at a time, or sets it outright.
// The API widens whatever is chosen to whole weeks; the grid shows the result.
export function RangeControls() {
  const { from, to, setRange, setWeeks, shiftWeeks } = useRangeStore()
  const monday = mondayOf(from)
  const activePreset = presets.find((w) => from === monday && to === addDays(monday, 7 * w - 1))

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-md border bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-r-none"
          aria-label="Previous week"
          onClick={() => shiftWeeks(-1)}
        >
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-1.5 border-x px-2">
          <Input
            type="date"
            aria-label="From"
            className="h-7 w-36 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setRange(e.target.value, to)}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label="To"
            className="h-7 w-36 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            value={to}
            min={from}
            onChange={(e) => e.target.value && setRange(from, e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-l-none"
          aria-label="Next week"
          onClick={() => shiftWeeks(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="inline-flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5" role="group" aria-label="Range length">
        {presets.map((weeks) => (
          <Button
            key={weeks}
            variant="ghost"
            size="sm"
            aria-pressed={activePreset === weeks}
            className={cn('h-7', activePreset === weeks && 'bg-background shadow-sm hover:bg-background')}
            onClick={() => setWeeks(from, weeks)}
          >
            {weeks} wk
          </Button>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => setWeeks(today(), activePreset ?? 4)}>
        Today
      </Button>
    </div>
  )
}
