import { describe, expect, it } from 'vitest'

import { completionState, retainedCompletionItems, retainedCompletionDates, type PlanConfiguration } from './personal-plans'
import { generateQuranPlan } from './quran-plan'

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

describe('independent daily item completion', () => {
  const twoTracks = () => {
    const config = configuration()
    config.tracks.push({ ...config.tracks[0], id: 'revision', name: 'المراجعة' })
    return config
  }

  it('completes a day only after every assigned item is marked', () => {
    const plan = generateQuranPlan(twoTracks())
    expect(completionState(plan, [], { '2026-10-01': ['hifz'] }, 'item').completedDates).toEqual([])
    expect(completionState(plan, [], { '2026-10-01': ['hifz', 'revision'] }, 'item').completedDates).toEqual(['2026-10-01'])
  })

  it('expands existing whole-day completion and keeps partial completion across modes', () => {
    const plan = generateQuranPlan(twoTracks())
    const items = completionState(plan, ['2026-10-01'], { '2026-10-02': ['hifz'] }, 'item')
    expect(items.completedItems['2026-10-01']).toEqual(['hifz', 'revision'])
    expect(completionState(plan, items.completedDates, items.completedItems, 'day').completedItems).toEqual(items.completedItems)
  })

  it('retains unaffected items when another assignment changes', () => {
    const before = twoTracks()
    const after = { ...before, tracks: [{ ...before.tracks[0], dailyAmount: 2 }, before.tracks[1]] }
    expect(retainedCompletionItems(before, after, { '2026-10-01': ['hifz', 'revision'] })).toEqual({ '2026-10-01': ['revision'] })
  })

  it('excludes paused and exhausted items from the required checkboxes', () => {
    const config = twoTracks()
    config.tracks[1].weekdays = [5]
    const state = completionState(generateQuranPlan(config), [], { '2026-10-01': ['hifz'] }, 'item')
    expect(state.assignments['2026-10-01']).toEqual(['hifz'])
    expect(state.completedDates).toContain('2026-10-01')
  })
})
