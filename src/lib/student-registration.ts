export interface RegistrationField {
  id: number
  name: string
  field_type: 'text' | 'number' | 'date' | 'checkbox' | 'select'
  options: string[]
  is_required: boolean
}
export interface RegistrationForm {
  id: number
  title: string
  description: string
  student_fields?: StudentFormField[]
  required_student_fields?: StudentFormField[]
  public_field_ids: number[]
  is_active: boolean
  token: string
  url: string
  print_url: string
}
export interface RegistrationRequest {
  id: number
  student_data?: RegistrationStudentData
  form_id: number
  name: string
  phone: string | null
  birthday: string | null
  answers: Record<string, string | null>
  fields: RegistrationField[]
  status: string
  student_id: number | null
  created_at: string
}
export interface PublicRegistration {
  student_fields?: StudentFormField[]
  required_student_fields?: StudentFormField[]
  student_field_options?: StudentFieldOptions
  title: string
  description: string
  tahfiz_name: string
  fields: RegistrationField[]
}
export const REGISTRATION_API = '/student-registration'

export const STUDENT_FORM_FIELDS = [
  { id: 'phone', label: 'رقم التواصل', type: 'tel' },
  { id: 'birthday', label: 'تاريخ الميلاد', type: 'date' },
  { id: 'student_id', label: 'الرقم التعريفي', type: 'text' },
  { id: 'parent_phones', label: 'بيانات أولياء الأمور', type: 'parents' },
  { id: 'sheikh_id', label: 'الشيخ', type: 'select' },
  { id: 'category_ids', label: 'تصنيفات الطالب', type: 'categories' },
  { id: 'registration_date', label: 'تاريخ التسجيل', type: 'date' },
  { id: 'status', label: 'حالة الطالب', type: 'select' },
  { id: 'quran_progress_enabled', label: 'متابعة حفظ القرآن', type: 'boolean' },
] as const
export type StudentFormField = (typeof STUDENT_FORM_FIELDS)[number]['id']
export const DEFAULT_STUDENT_FIELDS: StudentFormField[] = ['phone', 'birthday']
export interface RegistrationStudentData {
  phone?: string | null
  birthday?: string | null
  student_id?: string | null
  registration_date?: string | null
  sheikh_id?: number | null
  category_ids?: number[]
  status?: string
  quran_progress_enabled?: boolean
  parent_phones?: { phone_number: string; parent_type: string; name?: string | null }[]
}
export interface StudentFieldOptions {
  sheikh_id?: { id: number; name: string }[]
  category_ids?: { id: number; name: string }[]
}
export function selectedStudentData(data: RegistrationStudentData, fields: StudentFormField[]) {
  return Object.fromEntries(Object.entries(data).filter(([key, value]) =>
    fields.includes(key as StudentFormField) && value !== '' && value != null
  ))
}

export function approvalStudentData(data: RegistrationStudentData) {
  return {
    ...data,
    phone: data.phone || null,
    birthday: data.birthday || null,
    student_id: data.student_id || null,
    registration_date: data.registration_date || null,
    sheikh_id: data.sheikh_id ?? null,
    status: data.status || 'مقيد',
    quran_progress_enabled: data.quran_progress_enabled ?? false,
    category_ids: data.category_ids ?? [],
    parent_phones: data.parent_phones ?? [],
  }
}

export function studentFieldSummary(data: RegistrationStudentData, field: StudentFormField, options: StudentFieldOptions) {
  const value = data[field]
  if (value == null || value === '') return '—'
  if (field === 'sheikh_id') return options.sheikh_id?.find(option => option.id === value)?.name || `#${value}`
  if (field === 'category_ids') return data.category_ids?.map(id => options.category_ids?.find(option => option.id === id)?.name || `#${id}`).join('، ') || '—'
  if (field === 'parent_phones') return data.parent_phones?.map(parent => `${parent.parent_type}${parent.name ? ` (${parent.name})` : ''}: ${parent.phone_number}`).join('، ') || '—'
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  return String(value)
}
