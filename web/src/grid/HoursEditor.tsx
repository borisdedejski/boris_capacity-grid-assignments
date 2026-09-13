import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUpdatePersonHours } from '@/hooks/useUpdatePersonHours'
import { formatHours } from '@/lib/allocation'
import type { PersonCapacity } from '@/lib/capacity'
import { WeeklyHours } from '@/lib/people'
import { useEditing } from './editing'

const presets = [20, 24, 32, 40]

// HoursEditor is the Capacity cell: a button that reads "40 h" with a pencil,
// opening a popover to change it. Enter saves, Escape cancels. The value is
// checked with the same rule the API enforces before anything is sent.
export function HoursEditor({ person }: { person: PersonCapacity }) {
  const { editingId, setEditingId } = useEditing()
  const open = editingId === person.id
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const update = useUpdatePersonHours()

  const setOpen = (next: boolean) => {
    if (next) {
      setDraft(formatHours(person.weeklyHours))
      setProblem(null)
      update.reset()
      setEditingId(person.id)
    } else {
      setEditingId(null)
    }
  }

  const save = () => {
    const parsed = WeeklyHours.safeParse(draft.trim() === '' ? NaN : Number(draft))
    if (!parsed.success) {
      setProblem('Enter a number from 0 to 168.')
      return
    }
    if (parsed.data === person.weeklyHours) {
      setOpen(false)
      return
    }
    update.mutate({ id: person.id, weeklyHours: parsed.data }, { onSuccess: () => setOpen(false) })
  }

  const message = problem ?? (update.isError ? update.error.message : null)

  return (
    <div className="px-3 py-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 py-1 text-sm tabular-nums shadow-xs transition-colors hover:border-foreground/40 hover:bg-muted data-[state=open]:border-foreground/40 data-[state=open]:bg-muted"
                aria-label={`Edit weekly hours for ${person.name}`}
              >
                <span className="font-medium">{formatHours(person.weeklyHours)} h</span>
                <Pencil className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Edit weekly hours (or double-click the row)</TooltipContent>
        </Tooltip>

        <PopoverContent align="start" className="w-72">
          <form
            className="space-y-3"
            // WeeklyHours in save() is the one check, with the app's own message.
            // The input's max/step would otherwise block the submit with a native
            // bubble, and step 0.5 would refuse decimals the API accepts.
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <PopoverHeader>
              <PopoverTitle>Weekly hours</PopoverTitle>
              <PopoverDescription>{person.name}</PopoverDescription>
            </PopoverHeader>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={168}
                step={0.5}
                aria-label="Weekly hours"
                aria-invalid={message !== null}
                className="w-28 text-right tabular-nums"
                value={draft}
                disabled={update.isPending}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setProblem(null)
                }}
              />
              <span className="text-sm text-muted-foreground">hours / week</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {presets.map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="xs"
                  variant={Number(draft) === h ? 'secondary' : 'outline'}
                  aria-pressed={Number(draft) === h}
                  onClick={() => {
                    setDraft(String(h))
                    setProblem(null)
                  }}
                >
                  {h}
                </Button>
              ))}
            </div>

            {message && (
              <p className="text-xs text-destructive" role="alert">
                {message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  )
}
