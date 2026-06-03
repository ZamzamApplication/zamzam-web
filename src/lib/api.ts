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

  getUpcomingSessions(circleId?: number) {
    const query = circleId ? `?circle_id=${circleId}` : ''
    return request(`/sessions/upcoming${query}`)
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

  getCircles() {
    return request('/reports/circles')
  },
}
