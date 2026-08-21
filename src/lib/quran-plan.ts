import { SURAHS, surahInfo } from './quran'
import { QURAN_LINE_END_OFFSETS_BASE64 } from './quran-line-data'
import { QURAN_QUARTER_STARTS } from './quran-quarter-data'

export type QuranPoint = { surah: number; ayah: number }
export type QuranPlanUnit = 'ayahs' | 'lines' | 'juz' | 'hizb' | 'quarter' | 'page' | 'half_page'
export type QuranPlanSequenceItem = {
  id: string
  name: string
  totalUnits: number
  url?: string
  episodes?: { title: string; url: string }[]
}
export type QuranPlanTrack = {
  id: string
  name: string
  enabled: boolean
  kind: 'quran' | 'quantity' | 'playlist'
  start: QuranPoint
  unit: QuranPlanUnit
  subject: string
  quantityUnit: string
  startNumber: number
  dailyAmount: number
  cyclic?: boolean
  items?: QuranPlanSequenceItem[]
}
export type QuranPlanInput = {
  startDate: string
  endDate: string
  weekdays: number[]
  tracks: QuranPlanTrack[]
}
export type QuranAssignment = {
  from: QuranPoint | null
  to: QuranPoint | null
  fromNumber: number | null
  toNumber: number | null
  ayahCount: number
  unit: QuranPlanUnit | 'quantity'
  unitAmount: number
  text: string
  completedMushaf: boolean
  links?: { label: string; url: string }[]
}
export type QuranPlanDay = {
  date: string
  weekday: number
  isStudyDay: boolean
  assignments: Record<string, QuranAssignment | null>
}
export type QuranPlanTrackTotal = {
  ayahs: number
  amount: number
  end: QuranPoint | null
  endNumber: number | null
}
export type GeneratedQuranPlan = {
  tracks: QuranPlanTrack[]
  days: QuranPlanDay[]
  studyDays: number
  totals: Record<string, QuranPlanTrackTotal>
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

const quranQuarterStartOffsets = QURAN_QUARTER_STARTS.map(([surah, ayah]) => globalOffset({ surah, ayah }))

const arabicAyahNumber = new Intl.NumberFormat('ar-EG', { useGrouping: false })

function mushafAyahMarker(ayah: number): string {
  return arabicAyahNumber.format(ayah)
}

export function formatPlanRange(from: QuranPoint, to: QuranPoint): string {
  const fromAyah = mushafAyahMarker(from.ayah)
  const toAyah = mushafAyahMarker(to.ayah)
  if (from.surah === to.surah) {
    return from.ayah === to.ayah
      ? `سورة ${surahInfo(from.surah).name} — ${fromAyah}`
      : `سورة ${surahInfo(from.surah).name} — ${fromAyah} : ${toAyah}`
  }
  return `سورة ${surahInfo(from.surah).name} ${fromAyah} ← سورة ${surahInfo(to.surah).name} ${toAyah}`
}

export function formatCompactPlanRange(from: QuranPoint, to: QuranPoint): string {
  const fromAyah = mushafAyahMarker(from.ayah)
  const toAyah = mushafAyahMarker(to.ayah)
  if (from.surah === to.surah) {
    return from.ayah === to.ayah
      ? `سورة ${surahInfo(from.surah).name}: ${fromAyah}`
      : `سورة ${surahInfo(from.surah).name}: ${fromAyah} : ${toAyah}`
  }
  return `سورة ${surahInfo(from.surah).name}: ${fromAyah} ← سورة ${surahInfo(to.surah).name}: ${toAyah}`
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
      fromNumber: null,
      toNumber: null,
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
      fromNumber: null,
      toNumber: null,
      ayahCount: globalOffset(end) - startOffset + 1,
      unit: 'lines',
      unitAmount: lastLine - firstLine + 1,
      text: formatPlanRange(start, end),
      completedMushaf: next === null,
    },
    next,
  }
}

function allocateQuarters(start: QuranPoint, requestedQuarters: number): { assignment: QuranAssignment; next: QuranPoint | null } {
  const startOffset = globalOffset(start)
  let low = 0
  let high = quranQuarterStartOffsets.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (quranQuarterStartOffsets[middle] <= startOffset) low = middle + 1
    else high = middle
  }

  const followingBoundaryIndex = low + requestedQuarters - 1
  const endOffset = followingBoundaryIndex < quranQuarterStartOffsets.length
    ? quranQuarterStartOffsets[followingBoundaryIndex] - 1
    : globalOffset(LAST_POINT)
  const end = pointAtOffset(endOffset)
  const next = nextPoint(end)
  return {
    assignment: {
      from: start,
      to: end,
      fromNumber: null,
      toNumber: null,
      ayahCount: endOffset - startOffset + 1,
      unit: 'quarter',
      unitAmount: requestedQuarters,
      text: formatPlanRange(start, end),
      completedMushaf: next === null,
    },
    next,
  }
}

