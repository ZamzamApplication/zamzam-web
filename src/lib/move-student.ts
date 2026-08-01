import type { SheikhInfo, StudentInfo } from './types'

export type MoveStudentCandidate = StudentInfo & {
  sheikh: { id: number; name: string }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ar')
}

export function filterMoveStudents(students: MoveStudentCandidate[], query: string): MoveStudentCandidate[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return students
  return students.filter((student) => (
    [student.name, student.student_id, student.phone, student.sheikh.name]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(normalizedQuery))
  ))
}

export function filterDestinationSheikhs<T extends SheikhInfo>(
  sheikhs: T[],
  currentSheikhId: number | undefined,
  query: string,
): T[] {
  const normalizedQuery = normalize(query)
  return sheikhs.filter((sheikh) => {
    if (sheikh.id === currentSheikhId) return false
    if (!normalizedQuery) return true
    return [sheikh.name, sheikh.circle_name]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(normalizedQuery))
  })
}
