import type { Session } from './types'

export function canPermanentlyDeleteSession(session: Pick<Session, 'is_confirmed'>): boolean {
  return !session.is_confirmed
}

export function sessionDeletionConfirmation(session: Pick<Session, 'status'>): string {
  if (session.status === 'reopened') {
    return 'سيتم حذف الحلقة المعاد فتحها نهائياً مع جميع سجلات الحضور والمتابعة المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.'
  }
  return 'سيتم حذف مسودة الحلقة نهائياً مع جميع سجلات الحضور والمتابعة المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.'
}
