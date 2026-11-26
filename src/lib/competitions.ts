export type CompetitionStatus = 'draft' | 'active' | 'ended'
export type Trophy = 'gold' | 'silver' | 'bronze'

export interface Competition {
  id: number
  title: string
  description: string
  start_date: string
  end_date: string
  status: CompetitionStatus
  points_per_check: number
  completion_threshold: number | null
  public_enabled: boolean
  name_display: 'short' | 'full'
  show_photos: boolean
  public_limit: number
  version: number
  updated_at: string
  /** Present for administrators only. */
  public_url?: string | null
  participant_count?: number
}

export type CompetitionInput = Pick<Competition, 'title' | 'description' | 'start_date' | 'end_date' | 'points_per_check' | 'completion_threshold' | 'name_display' | 'show_photos' | 'public_limit'>

export interface CompetitionParticipant { id: number; student_id: number | null; name: string; can_record: boolean }
export interface CompetitionEntry { participant_id: number; date: string; points: number }
export interface CompetitionStanding {
  participant_id: number
  student_id: number | null
  name: string
  points: number
  days: number
  best_streak: number
  rank: number
  trophy: Trophy | null
  completed: boolean
}
export interface CompetitionDetail {
  competition: Competition
  participants: CompetitionParticipant[]
  entries: CompetitionEntry[]
  standings: CompetitionStanding[]
}
export interface CompetitionStudent { id: number; name: string; sheikh_id: number | null; sheikh_name: string; category_ids: number[] }

export interface PublicLeaderboardRow { rank: number; trophy: Trophy | null; name: string; points: number; days: number; best_streak: number; completed: boolean; photo?: string | null }
export interface PublicLeaderboard {
  title: string
  description: string
  tahfiz_name: string
  start_date: string
  end_date: string
  status: 'active' | 'ended'
  points_per_check: number
  completion_threshold: number | null
  participant_count: number
  hidden_count: number
  show_photos?: boolean
  updated_at: string
  leaderboard: PublicLeaderboardRow[]
}

export interface StudentCompetitionCard {
  id: number
  title: string
  participant_id: number
  date: string
  done: boolean
  can_record: boolean
  points: number
  days: number
  rank: number
  trophy: Trophy | null
  completed: boolean
  end_date: string
}

export const STATUS_LABELS: Record<CompetitionStatus, string> = { draft: 'مسودة', active: 'جارية', ended: 'انتهت' }

export const TROPHY_META: Record<Trophy, { label: string; color: string; ring: string; text: string }> = {
  gold: { label: 'المركز الأول', color: '#f5b301', ring: 'ring-amber-300 dark:ring-amber-500/60', text: 'text-amber-600 dark:text-amber-300' },
  silver: { label: 'المركز الثاني', color: '#a8b3c2', ring: 'ring-slate-300 dark:ring-slate-500/60', text: 'text-slate-500 dark:text-slate-300' },
  bronze: { label: 'المركز الثالث', color: '#cd7f32', ring: 'ring-orange-300 dark:ring-orange-500/60', text: 'text-orange-700 dark:text-orange-300' },
}

/** YYYY-MM-DD for the viewer's local calendar day (Fajr is recorded in local time, not UTC). */
export function localToday(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function clampDay(day: string, start: string, end: string): string {
  return day < start ? start : day > end ? end : day
}

/** Every day from start to end inclusive. */
export function competitionDays(start: string, end: string): string[] {
  const days: string[] = []
  for (let day = start; day <= end && days.length < 400; day = addDays(day, 1)) days.push(day)
  return days
}

/** Days from start to min(end, today) — the days that can have entries so far. */
export function elapsedDays(start: string, end: string, today: string): string[] {
  return today < start ? [] : competitionDays(start, today < end ? today : end)
}

export function entryKey(participantId: number, day: string): string {
  return `${participantId}:${day}`
}

export function entrySet(entries: CompetitionEntry[]): Set<string> {
  return new Set(entries.map(entry => entryKey(entry.participant_id, entry.date)))
}

export function publicToken(url: string | null | undefined): string | null {
  if (!url) return null
  const token = url.split('/').filter(Boolean).pop()
  return token || null
}

export function arabicNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value)
}

export function shortDate(day: string): string {
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))
}

/**
 * The first three trophy holders (rows arrive sorted by rank), arranged for a podium with the
 * leader in the middle. Ties are preserved: three tied leaders render as three gold cups.
 */
export function podiumOrder<T extends { trophy: Trophy | null }>(rows: T[]): T[] {
  const top = rows.filter(row => row.trophy).slice(0, 3)
  if (top.length === 3) return [top[1], top[0], top[2]]
  if (top.length === 2) return [top[1], top[0]]
  return top
}
