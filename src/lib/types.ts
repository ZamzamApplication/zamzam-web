export interface User {
  id: number
  username: string
  role: 'admin' | 'sheikh'
  sheikh_id: number | null
}

export interface Circle {
  id: number
  name: string
  description?: string
  max_warnings?: number
}

export interface Session {
  id: number
  date: string
  is_confirmed: boolean
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
