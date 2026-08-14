export const DEFAULT_ATTENDANCE_STATUSES = ['حاضر', 'غياب', 'غياب بعذر', 'لا ينطبق']
export const DEFAULT_PRESENT_STATUS = 'حاضر'
export const DEFAULT_ABSENT_STATUS = 'غياب'

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

export function configuredAbsentStatus(absentStatus: string | null | undefined, statuses?: string[] | null): string {
  const available = configuredAttendanceStatuses(statuses)
  const requested = (absentStatus || '').trim()
  if (available.includes(requested)) return requested
  if (available.includes(DEFAULT_ABSENT_STATUS)) return DEFAULT_ABSENT_STATUS
  const present = configuredPresentStatus(undefined, available)
  return available.find((status) => status !== present) || available[0]
}

export function countStudentsExceptAbsent<T extends { status: string }>(students: T[], absentStatus: string): number {
  return students.filter((student) => student.status !== absentStatus).length
}
