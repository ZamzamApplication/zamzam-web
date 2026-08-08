export const DEFAULT_ATTENDANCE_STATUSES = ['حاضر', 'غياب', 'غياب بعذر', 'لا ينطبق']
export const DEFAULT_PRESENT_STATUS = 'حاضر'

export function configuredAttendanceStatuses(statuses?: string[] | null): string[] {
  const cleaned = (statuses || []).map((status) => status.trim()).filter(Boolean)
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : DEFAULT_ATTENDANCE_STATUSES
}

export function configuredPresentStatus(presentStatus: string | null | undefined, statuses?: string[] | null): string {
  const available = configuredAttendanceStatuses(statuses)
  const requested = (presentStatus || '').trim()
  if (available.includes(requested)) return requested
  if (available.includes(DEFAULT_PRESENT_STATUS)) return DEFAULT_PRESENT_STATUS
  return available[0]
}