function allocate(start: QuranPoint, track: QuranPlanTrack) {
  if (track.unit === 'ayahs') return allocateAyahs(start, track.dailyAmount)
  if (track.unit === 'quarter' || track.unit === 'hizb' || track.unit === 'juz') {
    const quartersPerUnit = track.unit === 'quarter' ? 1 : track.unit === 'hizb' ? 4 : 8
    const result = allocateQuarters(start, track.dailyAmount * quartersPerUnit)
    return {
      ...result,
      assignment: { ...result.assignment, unit: track.unit, unitAmount: track.dailyAmount },
    }
  }
  const linesPerUnit: Record<Exclude<QuranPlanUnit, 'ayahs' | 'lines' | 'juz' | 'hizb' | 'quarter'>, number> = {
    page: 15,
    half_page: 8,
  }
  const lineAmount = track.unit === 'lines' ? track.dailyAmount : track.dailyAmount * linesPerUnit[track.unit]
  const result = allocateLines(start, lineAmount)
  return {
    ...result,
    assignment: { ...result.assignment, unit: track.unit, unitAmount: track.dailyAmount },
  }
}

function allocateQuantity(start: number, track: QuranPlanTrack): { assignment: QuranAssignment; next: number } {
  const end = start + track.dailyAmount - 1
  const subject = track.subject.trim()
  const unit = track.quantityUnit.trim()
  return {
    assignment: {
      from: null,
      to: null,
      fromNumber: start,
      toNumber: end,
      ayahCount: 0,
      unit: 'quantity',
      unitAmount: track.dailyAmount,
      text: track.dailyAmount === 1
        ? `${subject} — ${unit} ${start}`
        : `${subject} — من ${unit} ${start} إلى ${end}`,
      completedMushaf: false,
    },
    next: end + 1,
  }
}

type SequenceCursor = { itemIndex: number; unitNumber: number } | null

function youtubeEpisodeUrl(value: string, episode: number): string {
  try {
    const url = new URL(value.trim())
    const playlistId = url.searchParams.get('list')
    if (playlistId) {
      const episodeUrl = new URL('https://www.youtube.com/watch')
      episodeUrl.searchParams.set('list', playlistId)
      episodeUrl.searchParams.set('index', String(episode))
      return episodeUrl.toString()
    }
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0]
      if (videoId) {
        url.hostname = 'www.youtube.com'
        url.pathname = '/watch'
        url.searchParams.set('v', videoId)
      }
    }
    url.searchParams.set('index', String(episode))
    return url.toString()
  } catch {
    return value.trim()
  }
}

