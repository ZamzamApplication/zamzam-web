export interface User {
  id: number
  username: string
  role: 'super_admin' | 'admin' | 'sheikh'
  sheikh_id: number | null
  tahfiz_id: number | null
  capabilities?: string[]
  tahfiz?: {
    id: number
    name: string
    status: 'pending' | 'active' | 'rejected' | 'suspended'
    status_reason?: string | null
    progress_tracking_enabled?: boolean
  } | null
}

export interface Circle {
  id: number
  name: string
  description?: string
  max_warnings?: number
  week_start_day?: number
  contact_phone?: string
  whatsend_api_url?: string
  whatsend_groups_url?: string
  whatsend_api_key_configured?: boolean
  progress_tracking_enabled?: boolean
}

export interface Session {
  id: number
  date: string
  is_confirmed: boolean
  status?: 'draft' | 'confirmed' | 'reopened'
  version?: number
  circle_id: number
  circle_name?: string
}

export interface StudentAttendance {
  id: number
  name: string
  phone?: string
  profile_pic?: string | null
  attendance_id: number | null
  status: string
  notes?: string
  sheikh_id: number | null
}

export interface SheikhGroup {
  sheikh: { id: number; name: string }
  students: StudentAttendance[]
}

export interface SessionAttendance {
  session_id: number
  date: string
  is_confirmed: boolean
  status?: 'draft' | 'confirmed' | 'reopened'
  version: number
  circle_id: number
  circle_name?: string
  sheikh_groups: SheikhGroup[]
  circle_sheikhs: { id: number; name: string }[]
}

export interface SheikhInfo {
  id: number
  name: string
  phone?: string
  whatsapp_group_id?: string
  circle_id: number
  circle_name: string
  week_start_day?: number
}

export interface WhatsAppGroup {
  id: string
  name: string
}

export interface ParentPhone {
  id: number
  phone_number: string
  parent_type: string
  name?: string
}

export interface WarningInfo {
  id: number
  reason: string
  warning_number: number
  sent: boolean
  sent_at?: string
  created_at: string
}

export interface WarningRow {
  id: number
  student_id: number
  student_name: string
  sheikh_id: number | null
  sheikh_name: string | null
  reason: string
  warning_number: number
  sent: boolean
  sent_at: string | null
  created_at: string
}

export interface ExcusedWeekdayInfo {
  id?: number
  weekday: number
  note?: string | null
}

export interface StudentInfo {
  id: number
  name: string
  phone?: string
  student_id?: string
  birthday?: string
  profile_pic?: string | null
  status: string
  registration_date?: string
  sort_order?: number
  warnings: WarningInfo[]
  sheikh?: { id: number; name: string }
  parent_phones?: ParentPhone[]
  excused_weekdays?: ExcusedWeekdayInfo[]
}

export interface UserInfo {
  id: number
  username: string
  role: string
  sheikh_id: number | null
}

export interface CircleAttendanceRate {
  circle_id: number
  total_attendance_records: number
  present: number
  absent: number
  excused: number
  attendance_rate: number
}

export interface StudentStreak {
  student_id: number
  total_attended: number
  total_excused: number
  total_absent: number
  total_sessions: number
  attendance_rate: number
}

export interface AttendanceGridSession {
  id: number
  date: string
  circle_id: number
}

export interface FilterRule {
  target?: 'session' | 'weekday'
  sessionId: number
  weekday?: number
  operator: 'is' | 'is_not'
  status: string
  connector?: 'and' | 'or'
}

export interface FilterGroup {
  id: string
  connector?: 'and' | 'or'
  rules: FilterRule[]
}

export interface AttendanceGridStudent {
  id: number
  name: string
  profile_pic?: string | null
  sheikh_id: number | null
  sheikh_name?: string | null
  next_warning_number: number
  remaining_warnings: number
  records: Record<string, string>
}

export interface AttendanceGrid {
  sessions: AttendanceGridSession[]
  students: AttendanceGridStudent[]
}

export interface StudentStatsItem {
  student_id: number
  student_name: string
  profile_pic?: string | null
  sheikh_name: string
  total_sessions: number
  present: number
  excused: number
  absent: number
  not_applicable: number
  attendance_rate: number
}

export interface CircleStudentStatsResponse {
  circle_id: number
  students: StudentStatsItem[]
}

export type ProgressCategory = 'new_memorization' | 'recent_revision' | 'old_revision' | 'test'
export type QuranRangeType = 'surah_ayah' | 'page'

export interface QuranProgressEntry {
  id: number
  session_id: number
  student_id: number
  sheikh_id: number | null
  recorded_by_id: number
  category: ProgressCategory
  range_type: QuranRangeType
  from_surah: number | null
  from_ayah: number | null
  to_surah: number | null
  to_ayah: number | null
  from_page: number | null
  to_page: number | null
  quality_score: number
  mistakes: number
  notes: string | null
  next_assignment: string | null
  created_at: string
  updated_at: string
  session_date?: string | null
}

export interface QuranProgressTrendPoint {
  entry_id: number
  session_date: string
  category: ProgressCategory
  quality_score: number
  mistakes: number
}

export interface QuranProgressInput {
  student_id: number
  sheikh_id?: number | null
  category: ProgressCategory
  range_type: QuranRangeType
  from_surah?: number | null
  from_ayah?: number | null
  to_surah?: number | null
  to_ayah?: number | null
  from_page?: number | null
  to_page?: number | null
  quality_score: number
  mistakes?: number
  notes?: string | null
  next_assignment?: string | null
}

export interface StudentGoal {
  id: number
  student_id: number
  range_type: QuranRangeType
  from_surah: number | null
  from_ayah: number | null
  to_surah: number | null
  to_ayah: number | null
  from_page: number | null
  to_page: number | null
  target_date: string | null
  notes: string | null
  status: 'active' | 'completed' | 'cancelled'
  completed_at: string | null
  created_at: string
  updated_at: string
}
