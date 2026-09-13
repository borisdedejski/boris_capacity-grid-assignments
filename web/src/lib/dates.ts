// Date helpers over YYYY-MM-DD strings. Everything is done in UTC so a local
// time zone can never shift a date by a day.

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toISO(d)
}

// mondayOf returns the Monday on or before iso, the same rule the API uses.
export function mondayOf(iso: string): string {
  const d = parseISO(iso)
  const sinceMonday = (d.getUTCDay() + 6) % 7
  return addDays(iso, -sinceMonday)
}

export function today(): string {
  return toISO(new Date())
}

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

// "5 Jan"
export function formatDayMonth(iso: string): string {
  return dayMonth.format(parseISO(iso))
}

// "5 Jan 2026"
export function formatDate(iso: string): string {
  return dayMonthYear.format(parseISO(iso))
}
