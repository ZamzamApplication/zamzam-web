import { SURAHS, surahInfo } from './quran'

export type QuranPoint = { surah: number; ayah: number }
export type QuranPlanTrack = {
  enabled: boolean
  start: QuranPoint
  dailyAyahs: number
}
export type QuranPlanInput = {
  startDate: string
  endDate: string
  weekdays: number[]
  memorization: QuranPlanTrack
  revision: QuranPlanTrack
}
export type QuranAssignment = {
  from: QuranPoint
  to: QuranPoint
  ayahCount: number
  text: string
  completedMushaf: boolean
}
export type QuranPlanDay = {
  date: string
  weekday: number
  isStudyDay: boolean
  memorization: QuranAssignment | null
  revision: QuranAssignment | null
}
export type GeneratedQuranPlan = {
  days: QuranPlanDay[]
  studyDays: number
  memorizationAyahs: number
  revisionAyahs: number
  memorizationEnd: QuranPoint | null
  revisionEnd: QuranPoint | null
}

const LAST_POINT: QuranPoint = { surah: 114, ayah: surahInfo(114).ayahs }

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function isoDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidQuranPoint(point: QuranPoint): boolean {
  return point.surah >= 1 && point.surah <= SURAHS.length && point.ayah >= 1 && point.ayah <= surahInfo(point.surah).ayahs
}

function nextPoint(point: QuranPoint): QuranPoint | null {
  if (point.ayah < surahInfo(point.surah).ayahs) return { surah: point.surah, ayah: point.ayah + 1 }
  if (point.surah < SURAHS.length) return { surah: point.surah + 1, ayah: 1 }
  return null
}

export function formatPlanRange(from: QuranPoint, to: QuranPoint): string {
  if (from.surah === to.surah) {
    return from.ayah === to.ayah
      ? `سورة ${surahInfo(from.surah).name} — الآية ${from.ayah}`
      : `سورة ${surahInfo(from.surah).name} — من الآية ${from.ayah} إلى ${to.ayah}`
  }
  return `من سورة ${surahInfo(from.surah).name}، الآية ${from.ayah} إلى سورة ${surahInfo(to.surah).name}، الآية ${to.ayah}`
}

function allocate(start: QuranPoint, requestedAyahs: number): { assignment: QuranAssignment; next: QuranPoint | null } {
  let end = start
  let count = 1
  while (count < requestedAyahs) {
    const following = nextPoint(end)
    if (!following) break
    end = following
    count += 1
  }
  const next = nextPoint(end)
  return {
    assignment: {
      from: start,
      to: end,
      ayahCount: count,
      text: formatPlanRange(start, end),
      completedMushaf: next === null,
    },
    next,
  }
}

export function generateQuranPlan(input: QuranPlanInput): GeneratedQuranPlan {
  const start = parseDate(input.startDate)
  const end = parseDate(input.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) throw new Error('invalid_date_range')
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  const calendarDays = Math.floor((endUtc - startUtc) / 86_400_000) + 1
  if (calendarDays > 730) throw new Error('plan_period_too_long')
  if (input.weekdays.length === 0) throw new Error('study_days_required')

  for (const track of [input.memorization, input.revision]) {
    if (track.enabled && (!isValidQuranPoint(track.start) || !Number.isInteger(track.dailyAyahs) || track.dailyAyahs < 1)) {
      throw new Error('invalid_track')
    }
  }
  if (!input.memorization.enabled && !input.revision.enabled) throw new Error('track_required')

  let memorizationNext: QuranPoint | null = input.memorization.enabled ? input.memorization.start : null
  let revisionNext: QuranPoint | null = input.revision.enabled ? input.revision.start : null
  let memorizationEnd: QuranPoint | null = null
  let revisionEnd: QuranPoint | null = null
  let memorizationAyahs = 0
  let revisionAyahs = 0
  let studyDays = 0
  const selectedDays = new Set(input.weekdays)
  const days: QuranPlanDay[] = []

  for (let index = 0; index < calendarDays; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const isStudyDay = selectedDays.has(date.getDay())
    let memorization: QuranAssignment | null = null
    let revision: QuranAssignment | null = null
    if (isStudyDay) {
      studyDays += 1
      if (memorizationNext) {
        const result = allocate(memorizationNext, input.memorization.dailyAyahs)
        memorization = result.assignment
        memorizationNext = result.next
        memorizationEnd = result.assignment.to
        memorizationAyahs += result.assignment.ayahCount
      }
      if (revisionNext) {
        const result = allocate(revisionNext, input.revision.dailyAyahs)
        revision = result.assignment
        revisionNext = result.next
        revisionEnd = result.assignment.to
        revisionAyahs += result.assignment.ayahCount
      }
    }
    days.push({ date: isoDate(date), weekday: date.getDay(), isStudyDay, memorization, revision })
  }

  return { days, studyDays, memorizationAyahs, revisionAyahs, memorizationEnd, revisionEnd }
}

export function completedMushafText(point: QuranPoint | null): string {
  return point && point.surah === LAST_POINT.surah && point.ayah === LAST_POINT.ayah ? ' · اكتمل المصحف' : ''
}
