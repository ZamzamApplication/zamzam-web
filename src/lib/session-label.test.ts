import { describe, expect, it } from 'vitest'
import { sessionDateLabel, sessionDescriptor } from './session-label'

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
})
