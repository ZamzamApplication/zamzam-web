import { describe, expect, it } from 'vitest'

import { majorToMinor, minorToInput, selectedOutstandingTotal } from './subscriptions'
import type { SubscriptionMonthRecord } from './types'

const record = (id: number, fee_minor: number, is_paid = false): SubscriptionMonthRecord => ({
  id,
  student_id: id,
  student_name: `طالب ${id}`,
  student_code: null,
  sheikh_id: null,
  sheikh_name: null,
  period_start: '2026-08-01',
  period_end: '2026-08-31',
  fee_minor,
  is_paid,
  payment_date: null,
  payment_method: null,
  payment_note: null,
  receipt_number: null,
})

describe('subscription money helpers', () => {
  it('converts decimal input to exact integer minor units', () => {
    expect(majorToMinor('125')).toBe(12500)
    expect(majorToMinor('125.5')).toBe(12550)
    expect(majorToMinor('125,05')).toBe(12505)
    expect(minorToInput(12505)).toBe('125.05')
  })

  it('rejects negative, over-precise, and non-numeric fees', () => {
    expect(majorToMinor('-1')).toBeNull()
    expect(majorToMinor('1.001')).toBeNull()
    expect(majorToMinor('abc')).toBeNull()
  })

  it('totals only selected unpaid records', () => {
    expect(selectedOutstandingTotal([
      record(1, 10000),
      record(2, 20000, true),
      record(3, 30000),
    ], new Set([1, 2]))).toBe(10000)
  })
})
