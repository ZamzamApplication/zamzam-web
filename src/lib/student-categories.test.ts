import { describe, expect, it } from 'vitest'
import { toggleCategorySelection, toggleStudentGroupSelection } from './student-categories'

const students = [
  { id: 1, category_ids: [10, 20] },
  { id: 2, category_ids: [10] },
  { id: 3, category_ids: [20] },
]

describe('student category session selection', () => {
  it('unions categories without duplicate students', () => {
    const first = toggleCategorySelection(new Set(), new Set(), 10, students)
    const second = toggleCategorySelection(first.categories, first.students, 20, students)
    expect(Array.from(second.students).sort()).toEqual([1, 2, 3])
  })

  it('retains students supplied by another selected category', () => {
    const both = toggleCategorySelection(new Set([10]), new Set([1, 2]), 20, students)
    const removedFirst = toggleCategorySelection(both.categories, both.students, 10, students)
    expect(Array.from(removedFirst.students).sort()).toEqual([1, 3])
  })

  it('selects every student under a sheikh while preserving other selections', () => {
    const selected = toggleStudentGroupSelection(new Set([3]), [1, 2])
    expect(Array.from(selected).sort()).toEqual([1, 2, 3])
  })

  it('clears only the sheikh group when all of its students are selected', () => {
    const selected = toggleStudentGroupSelection(new Set([1, 2, 3]), [1, 2])
    expect(Array.from(selected)).toEqual([3])
  })
})
