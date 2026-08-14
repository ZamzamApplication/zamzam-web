import { describe, expect, it } from 'vitest'

import { DEFAULT_ATTENDANCE_STATUSES, configuredAttendanceStatuses, countStudentsExceptAbsent } from './attendance'

describe('configuredAttendanceStatuses', () => {
  it('uses defaults for missing or blank settings', () => {
    expect(configuredAttendanceStatuses()).toEqual(DEFAULT_ATTENDANCE_STATUSES)
    expect(configuredAttendanceStatuses([' ', ''])).toEqual(DEFAULT_ATTENDANCE_STATUSES)
  })

  it('trims custom statuses, removes blanks, and preserves first-seen order', () => {
    expect(configuredAttendanceStatuses([' حاضر ', 'متأخر', 'حاضر', ''])).toEqual(['حاضر', 'متأخر'])
  })
})

describe('countStudentsExceptAbsent', () => {
  it('counts every status except the configured absence status', () => {
    const students = [
      { status: 'حاضر' },
      { status: 'غياب' },
      { status: 'غياب بعذر' },
      { status: 'متأخر' },
    ]

    expect(countStudentsExceptAbsent(students, 'غياب')).toBe(3)
    expect(countStudentsExceptAbsent(students, 'غياب بعذر')).toBe(3)
  })
})
