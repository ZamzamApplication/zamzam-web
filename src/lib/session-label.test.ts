import { describe, expect, it } from 'vitest'
import { sessionDateLabel, sessionDateLabelFromCollection, sessionDescriptor } from './session-label'

describe('same-day session labels', () => {
  it('uses the optional name when present', () => {
    expect(sessionDescriptor({ name: ' الصباحية ', daily_sequence: 2 })).toBe('الصباحية')
  })

  it('falls back to the persisted daily sequence', () => {
    expect(sessionDescriptor({ daily_sequence: 2 })).toBe('جلسة 2')
    expect(sessionDateLabel(
      { date: '2026-08-11', daily_sequence: 2 },
      date => `DATE:${date}`,
    )).toBe('DATE:2026-08-11 — جلسة 2')
  })

  it('shows only the date for a single unnamed session', () => {
    expect(sessionDescriptor({ daily_sequence: 1 })).toBe('')
    expect(sessionDateLabel(
      { date: '2026-08-11', daily_sequence: 1 },
      date => `DATE:${date}`,
    )).toBe('DATE:2026-08-11')
  })

  it('labels the first session when another session exists on the same date', () => {
    const sessions = [
      { id: 1, date: '2026-08-11', daily_sequence: 1 },
      { id: 2, date: '2026-08-11', daily_sequence: 2 },
      { id: 3, date: '2026-08-12', daily_sequence: 1 },
    ]
    expect(sessionDateLabelFromCollection(sessions[0], sessions, date => date)).toBe('2026-08-11 — جلسة 1')
    expect(sessionDateLabelFromCollection(sessions[2], sessions, date => date)).toBe('2026-08-12')
    expect(sessionDateLabelFromCollection(
      { id: 4, date: '2026-08-13', daily_sequence: 2 },
      [{ id: 4, date: '2026-08-13', daily_sequence: 2 }],
      date => date,
    )).toBe('2026-08-13')
  })
})
