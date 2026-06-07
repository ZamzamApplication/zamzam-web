const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request(path: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  login(username: string, password: string) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  getMe() {
    return request('/auth/me')
  },

  getUpcomingSessions() {
    return request('/sessions/upcoming')
  },

  getAllSessions() {
    return request('/sessions/all')
  },

  getPastSessions() {
    return request('/sessions/past')
  },

  getSessionAttendance(sessionId: number) {
    return request(`/sessions/${sessionId}/attendance`)
  },

  upsertAttendance(sessionId: number, studentId: number, status: string) {
    return request('/attendance/upsert', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, student_id: studentId, status }),
    })
  },

  confirmSession(sessionId: number) {
    return request(`/sessions/${sessionId}/confirm`, { method: 'POST' })
  },

  createSession(sessionDate: string, circleId: number) {
    return request('/sessions/', {
      method: 'POST',
      body: JSON.stringify({ session_date: sessionDate, circle_id: circleId }),
    })
  },

  getSheikhs() {
    return request('/sheikhs')
  },

  createSheikh(name: string, circleId: number, phone?: string) {
    return request('/sheikhs', {
      method: 'POST',
      body: JSON.stringify({ name, circle_id: circleId, phone: phone || null }),
    })
  },

  updateSheikh(id: number, name?: string, phone?: string, circleId?: number) {
    return request(`/sheikhs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, phone: phone ?? null, circle_id: circleId }),
    })
  },

  deleteSheikh(id: number) {
    return request(`/sheikhs/${id}`, { method: 'DELETE' })
  },

  getSheikhStudents(sheikhId: number) {
    return request(`/sheikhs/${sheikhId}/students`)
  },

  createStudent(name: string, sheikhId: number, phone?: string) {
    return request('/students', {
      method: 'POST',
      body: JSON.stringify({ name, sheikh_id: sheikhId, phone: phone || null }),
    })
  },

  updateStudent(id: number, name?: string, phone?: string) {
    return request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, phone: phone ?? null }),
    })
  },

  deleteStudent(id: number) {
    return request(`/students/${id}`, { method: 'DELETE' })
  },

  getCircles() {
    return request('/reports/circles')
  },

  createCircle(name: string, description?: string) {
    return request('/circles', {
      method: 'POST',
      body: JSON.stringify({ name, description: description || null }),
    })
  },

  updateCircle(id: number, name?: string, description?: string) {
    return request(`/circles/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description: description ?? null }),
    })
  },

  deleteCircle(id: number) {
    return request(`/circles/${id}`, { method: 'DELETE' })
  },

  getUsers() {
    return request('/users')
  },

  createUser(username: string, password: string, role: string, sheikhId?: number) {
    return request('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role, sheikh_id: sheikhId || null }),
    })
  },

  updateUser(id: number, data: Record<string, unknown>) {
    return request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteUser(id: number) {
    return request(`/users/${id}`, { method: 'DELETE' })
  },

  getCircleSchedules(circleId: number) {
    return request(`/circles/${circleId}/schedules`)
  },

  createSchedule(circleId: number, dayOfWeek: number, time: string) {
    return request('/schedules', {
      method: 'POST',
      body: JSON.stringify({ circle_id: circleId, day_of_week: dayOfWeek, time }),
    })
  },

  deleteSchedule(id: number) {
    return request(`/schedules/${id}`, { method: 'DELETE' })
  },

  getCircleAttendanceRate(circleId: number) {
    return request(`/reports/circle/${circleId}/rate`)
  },

  getStudentStreak(studentId: number) {
    return request(`/reports/student/${studentId}/streak`)
  },

  getAttendanceGrid(sheikhId?: number, circleId?: number) {
    const params = new URLSearchParams()
    if (sheikhId) params.set('sheikh_id', String(sheikhId))
    if (circleId) params.set('circle_id', String(circleId))
    params.set('limit', '3')
    const qs = params.toString()
    return request(`/reports/attendance-grid${qs ? `?${qs}` : ''}`)
  },
}
