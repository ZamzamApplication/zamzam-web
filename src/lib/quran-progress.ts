import type { QuranProgressInput } from './types'
import { surahInfo, nextQuranPoint, nextReverseQuranPoint } from './quran'

export function isProgressRangeComplete(draft?: QuranProgressInput): boolean {
  if (!draft || draft.quality_score < 1 || draft.quality_score > 5) return false
  const backward = draft.direction === 'backward'
  if (draft.range_type === 'page') {
    const from = draft.from_page || 0
    const to = draft.to_page || 0
    return from >= 1 && from <= 604 && to >= 1 && to <= 604 && (backward ? to <= from : to >= from)
  }
  const fromSurah = draft.from_surah || 0
  const toSurah = draft.to_surah || 0
  const fromAyah = draft.from_ayah || 0
  const toAyah = draft.to_ayah || 0
  if (fromSurah < 1 || fromSurah > 114 || toSurah < 1 || toSurah > 114
    || fromAyah < 1 || fromAyah > surahInfo(fromSurah).ayahs
    || toAyah < 1 || toAyah > surahInfo(toSurah).ayahs) return false
  return fromSurah === toSurah ? toAyah >= fromAyah : backward ? toSurah < fromSurah : toSurah > fromSurah
}

export function continuedProgressRange(previous: QuranProgressInput): Partial<QuranProgressInput> {
  const direction = previous.direction || 'forward'
  if (previous.category !== 'new_memorization') {
    return {
      direction, range_type: previous.range_type,
      from_surah: previous.from_surah, from_ayah: previous.from_ayah,
      to_surah: previous.to_surah, to_ayah: previous.to_ayah,
      from_page: previous.from_page, to_page: previous.to_page,
    }
  }
  if (previous.range_type === 'page') {
    const page = (previous.to_page || previous.from_page || 1) + (direction === 'backward' ? -1 : 1)
    return { direction, range_type: 'page', from_surah: null, from_ayah: null, to_surah: null, to_ayah: null, from_page: page >= 1 && page <= 604 ? page : 0, to_page: page >= 1 && page <= 604 ? page : 0 }
  }
  const point = { surah: previous.to_surah || previous.from_surah || 1, ayah: previous.to_ayah || previous.from_ayah || 1 }
  const next = direction === 'backward' ? nextReverseQuranPoint(point) : nextQuranPoint(point)
  return { direction, range_type: 'surah_ayah', from_surah: next?.surah || 0, from_ayah: next?.ayah || 0, to_surah: next?.surah || 0, to_ayah: next?.ayah || 0 }
}
