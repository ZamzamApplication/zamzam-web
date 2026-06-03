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
  circle_id: number
  circle_name: string
  date: string
  is_confirmed: boolean
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
  sheikh_groups: SheikhGroup[]
}