function allocateSequence(cursor: SequenceCursor, track: QuranPlanTrack): { assignment: QuranAssignment | null; next: SequenceCursor } {
  if (!cursor || !track.items?.length) return { assignment: null, next: null }
  let itemIndex = cursor.itemIndex
  let unitNumber = cursor.unitNumber
  let remaining = track.dailyAmount
  let allocated = 0
  const parts: string[] = []
  const links: { label: string; url: string }[] = []
  let firstNumber: number | null = null
  let lastNumber: number | null = null

  while (remaining > 0 && itemIndex < track.items.length) {
    const item = track.items[itemIndex]
    const available = item.totalUnits - unitNumber + 1
    if (available <= 0) {
      itemIndex += 1
      unitNumber = 1
      continue
    }
    const count = Math.min(remaining, available)
    const endNumber = unitNumber + count - 1
    if (firstNumber === null) firstNumber = unitNumber
    lastNumber = endNumber
    if (track.kind === 'playlist') {
      parts.push(count === 1
        ? `${item.name} — الحلقة ${unitNumber}: ${item.episodes?.[unitNumber - 1]?.title || ''}`.trim()
        : `${item.name} — الحلقات ${unitNumber}–${endNumber}`)
      for (let episode = unitNumber; episode <= endNumber; episode += 1) {
        const importedEpisode = item.episodes?.[episode - 1]
        links.push({
          label: importedEpisode?.title || `${item.name} — الحلقة ${episode}`,
          url: importedEpisode?.url || youtubeEpisodeUrl(item.url || '', episode),
        })
      }
    } else {
      const unit = track.quantityUnit.trim()
      parts.push(count === 1
        ? `${item.name} — ${unit} ${unitNumber}`
        : `${item.name} — من ${unit} ${unitNumber} إلى ${endNumber}`)
    }
    allocated += count
    remaining -= count
    unitNumber = endNumber + 1
    if (unitNumber > item.totalUnits) {
      itemIndex += 1
      unitNumber = 1
    }
  }

  if (allocated === 0) return { assignment: null, next: null }
  return {
    assignment: {
      from: null,
      to: null,
      fromNumber: firstNumber,
      toNumber: lastNumber,
      ayahCount: 0,
      unit: 'quantity',
      unitAmount: allocated,
      text: parts.join(' · '),
      completedMushaf: false,
      links: links.length ? links : undefined,
    },
    next: itemIndex < track.items.length ? { itemIndex, unitNumber } : null,
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

  const enabledTracks = input.tracks.filter(track => track.enabled)
  const ids = new Set<string>()
  for (const track of enabledTracks) {
    const invalidQuran = track.kind === 'quran' && (!isValidQuranPoint(track.start) || !['ayahs', 'lines', 'juz', 'hizb', 'quarter', 'page', 'half_page'].includes(track.unit))
    const hasSequence = (track.kind === 'quantity' || track.kind === 'playlist') && track.items !== undefined
    const invalidSequence = hasSequence && (!track.items?.length || track.items.some(item => (
      !item.id.trim() || !item.name.trim() || !Number.isInteger(item.totalUnits) || item.totalUnits < 1
      || (track.kind === 'playlist' && (!item.url?.trim() || !item.episodes?.length || item.episodes.length !== item.totalUnits))
    )) || (track.kind === 'quantity' && (!Number.isInteger(track.startNumber) || track.startNumber < 1 || track.startNumber > (track.items?.[0]?.totalUnits ?? 0))))
    const invalidLegacyQuantity = track.kind === 'quantity' && !hasSequence && (!track.subject.trim() || !track.quantityUnit.trim() || !Number.isInteger(track.startNumber) || track.startNumber < 1)
    const invalidPlaylist = track.kind === 'playlist' && !hasSequence
    if (!track.id.trim() || ids.has(track.id) || !track.name.trim() || invalidQuran || invalidSequence || invalidLegacyQuantity || invalidPlaylist || !Number.isInteger(track.dailyAmount) || track.dailyAmount < 1) {
      throw new Error('invalid_track')
    }
    ids.add(track.id)
  }
  if (enabledTracks.length === 0) throw new Error('track_required')

  const nextPoints = new Map(enabledTracks.filter(track => track.kind === 'quran').map(track => [track.id, track.start as QuranPoint | null]))
  const nextNumbers = new Map(enabledTracks.filter(track => track.kind === 'quantity' && track.items === undefined).map(track => [track.id, track.startNumber]))
  const sequenceCursors = new Map(enabledTracks.filter(track => track.kind !== 'quran' && track.items !== undefined).map(track => [track.id, { itemIndex: 0, unitNumber: track.kind === 'quantity' ? track.startNumber : 1 } as SequenceCursor]))
  const totals: Record<string, QuranPlanTrackTotal> = Object.fromEntries(
    enabledTracks.map(track => [track.id, { ayahs: 0, amount: 0, end: null, endNumber: null }]),
  )
  let studyDays = 0
  const selectedDays = new Set(input.weekdays)
  const days: QuranPlanDay[] = []

  for (let index = 0; index < calendarDays; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const isStudyDay = selectedDays.has(date.getDay())
    const assignments: Record<string, QuranAssignment | null> = Object.fromEntries(
      enabledTracks.map(track => [track.id, null]),
    )
    if (isStudyDay) {
      studyDays += 1
      for (const track of enabledTracks) {
        if (track.kind !== 'quran' && track.items !== undefined) {
          const result = allocateSequence(sequenceCursors.get(track.id) ?? null, track)
          assignments[track.id] = result.assignment
          sequenceCursors.set(track.id, result.next)
          if (result.assignment) {
            totals[track.id].endNumber = result.assignment.toNumber
            totals[track.id].amount += result.assignment.unitAmount
          }
        } else if (track.kind === 'quantity') {
          const next = nextNumbers.get(track.id)
          if (next == null) continue
          const result = allocateQuantity(next, track)
          assignments[track.id] = result.assignment
          nextNumbers.set(track.id, result.next)
          totals[track.id].endNumber = result.assignment.toNumber
          totals[track.id].amount += result.assignment.unitAmount
        } else {
          const next = nextPoints.get(track.id)
          if (!next) continue
          const result = allocate(next, track)
          assignments[track.id] = result.assignment
          nextPoints.set(track.id, result.next ?? (track.cyclic ? { surah: 1, ayah: 1 } : null))
          totals[track.id].end = result.assignment.to
          totals[track.id].ayahs += result.assignment.ayahCount
          totals[track.id].amount += result.assignment.unitAmount
        }
      }
    }
    days.push({ date: isoDate(date), weekday: date.getDay(), isStudyDay, assignments })
  }

  return { tracks: enabledTracks.map(track => ({ ...track, start: { ...track.start } })), days, studyDays, totals }
}

export function completedMushafText(point: QuranPoint | null): string {
  return point && point.surah === LAST_POINT.surah && point.ayah === LAST_POINT.ayah ? ' · اكتمل المصحف' : ''
}
