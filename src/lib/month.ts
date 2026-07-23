function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function currentMonthValue(monthStartDay = 1, now = new Date()): string {
  const anchor = new Date(now.getFullYear(), now.getMonth(), 1)
  if (now.getDate() < monthStartDay) anchor.setMonth(anchor.getMonth() - 1)
  return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(value: string, offset: number): string {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthRange(value: string, monthStartDay = 1): { start: string; end: string } {
  const [year, month] = value.split('-').map(Number)
  const start = new Date(year, month - 1, monthStartDay)
  const end = new Date(year, month, monthStartDay - 1)
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(end),
  }
}

export function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ar-EG', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

export function formatMonthPeriod(value: string, monthStartDay = 1): string {
  if (monthStartDay === 1) return formatMonth(value)
  const range = monthRange(value, monthStartDay)
  const format = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${format.format(new Date(`${range.start}T12:00:00`))} - ${format.format(new Date(`${range.end}T12:00:00`))}`
}
