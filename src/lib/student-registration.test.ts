import { describe, expect, it } from 'vitest'
import { approvalStudentData, selectedStudentData, studentFieldSummary } from './student-registration'

describe('registration student data', () => {
  it('submits only selected fields and preserves a required No answer', () => {
    expect(selectedStudentData({ phone: '0123456', birthday: '', student_id: 'private', quran_progress_enabled: false }, ['phone', 'birthday', 'quran_progress_enabled']))
      .toEqual({ phone: '0123456', quran_progress_enabled: false })
    expect(selectedStudentData({ phone: 'old form value' }, [])).toEqual({})
  })

  it('sends explicit cleared values when reviewing previously submitted details', () => {
    const reviewed = approvalStudentData({ phone: '', birthday: '', student_id: 'corrected', sheikh_id: undefined, category_ids: [], quran_progress_enabled: false })
    expect(reviewed).toMatchObject({ phone: null, birthday: null, student_id: 'corrected', sheikh_id: null, category_ids: [], quran_progress_enabled: false })
    expect(JSON.parse(JSON.stringify(reviewed)).sheikh_id).toBeNull()
  })

  it('shows guardian details and tenant option names during review', () => {
    expect(studentFieldSummary({ parent_phones: [{ name: 'فاطمة', parent_type: 'أم', phone_number: '0123456' }] }, 'parent_phones', {})).toBe('أم (فاطمة): 0123456')
    expect(studentFieldSummary({ category_ids: [1] }, 'category_ids', { category_ids: [{ id: 1, name: 'مبتدئون' }] })).toBe('مبتدئون')
  })
})
