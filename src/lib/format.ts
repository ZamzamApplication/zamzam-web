const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function getArabicDay(dateStr: string): string {
  return ARABIC_DAYS[new Date(`${dateStr}T12:00:00`).getDay()]
}

export function formatDateWithWeekday(dateStr: string): string {
  return `${getArabicDay(dateStr)} ${dateStr}`
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path

  const base = API_BASE.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/')
    ? path
    : path.startsWith('uploads/')
      ? `/${path}`
      : `/uploads/${path}`
  return `${base}${normalizedPath}`
}
