import { describe, expect, it } from 'vitest'
import { addDays, clampDay, competitionDays, elapsedDays, entryKey, entrySet, localToday, podiumOrder, publicToken, type Trophy } from './competitions'

describe('competition dates', () => {
  it('walks calendar days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(competitionDays('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02'])
  })
  it('only exposes elapsed days and clamps navigation to the competition window', () => {
    expect(elapsedDays('2026-11-01', '2026-11-30', '2026-10-31')).toEqual([])
    expect(elapsedDays('2026-11-01', '2026-11-30', '2026-11-03')).toHaveLength(3)
    expect(elapsedDays('2026-11-01', '2026-11-05', '2026-12-25')).toHaveLength(5)
    expect(clampDay('2026-10-01', '2026-11-01', '2026-11-30')).toBe('2026-11-01')
    expect(clampDay('2026-12-09', '2026-11-01', '2026-11-30')).toBe('2026-11-30')
  })
  it('uses the local calendar day, not UTC', () => {
    expect(localToday(new Date(2026, 10, 25, 4, 30))).toBe('2026-11-25')
  })
})

describe('entries and links', () => {
  it('indexes entries by participant and day', () => {
    const set = entrySet([{ participant_id: 3, date: '2026-11-02', points: 1 }])
    expect(set.has(entryKey(3, '2026-11-02'))).toBe(true)
    expect(set.has(entryKey(3, '2026-11-03'))).toBe(false)
  })
  it('extracts the token from the API public url', () => {
    expect(publicToken('https://zamzam-web.fly.dev/leaderboard/abc_123')).toBe('abc_123')
    expect(publicToken(null)).toBeNull()
  })
})

describe('podium', () => {
  const row = (name: string, trophy: Trophy | null) => ({ name, trophy })
  it('centres the winner between second and third', () => {
    expect(podiumOrder([row('a', 'gold'), row('b', 'silver'), row('c', 'bronze'), row('d', null)]).map(r => r.name)).toEqual(['b', 'a', 'c'])
  })
  it('keeps ties as equal trophies and never shows rows without points', () => {
    expect(podiumOrder([row('a', 'gold'), row('b', 'gold'), row('c', 'gold'), row('d', null)]).map(r => r.trophy)).toEqual(['gold', 'gold', 'gold'])
    expect(podiumOrder([row('a', 'gold'), row('b', null)]).map(r => r.name)).toEqual(['a'])
    expect(podiumOrder([row('a', null)])).toEqual([])
  })
})
