import { describe, expect, it } from 'vitest'
import { formatPlanRange, generateQuranPlan, type QuranPlanTrack } from './quran-plan'

function quranTrack(id: string, start: { surah: number; ayah: number }, dailyAmount: number, unit: 'ayahs' | 'lines' = 'ayahs'): QuranPlanTrack {
  return { id, name: id, enabled: true, kind: 'quran', start, unit, dailyAmount, subject: '', quantityUnit: 'صفحة', startNumber: 1 }
}

describe('Quran plan generation', () => {
  it('allocates inclusive daily ayah ranges across surahs', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-18', weekdays: [0, 2],
      tracks: [quranTrack('memorization', { surah: 1, ayah: 6 }, 3)],
    })
    expect(plan.days[0].assignments.memorization?.to).toEqual({ surah: 2, ayah: 1 })
    expect(plan.days[1].isStudyDay).toBe(false)
    expect(plan.days[2].assignments.memorization?.from).toEqual({ surah: 2, ayah: 2 })
    expect(plan.totals.memorization.ayahs).toBe(6)
  })

  it('generates any number of independent tracks', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-16', weekdays: [0],
      tracks: [
        quranTrack('memorization', { surah: 2, ayah: 1 }, 5),
        quranTrack('revision', { surah: 3, ayah: 10 }, 20),
        quranTrack('listening', { surah: 4, ayah: 1 }, 3),
      ],
    })
    expect(plan.days[0].assignments.memorization?.to).toEqual({ surah: 2, ayah: 5 })
    expect(plan.days[0].assignments.revision?.to).toEqual({ surah: 3, ayah: 29 })
    expect(plan.days[0].assignments.listening?.to).toEqual({ surah: 4, ayah: 3 })
  })

  it('generates sequential non-Quran assignments such as book pages', () => {
    const book: QuranPlanTrack = {
      ...quranTrack('reading', { surah: 1, ayah: 1 }, 10),
      name: 'قراءة', kind: 'quantity', subject: 'كتاب الرحيق المختوم', quantityUnit: 'صفحة', startNumber: 21,
    }
    const plan = generateQuranPlan({ startDate: '2026-08-16', endDate: '2026-08-17', weekdays: [0, 1], tracks: [book] })
    expect(plan.days[0].assignments.reading?.text).toContain('من صفحة 21 إلى 30')
    expect(plan.days[1].assignments.reading?.text).toContain('من صفحة 31 إلى 40')
    expect(plan.totals.reading.amount).toBe(20)
    expect(plan.totals.reading.endNumber).toBe(40)
  })

  it('stops safely at the end of the Mushaf', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-18', weekdays: [0, 1, 2],
      tracks: [quranTrack('memorization', { surah: 114, ayah: 5 }, 5)],
    })
    expect(plan.days[0].assignments.memorization?.ayahCount).toBe(2)
    expect(plan.days[0].assignments.memorization?.completedMushaf).toBe(true)
    expect(plan.days[1].assignments.memorization).toBeNull()
  })

  it('uses the offline Madani Mushaf mapping for line-based plans', () => {
    const plan = generateQuranPlan({
      startDate: '2026-08-16', endDate: '2026-08-16', weekdays: [0],
      tracks: [quranTrack('memorization', { surah: 1, ayah: 3 }, 2, 'lines')],
    })
    expect(plan.days[0].assignments.memorization?.to).toEqual({ surah: 1, ayah: 6 })
    expect(plan.days[0].assignments.memorization?.unitAmount).toBe(2)
  })

  it('formats single and cross-surah ranges clearly', () => {
    expect(formatPlanRange({ surah: 1, ayah: 1 }, { surah: 1, ayah: 3 })).toContain('من الآية 1 إلى 3')
    expect(formatPlanRange({ surah: 1, ayah: 7 }, { surah: 2, ayah: 2 })).toContain('إلى سورة البقرة')
  })
})
