import { describe, expect, it } from 'vitest'

import { DEFAULT_ATTENDANCE_STATUSES, configuredAttendanceStatuses } from './attendance'

describe('configuredAttendanceStatuses', () => {
  it('uses defaults for missing or blank settings', () => {
    expect(configuredAttendanceStatuses()).toEqual(DEFAULT_ATTENDANCE_STATUSES)
    expect(configuredAttendanceStatuses([' ', ''])).toEqual(DEFAULT_ATTENDANCE_STATUSES)
  })

  it('trims custom statuses, removes blanks, and preserves first-seen order', () => {
    expect(configuredAttendanceStatuses([' حاضر ', 'متأخر', 'حاضر', ''])).toEqual(['حاضر', 'متأخر'])
  })
})
