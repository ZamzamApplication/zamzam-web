import { describe, expect, it } from 'vitest'

import { auditActionLabel, formatAuditDetails } from './audit-log'

describe('audit log presentation', () => {
  it('localizes known actions and keeps unknown actions readable', () => {
    expect(auditActionLabel('session.reopened')).toBe('إعادة فتح حلقة')
    expect(auditActionLabel('custom.new_action')).toBe('custom ← new action')
  })

  it('formats key-value and JSON details without discarding values', () => {
    expect(formatAuditDetails('session=3; reason=تصحيح')).toBe('الحلقة: 3 · السبب: تصحيح')
    expect(formatAuditDetails('{"count":2,"changed":1}')).toBe('العدد: 2 · المعدّل: 1')
  })

  it('provides a clear empty-details label', () => {
    expect(formatAuditDetails(null)).toBe('لا توجد تفاصيل إضافية')
  })
})
