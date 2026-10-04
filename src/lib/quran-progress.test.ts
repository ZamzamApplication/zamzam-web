import { describe, expect, it } from 'vitest'
import { continuedProgressRange, isProgressRangeComplete } from './quran-progress'
import { formatQuranRange } from './quran'
import type { QuranProgressInput } from './types'

const draft: QuranProgressInput = {
  student_id: 1, category: 'new_memorization', direction: 'backward',
  range_type: 'surah_ayah', from_surah: 114, from_ayah: 1,
  to_surah: 113, to_ayah: 5, quality_score: 4,
}

describe('direction-aware progress recording', () => {
  it('accepts descending surahs only for backward records', () => {
    expect(isProgressRangeComplete(draft)).toBe(true)
    expect(isProgressRangeComplete({ ...draft, direction: 'forward' })).toBe(false)
    expect(isProgressRangeComplete({ ...draft, direction: undefined })).toBe(false)
  })

  it('always requires ascending ayahs within a surah and valid endpoints', () => {
    expect(isProgressRangeComplete({ ...draft, to_surah: 114, from_ayah: 4, to_ayah: 6 })).toBe(true)
    expect(isProgressRangeComplete({ ...draft, to_surah: 114, from_ayah: 4, to_ayah: 3 })).toBe(false)
    expect(isProgressRangeComplete({ ...draft, from_ayah: 7 })).toBe(false)
    expect(isProgressRangeComplete({ ...draft, quality_score: 0 })).toBe(false)
  })

  it('continues at the previous surah after completing one', () => {
    expect(continuedProgressRange(draft)).toMatchObject({ direction: 'backward', from_surah: 112, from_ayah: 1 })
    expect(continuedProgressRange({ ...draft, to_surah: 114, to_ayah: 4 })).toMatchObject({ from_surah: 114, from_ayah: 5 })
    expect(continuedProgressRange({ ...draft, direction: 'forward', from_surah: 112, to_surah: 113, to_ayah: 5 })).toMatchObject({ from_surah: 114, from_ayah: 1 })
  })

  it('handles backward page ranges and stops at completion', () => {
    const pageDraft = { ...draft, range_type: 'page' as const, from_page: 604, to_page: 602 }
    expect(isProgressRangeComplete(pageDraft)).toBe(true)
    expect(isProgressRangeComplete({ ...pageDraft, direction: 'forward' })).toBe(false)
    expect(continuedProgressRange(pageDraft)).toMatchObject({ from_page: 601, to_page: 601 })
    expect(continuedProgressRange({ ...pageDraft, to_page: 1 })).toMatchObject({ from_page: 0 })
    expect(continuedProgressRange({ ...draft, from_surah: 1, to_surah: 1, to_ayah: 7 })).toMatchObject({ from_surah: 0 })
  })

  it('preserves the recorded range for revision and labels historical direction', () => {
    expect(continuedProgressRange({ ...draft, category: 'recent_revision' })).toMatchObject({ from_surah: 114, to_surah: 113, direction: 'backward' })
    expect(formatQuranRange(draft)).toContain('(عكسي)')
    expect(formatQuranRange({ ...draft, direction: undefined })).not.toContain('(عكسي)')
  })
})
