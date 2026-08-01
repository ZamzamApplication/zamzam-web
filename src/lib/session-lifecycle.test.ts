import { describe, expect, it } from 'vitest'

import { canPermanentlyDeleteSession, sessionDeletionConfirmation } from './session-lifecycle'

describe('session deletion lifecycle', () => {
  it('blocks permanent deletion of confirmed sessions', () => {
    expect(canPermanentlyDeleteSession({ is_confirmed: true })).toBe(false)
  })

  it('allows draft and reopened sessions to reach permanent deletion', () => {
    expect(canPermanentlyDeleteSession({ is_confirmed: false })).toBe(true)
  })

  it('makes the reopened-session consequence explicit', () => {
    expect(sessionDeletionConfirmation({ status: 'reopened' })).toContain('المعاد فتحها')
    expect(sessionDeletionConfirmation({ status: 'draft' })).toContain('مسودة')
  })
})
