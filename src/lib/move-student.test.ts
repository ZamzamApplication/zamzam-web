import { describe, expect, it } from 'vitest'

import { filterDestinationSheikhs, filterMoveStudents, type MoveStudentCandidate } from './move-student'
import type { SheikhInfo } from './types'

const students: MoveStudentCandidate[] = [
  { id: 1, name: 'أحمد علي', phone: '0101234', student_id: 'A-12', status: 'مقيد', warnings: [], sheikh: { id: 10, name: 'الشيخ محمود' } },
  { id: 2, name: 'يوسف حسن', phone: '0119999', status: 'مقيد', warnings: [], sheikh: { id: 20, name: 'الشيخ عمر' } },
]

const sheikhs: SheikhInfo[] = [
  { id: 10, name: 'الشيخ محمود', circle_id: 1, circle_name: 'حلقة الفجر' },
  { id: 20, name: 'الشيخ عمر', circle_id: 1, circle_name: 'حلقة المغرب' },
  { id: 30, name: 'الشيخ علي', circle_id: 1, circle_name: 'حلقة العصر' },
]

describe('move-student selectors', () => {
  it('searches students by name, custom ID, phone, and current Sheikh', () => {
    expect(filterMoveStudents(students, 'أحمد').map((student) => student.id)).toEqual([1])
    expect(filterMoveStudents(students, 'A-12').map((student) => student.id)).toEqual([1])
    expect(filterMoveStudents(students, '0119999').map((student) => student.id)).toEqual([2])
    expect(filterMoveStudents(students, 'محمود').map((student) => student.id)).toEqual([1])
  })

  it('always excludes the current Sheikh by ID even when names differ or search is blank', () => {
    expect(filterDestinationSheikhs(sheikhs, 10, '').map((sheikh) => sheikh.id)).toEqual([20, 30])
  })

  it('searches destinations by Sheikh and circle name', () => {
    expect(filterDestinationSheikhs(sheikhs, 10, 'عمر').map((sheikh) => sheikh.id)).toEqual([20])
    expect(filterDestinationSheikhs(sheikhs, 10, 'العصر').map((sheikh) => sheikh.id)).toEqual([30])
  })
})
