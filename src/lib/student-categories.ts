export function toggleCategorySelection(
  selectedCategories: Set<number>,
  selectedStudents: Set<number>,
  categoryId: number,
  students: Array<{ id: number; category_ids?: number[] }>,
): { categories: Set<number>; students: Set<number> } {
  const categories = new Set(selectedCategories)
  const nextStudents = new Set(selectedStudents)
  const selecting = !categories.has(categoryId)
  if (selecting) categories.add(categoryId)
  else categories.delete(categoryId)

  students.filter(student => student.category_ids?.includes(categoryId)).forEach(student => {
    if (selecting) nextStudents.add(student.id)
    else if (!student.category_ids?.some(id => categories.has(id))) nextStudents.delete(student.id)
  })
  return { categories, students: nextStudents }
}
