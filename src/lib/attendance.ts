export const DEFAULT_ATTENDANCE_STATUSES = ['حاضر', 'غياب', 'غياب بعذر', 'لا ينطبق']

export function configuredAttendanceStatuses(statuses?: string[] | null): string[] {
  const cleaned = (statuses || []).map((status) => status.trim()).filter(Boolean)
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : DEFAULT_ATTENDANCE_STATUSES
}
