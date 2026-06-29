const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request(path: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  }

  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
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

  upsertAttendance(sessionId: number, studentId: number, status: string, notes?: string, sheikhId?: number | null) {
    return request('/attendance/upsert', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, student_id: studentId, status, notes: notes || null, sheikh_id: sheikhId ?? null }),
    })
  },

  confirmSession(sessionId: number) {
    return request(`/sessions/${sessionId}/confirm`, { method: 'POST' })
  },

  updateSessionDate(sessionId: number, sessionDate: string) {
    return request(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({ session_date: sessionDate }),
    })
  },

  deleteSession(sessionId: number) {
    return request(`/sessions/${sessionId}`, { method: 'DELETE' })
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

  createStudent(name: string, sheikhId: number, phone?: string, birthday?: string, customStudentId?: string, status?: string, parentPhones?: { phone_number: string; parent_type: string }[], registrationDate?: string) {
    return request('/students', {
      method: 'POST',
      body: JSON.stringify({
        name,
        sheikh_id: sheikhId,
        phone: phone || null,
        student_id: customStudentId || null,
        birthday: birthday || null,
        status: status || 'مقيد',
        registration_date: registrationDate || null,
        parent_phones: parentPhones || [],
      }),
    })
  },

  uploadStudentPic(studentId: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request(`/students/${studentId}/upload-pic`, {
      method: 'POST',
      body: formData,
    })
  },

  updateStudent(id: number, name?: string, phone?: string, birthday?: string, customStudentId?: string, profilePic?: string, status?: string, parentPhones?: { phone_number?: string; parent_type?: string }[], registrationDate?: string) {
    const body: Record<string, unknown> = {}
    if (name !== undefined) body.name = name
    if (phone !== undefined) body.phone = phone ?? null
    if (birthday !== undefined) body.birthday = birthday ?? null
    if (customStudentId !== undefined) body.student_id = customStudentId ?? null
    if (profilePic !== undefined) body.profile_pic = profilePic ?? null
    if (status !== undefined) body.status = status
    if (registrationDate !== undefined) body.registration_date = registrationDate ?? null
    if (parentPhones !== undefined) body.parent_phones = parentPhones
    return request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  deleteStudent(id: number, deleteSessions: boolean = true) {
    return request(`/students/${id}?delete_sessions=${deleteSessions}`, { method: 'DELETE' })
  },

  reorderStudents(sheikhId: number, studentIds: number[]) {
    return request(`/sheikhs/${sheikhId}/students/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ student_ids: studentIds }),
    })
  },

  moveStudentSheikh(studentId: number, sheikhId: number) {
    return request(`/students/${studentId}/move-sheikh`, {
      method: 'POST',
      body: JSON.stringify({ sheikh_id: sheikhId }),
    })
  },

  addWarning(studentId: number, reason: string) {
    return request(`/students/${studentId}/warnings`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  deleteWarning(warningId: number) {
    return request(`/warnings/${warningId}`, { method: 'DELETE' })
  },

  updateWarning(warningId: number, reason: string) {
    return request(`/warnings/${warningId}`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    })
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

  getCircleAttendanceRate(circleId: number) {
    return request(`/reports/circle/${circleId}/rate`)
  },

  getCircleStudentStats(circleId: number) {
    return request(`/reports/circle/${circleId}/student-stats`)
  },

  getStudentStreak(studentId: number) {
    return request(`/reports/student/${studentId}/streak`)
  },

  exportDb() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const url = `${API_BASE}/management/export-db`
    return fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((res) => {
      if (!res.ok) throw new Error('فشل التصدير')
      return res.blob()
    })
  },

  getAttendanceGrid(sheikhId?: number, circleId?: number) {
    const params = new URLSearchParams()
    if (sheikhId) params.set('sheikh_id', String(sheikhId))
    if (circleId) params.set('circle_id', String(circleId))
    const qs = params.toString()
    return request(`/reports/attendance-grid${qs ? `?${qs}` : ''}`)
  },
}
