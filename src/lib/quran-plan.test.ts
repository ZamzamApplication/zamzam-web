import { describe, expect, it } from 'vitest'
import { formatPlanRange, generateQuranPlan } from './quran-plan'

describe('Quran plan generation', () => {
  it('allocates inclusive daily ayah ranges across surahs', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-18', weekdays: [0, 2],
      memorization: { enabled: true, start: { surah: 1, ayah: 6 }, unit: 'ayahs', dailyAmount: 3 },
      revision: { enabled: false, start: { surah: 1, ayah: 1 }, unit: 'ayahs', dailyAmount: 1 },
    })
    expect(plan.days[0].memorization?.to).toEqual({ surah: 2, ayah: 1 })
    expect(plan.days[1].isStudyDay).toBe(false)
    expect(plan.days[2].memorization?.from).toEqual({ surah: 2, ayah: 2 })
    expect(plan.memorizationAyahs).toBe(6)
  })

  it('generates memorization and revision independently', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-16', weekdays: [0],
      memorization: { enabled: true, start: { surah: 2, ayah: 1 }, unit: 'ayahs', dailyAmount: 5 },
      revision: { enabled: true, start: { surah: 3, ayah: 10 }, unit: 'ayahs', dailyAmount: 20 },
    })
    expect(plan.days[0].memorization?.to.ayah).toBe(5)
    expect(plan.days[0].revision?.to.ayah).toBe(29)
  })

  it('stops safely at the end of the Mushaf', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-18', weekdays: [0, 1, 2],
      memorization: { enabled: true, start: { surah: 114, ayah: 5 }, unit: 'ayahs', dailyAmount: 5 },
      revision: { enabled: false, start: { surah: 1, ayah: 1 }, unit: 'ayahs', dailyAmount: 1 },
    })
    expect(plan.days[0].memorization?.ayahCount).toBe(2)
    expect(plan.days[0].memorization?.completedMushaf).toBe(true)
    expect(plan.days[1].memorization).toBeNull()
  })

  it('uses the offline Madani Mushaf mapping for line-based plans', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-16', weekdays: [0],
      memorization: { enabled: true, start: { surah: 1, ayah: 3 }, unit: 'lines', dailyAmount: 2 },
      revision: { enabled: false, start: { surah: 1, ayah: 1 }, unit: 'ayahs', dailyAmount: 1 },
    })
    expect(plan.days[0].memorization?.to).toEqual({ surah: 1, ayah: 6 })
    expect(plan.days[0].memorization?.unitAmount).toBe(2)
  })

  it('formats single and cross-surah ranges clearly', () => {
    expect(formatPlanRange({ surah: 1, ayah: 1 }, { surah: 1, ayah: 3 })).toContain('من الآية 1 إلى 3')
    expect(formatPlanRange({ surah: 1, ayah: 7 }, { surah: 2, ayah: 2 })).toContain('إلى سورة البقرة')
  })
})
