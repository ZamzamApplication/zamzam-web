export type OrderedStudent = {
  id: number
  name: string
  status: string
  sort_order?: number
}

export function orderStudents<T extends OrderedStudent>(students: T[]): T[] {
  const hasSavedOrder = students.some(student => (student.sort_order || 0) > 0)
  return [...students].sort((left, right) => {
    if (hasSavedOrder) {
      const orderDifference = (left.sort_order || 0) - (right.sort_order || 0)
      if (orderDifference !== 0) return orderDifference
    }
    return left.name.localeCompare(right.name, 'ar', { sensitivity: 'base' })
  })
}

export function alphabetizeStudents<T extends OrderedStudent>(students: T[]): T[] {
  return [...students].sort((left, right) => (
    left.name.localeCompare(right.name, 'ar', { sensitivity: 'base' })
  ))
}

export function moveStudentWithinStatus<T extends OrderedStudent>(
  students: T[],
  studentId: number,
  direction: -1 | 1,
): T[] {
  const ordered = orderStudents(students)
  const currentIndex = ordered.findIndex(student => student.id === studentId)
  if (currentIndex === -1) return ordered

  const current = ordered[currentIndex]
  const sameStatus = ordered.filter(student => student.status === current.status)
  const statusIndex = sameStatus.findIndex(student => student.id === studentId)
  const target = sameStatus[statusIndex + direction]
  if (!target) return ordered

  const targetIndex = ordered.findIndex(student => student.id === target.id)
  ;[ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]]
  return ordered
}
