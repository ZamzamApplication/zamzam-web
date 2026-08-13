import { SURAHS, surahInfo } from './quran'
import { QURAN_LINE_END_OFFSETS_BASE64 } from './quran-line-data'

export type QuranPoint = { surah: number; ayah: number }
export type QuranPlanUnit = 'ayahs' | 'lines'
export type QuranPlanTrack = {
  enabled: boolean
  start: QuranPoint
  unit: QuranPlanUnit
  dailyAmount: number
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
  unit: QuranPlanUnit
  unitAmount: number
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
  memorizationAmount: number
  revisionAmount: number
  memorizationEnd: QuranPoint | null
  revisionEnd: QuranPoint | null
}

const LAST_POINT: QuranPoint = { surah: 114, ayah: surahInfo(114).ayahs }
let lineEndOffsets: number[] | null = null

function quranLineEndOffsets(): number[] {
  if (lineEndOffsets) return lineEndOffsets
  const binary = globalThis.atob(QURAN_LINE_END_OFFSETS_BASE64)
  lineEndOffsets = Array.from({ length: binary.length / 2 }, (_, index) => (
    binary.charCodeAt(index * 2) | (binary.charCodeAt(index * 2 + 1) << 8)
  ))
  return lineEndOffsets
}

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

function globalOffset(point: QuranPoint): number {
  let offset = point.ayah
  for (let surah = 1; surah < point.surah; surah += 1) offset += surahInfo(surah).ayahs
  return offset
}

function pointAtOffset(offset: number): QuranPoint {
  let remaining = offset
  for (const surah of SURAHS) {
    if (remaining <= surah.ayahs) return { surah: surah.number, ayah: remaining }
    remaining -= surah.ayahs
  }
  return LAST_POINT
}

export function formatPlanRange(from: QuranPoint, to: QuranPoint): string {
  if (from.surah === to.surah) {
    return from.ayah === to.ayah
      ? `سورة ${surahInfo(from.surah).name} — الآية ${from.ayah}`
      : `سورة ${surahInfo(from.surah).name} — من الآية ${from.ayah} إلى ${to.ayah}`
  }
  return `من سورة ${surahInfo(from.surah).name}، الآية ${from.ayah} إلى سورة ${surahInfo(to.surah).name}، الآية ${to.ayah}`
}

function allocateAyahs(start: QuranPoint, requestedAyahs: number): { assignment: QuranAssignment; next: QuranPoint | null } {
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
      unit: 'ayahs',
      unitAmount: count,
      text: formatPlanRange(start, end),
      completedMushaf: next === null,
    },
    next,
  }
}

function allocateLines(start: QuranPoint, requestedLines: number): { assignment: QuranAssignment; next: QuranPoint | null } {
  const offsets = quranLineEndOffsets()
  const startOffset = globalOffset(start)
  let low = 0
  let high = offsets.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (offsets[middle] < startOffset) low = middle + 1
    else high = middle
  }
  const firstLine = Math.min(low, offsets.length - 1)
  const lastLine = Math.min(firstLine + requestedLines - 1, offsets.length - 1)
  const end = pointAtOffset(offsets[lastLine])
  const next = nextPoint(end)
  return {
    assignment: {
      from: start,
      to: end,
      ayahCount: globalOffset(end) - startOffset + 1,
      unit: 'lines',
      unitAmount: lastLine - firstLine + 1,
      text: formatPlanRange(start, end),
      completedMushaf: next === null,
    },
    next,
  }
}

function allocate(start: QuranPoint, track: QuranPlanTrack) {
  return track.unit === 'lines'
    ? allocateLines(start, track.dailyAmount)
    : allocateAyahs(start, track.dailyAmount)
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
    if (track.enabled && (!isValidQuranPoint(track.start) || !['ayahs', 'lines'].includes(track.unit) || !Number.isInteger(track.dailyAmount) || track.dailyAmount < 1)) {
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
  let memorizationAmount = 0
  let revisionAmount = 0
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
        const result = allocate(memorizationNext, input.memorization)
        memorization = result.assignment
        memorizationNext = result.next
        memorizationEnd = result.assignment.to
        memorizationAyahs += result.assignment.ayahCount
        memorizationAmount += result.assignment.unitAmount
      }
      if (revisionNext) {
        const result = allocate(revisionNext, input.revision)
        revision = result.assignment
        revisionNext = result.next
        revisionEnd = result.assignment.to
        revisionAyahs += result.assignment.ayahCount
        revisionAmount += result.assignment.unitAmount
      }
    }
    days.push({ date: isoDate(date), weekday: date.getDay(), isStudyDay, memorization, revision })
  }

  return { days, studyDays, memorizationAyahs, revisionAyahs, memorizationAmount, revisionAmount, memorizationEnd, revisionEnd }
}

export function completedMushafText(point: QuranPoint | null): string {
  return point && point.surah === LAST_POINT.surah && point.ayah === LAST_POINT.ayah ? ' · اكتمل المصحف' : ''
}
