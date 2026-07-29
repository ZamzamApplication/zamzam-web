import { describe, expect, it } from 'vitest'

import { currentMonthValue, monthRange, shiftMonth } from './month'

describe('custom month periods', () => {
  it('moves dates before the configured start day into the previous month', () => {
    expect(currentMonthValue(10, new Date(2026, 6, 9, 12))).toBe('2026-06')
    expect(currentMonthValue(10, new Date(2026, 6, 10, 12))).toBe('2026-07')
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
})
