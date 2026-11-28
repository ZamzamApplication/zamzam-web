/** Shared colours for student enrolment statuses (مقيد، ضيف، ...). */
export const STUDENT_STATUS_STYLES: Record<string, string> = {
  'مقيد': 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'ضيف': 'bg-sky-100/70 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  'منقطع': 'bg-amber-100/70 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'مستبعد': 'bg-red-100/70 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'غير مقيد': 'bg-slate-100/70 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
}

export function studentStatusClass(status: string) {
  return STUDENT_STATUS_STYLES[status] || STUDENT_STATUS_STYLES['غير مقيد']
}

export const STUDENT_STATUSES = ['مقيد', 'مستبعد', 'منقطع', 'ضيف', 'غير مقيد'] as const
