import { describe, expect, it } from 'vitest'

import { retainedCompletionDates, type PlanConfiguration } from './personal-plans'

function configuration(): PlanConfiguration {
  return {
    planOwnerType: 'student', studentName: 'أحمد', startDate: '2026-10-01', endDate: '2026-10-03',
    weekdays: [0, 1, 2, 3, 4, 5, 6], includeCompletionCheckboxes: true,
    tracks: [{ id: 'hifz', name: 'الحفظ', kind: 'quran', enabled: true, dailyAmount: 1, unit: 'ayahs', start: { surah: 1, ayah: 1 }, subject: '', quantityUnit: 'صفحة', startNumber: 1 }],
  }
}

describe('saved plan completion when editing', () => {
  it('keeps progress when only descriptive information changes', () => {
    const before = configuration()
    const after = { ...before, studentName: 'محمد', includeCompletionCheckboxes: false }
    expect(retainedCompletionDates(before, after, ['2026-10-01', '2026-10-02'])).toEqual(['2026-10-01', '2026-10-02'])
  })

  it('clears completion for assignments changed by a new daily amount', () => {
    const before = configuration()
    const after = { ...before, tracks: [{ ...before.tracks[0], dailyAmount: 2 }] }
    expect(retainedCompletionDates(before, after, ['2026-10-01', '2026-10-02'])).toEqual([])
  })

  it('keeps unchanged days when shortening a plan', () => {
    const before = configuration()
    expect(retainedCompletionDates(before, { ...before, endDate: '2026-10-02' }, ['2026-10-01', '2026-10-03'])).toEqual(['2026-10-01'])
  })

  it('removes obsolete completion dates before saving a new plan', () => {
    expect(retainedCompletionDates(undefined, configuration(), ['2026-10-01', '2026-11-01'])).toEqual(['2026-10-01'])
  })
})
