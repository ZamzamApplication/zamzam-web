import { describe, expect, it } from 'vitest'
import { moveStudentWithinStatus, orderStudents } from './student-order'

const students = [
  { id: 1, name: 'يوسف', status: 'مقيد', sort_order: 0 },
  { id: 2, name: 'أحمد', status: 'مقيد', sort_order: 0 },
  { id: 3, name: 'محمود', status: 'ضيف', sort_order: 0 },
]

describe('management student ordering', () => {
  it('uses Arabic alphabetical order before a custom order is saved', () => {
    expect(orderStudents(students).map(student => student.id)).toEqual([2, 3, 1])
  })

  it('uses saved sort order when present', () => {
    const saved = students.map((student, index) => ({ ...student, sort_order: [2, 0, 1][index] }))
    expect(orderStudents(saved).map(student => student.id)).toEqual([2, 3, 1])
  })

  it('moves a student only against neighbors with the same status', () => {
    const moved = moveStudentWithinStatus(students, 1, -1)
    expect(moved.map(student => student.id)).toEqual([1, 3, 2])
  })
})
