import { describe, expect, it } from 'vitest'

import { currentMonthValue, financialMonthValue, formatMonth, formatMonthPeriod, monthRange, shiftMonth } from './month'

describe('custom month periods', () => {
  it('moves dates before the configured start day into the previous month', () => {
    expect(currentMonthValue(10, new Date(2026, 6, 9, 12))).toBe('2026-06')
    expect(currentMonthValue(10, new Date(2026, 6, 10, 12))).toBe('2026-07')
  })

  it('groups sessions on both sides of the twentieth into the correct period', () => {
    expect(currentMonthValue(20, new Date(2026, 8, 19, 12))).toBe('2026-08')
    expect(currentMonthValue(20, new Date(2026, 8, 20, 12))).toBe('2026-09')
    expect(currentMonthValue(20, new Date(2026, 9, 19, 12))).toBe('2026-09')
    expect(currentMonthValue(20, new Date(2026, 9, 20, 12))).toBe('2026-10')
    expect(monthRange('2026-09', 20)).toEqual({ start: '2026-09-20', end: '2026-10-19' })
  })

  it('handles year boundaries while shifting', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('returns an inclusive range ending before the next configured start', () => {
    expect(monthRange('2026-02', 10)).toEqual({
      start: '2026-02-10',
      end: '2026-03-09',
    })
  })

  it('labels financial periods using the month containing the most days', () => {
    expect(financialMonthValue('2026-09', 20)).toBe('2026-10')
    expect(financialMonthValue('2026-09', 10)).toBe('2026-09')
    expect(financialMonthValue('2026-09', 1)).toBe('2026-09')
    expect(financialMonthValue('2026-12', 20)).toBe('2027-01')
  })

  it('counts short and leap months and keeps the start month for ties', () => {
    expect(financialMonthValue('2026-02', 16)).toBe('2026-03')
    expect(financialMonthValue('2028-02', 16)).toBe('2028-03')
    expect(financialMonthValue('2026-09', 16)).toBe('2026-09')
    expect(financialMonthValue('2026-03', 16)).toBe('2026-03')
  })
})


describe('majority month labels across pages and reports', () => {
  it('names the screenshot periods November and December', () => {
    expect(financialMonthValue('2026-10', 21)).toBe('2026-11')
    expect(financialMonthValue('2026-11', 21)).toBe('2026-12')
    expect(monthRange('2026-10', 21)).toEqual({ start: '2026-10-21', end: '2026-11-20' })
    expect(formatMonthPeriod('2026-10', 21)).toMatch(new RegExp(`^${formatMonth('2026-11')}`))
    expect(formatMonthPeriod('2026-11', 21)).toMatch(new RegExp(`^${formatMonth('2026-12')}`))
  })

  it('keeps calendar months concise and handles the new year', () => {
    expect(formatMonthPeriod('2026-10', 1)).toBe(formatMonth('2026-10'))
    expect(formatMonthPeriod('2026-12', 21)).toMatch(new RegExp(`^${formatMonth('2027-01')}`))
  })

  it('matches the majority of actual period dates for every supported start day', () => {
    for (const year of [2026, 2028]) for (let month = 1; month <= 12; month++) for (let day = 1; day <= 28; day++) {
      const value = `${year}-${String(month).padStart(2, '0')}`
      const range = monthRange(value, day)
      const counts = new Map<string, number>()
      const date = new Date(`${range.start}T12:00:00`)
      const end = new Date(`${range.end}T12:00:00`)
      while (date <= end) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        counts.set(key, (counts.get(key) || 0) + 1)
        date.setDate(date.getDate() + 1)
      }
      const expected = [...counts].sort((a, b) => b[1] - a[1])[0][0]
      expect(financialMonthValue(value, day)).toBe(expected)
    }
  })
})
