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
  attendance_id: number | null
  status: string
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
}

export interface SheikhInfo {
  id: number
  name: string
  phone?: string
  circle_id: number
  circle_name: string
}

export interface StudentInfo {
  id: number
  name: string
  phone?: string
  sheikh?: { id: number; name: string }
}

export interface UserInfo {
  id: number
  username: string
  role: string
  sheikh_id: number | null
}

export interface CircleSchedule {
  id: number
  circle_id: number
  day_of_week: number
  time: string
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
  total_absent: number
  total_sessions: number
  attendance_rate: number
}

export const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export interface AttendanceGridSession {
  id: number
  date: string
  circle_id: number
}

export interface FilterRule {
  circleId: number
  operator: 'is' | 'is_not'
  status: string
}

export interface AttendanceGridStudent {
  id: number
  name: string
  records: Record<string, string>
}

export interface AttendanceGrid {
  sessions: AttendanceGridSession[]
  students: AttendanceGridStudent[]
}
