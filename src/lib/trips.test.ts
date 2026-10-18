import { describe, expect, it } from 'vitest'
import { matchesTripSearch, normalizeTripSearch, parseTripMoney, tripPaymentStatus, tripHeadcount, type TripCheck } from './trips'

const person = { name: 'أَحْمَد إبراهيم علي', phone: '010 1234 5678', student_code: 'S-123', sheikh_name: 'الشيخ يحيى' }

describe('trip participant search', () => {
  it('matches Arabic names without diacritics, hamza differences, or word order', () => {
    expect(matchesTripSearch(person, 'ابراهيم احمد')).toBe(true)
    expect(matchesTripSearch(person, 'يحيي')).toBe(true)
    expect(matchesTripSearch(person, 'أحمد سعيد')).toBe(false)
  })
  it('finds students by code and phone including Arabic numerals', () => {
    expect(matchesTripSearch(person, 's-١٢٣')).toBe(true)
    expect(matchesTripSearch(person, '٠١٠١٢٣٤٥٦٧٨')).toBe(true)
    expect(matchesTripSearch(person, '')).toBe(true)
    expect(normalizeTripSearch('۱۲۳')).toBe('123')
  })
})

describe('trip payment amounts', () => {
  it('converts exact decimal values to minor units without floating point rounding', () => {
    expect(parseTripMoney('19.99')).toBe(1999)
    expect(parseTripMoney('١٥٠٫٥')).toBe(15050)
    expect(parseTripMoney('0')).toBe(0)
    for (const value of ['-1', '1.999', '', 'NaN', '1000001', '1e2']) expect(parseTripMoney(value)).toBeNull()
  })
  it('distinguishes exempt, partially paid, unpaid and fully paid participants', () => {
    expect(tripPaymentStatus({ fee_minor: 15000, paid_minor: 0, payment_exempt: true })).toBe('exempt')
    expect(tripPaymentStatus({ fee_minor: 15000, paid_minor: 5000, payment_exempt: false })).toBe('partial')
    expect(tripPaymentStatus({ fee_minor: 15000, paid_minor: 0, payment_exempt: false })).toBe('unpaid')
    expect(tripPaymentStatus({ fee_minor: 15000, paid_minor: 15000, payment_exempt: false })).toBe('paid')
    expect(tripPaymentStatus({ fee_minor: 0, paid_minor: 0, payment_exempt: false })).toBe('paid')
  })
})


describe('group headcounts', () => {
  const checks: TripCheck[] = [
    { participant_id: 1, group_id: 1, status: 'present', checked_at: null, version: 1 },
    { participant_id: 2, group_id: 2, status: 'pending', checked_at: null, version: 1 },
    { participant_id: 3, group_id: 2, status: 'absent', checked_at: null, version: 1 },
    { participant_id: 4, group_id: null, status: 'present', checked_at: null, version: 1 },
  ]
  it('reports one bus as complete without claiming everyone in the trip is present', () => {
    expect(tripHeadcount(checks, '1').allPresent).toBe(true)
    expect(tripHeadcount(checks).allPresent).toBe(false)
    expect(tripHeadcount(checks).unconfirmed).toBe(2)
    expect(tripHeadcount(checks, '2')).toMatchObject({ expected: 2, present: 0, pending: 1, absent: 1 })
  })
  it('handles unassigned participants and never declares an empty group complete', () => {
    expect(tripHeadcount(checks, 'none')).toMatchObject({ expected: 1, present: 1, allPresent: true })
    expect(tripHeadcount(checks, '99').allPresent).toBe(false)
    expect(tripHeadcount([]).allPresent).toBe(false)
  })
})
