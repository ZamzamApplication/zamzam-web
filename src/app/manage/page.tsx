'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { SheikhInfo, StudentInfo, Circle, UserInfo, CircleSchedule } from '@/lib/types'
import { DAY_NAMES } from '@/lib/types'

// ─── Modal Wrapper ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-deep-800 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ErrorMsg({ error }: { error: string }) {
  if (!error) return null
  return <div className="bg-red-50/80 text-red-700 px-4 py-2 rounded-xl mb-4 text-sm text-center border border-red-200">{error}</div>
}

// ─── Circle Modals ──────────────────────────────────────────────────────────

function AddCircleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.createCircle(name, description || undefined)
      onCreated()
    } catch (err: any) {
      setError(err.message || 'فشل الإضافة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="إضافة حلقة جديدة" onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الحلقة" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'إضافة'}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditCircleModal({ circle, onClose, onUpdated }: { circle: Circle; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState(circle.name)
  const [description, setDescription] = useState(circle.description || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.updateCircle(circle.id, name, description || undefined)
      onUpdated()
    } catch (err: any) {
      setError(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`تعديل الحلقة — ${circle.name}`} onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الحلقة" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'حفظ'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Sheikh Modals ──────────────────────────────────────────────────────────

function AddSheikhModal({ circles, onClose, onCreated }: { circles: Circle[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [circleId, setCircleId] = useState(circles[0]?.id || 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.createSheikh(name, circleId, phone || undefined)
      onCreated()
    } catch (err: any) {
      setError(err.message || 'فشل الإضافة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="إضافة شيخ جديد" onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <select value={circleId} onChange={(e) => setCircleId(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'إضافة'}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditSheikhModal({ sheikh, circles, onClose, onUpdated }: { sheikh: SheikhInfo; circles: Circle[]; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState(sheikh.name)
  const [phone, setPhone] = useState(sheikh.phone || '')
  const [circleId, setCircleId] = useState(sheikh.circle_id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.updateSheikh(sheikh.id, name, phone || undefined, circleId)
      onUpdated()
    } catch (err: any) {
      setError(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`تعديل الشيخ — ${sheikh.name}`} onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <select value={circleId} onChange={(e) => setCircleId(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'حفظ'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Student Modals ─────────────────────────────────────────────────────────

function AddStudentModal({ sheikhId, sheikhName, onClose, onCreated }: { sheikhId: number; sheikhName: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.createStudent(name, sheikhId, phone || undefined)
      onCreated()
    } catch (err: any) {
      setError(err.message || 'فشل الإضافة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`إضافة طالب — ${sheikhName}`} onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'إضافة'}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditStudentModal({ student, sheikhName, onClose, onUpdated }: { student: StudentInfo; sheikhName: string; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.updateStudent(student.id, name, phone || undefined)
      onUpdated()
    } catch (err: any) {
      setError(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`تعديل الطالب — ${student.name}`} onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'حفظ'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── User Modals ────────────────────────────────────────────────────────────

function AddUserModal({ sheikhs, onClose, onCreated }: { sheikhs: SheikhInfo[]; onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('sheikh')
  const [sheikhId, setSheikhId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      await api.createUser(username, password, role, sheikhId || undefined)
      onCreated()
    } catch (err: any) {
      setError(err.message || 'فشل الإضافة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="إضافة مستخدم جديد" onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="كلمة المرور" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          <option value="sheikh">شيخ</option>
          <option value="admin">مدير</option>
        </select>
        {role === 'sheikh' && (
          <select value={sheikhId} onChange={(e) => setSheikhId(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
            <option value="">-- اختر شيخاً --</option>
            {sheikhs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'إضافة'}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditUserModal({ user, sheikhs, onClose, onUpdated }: { user: UserInfo; sheikhs: SheikhInfo[]; onClose: () => void; onUpdated: () => void }) {
  const [username, setUsername] = useState(user.username)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user.role)
  const [sheikhId, setSheikhId] = useState<number | ''>(user.sheikh_id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username) return
    setLoading(true)
    setError('')
    try {
      const data: Record<string, unknown> = { username }
      if (password) data.password = password
      data.role = role
      data.sheikh_id = sheikhId || null
      await api.updateUser(user.id, data)
      onUpdated()
    } catch (err: any) {
      setError(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`تعديل المستخدم — ${user.username}`} onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="كلمة المرور (اتركه فارغاً إذا لم ترد تغييره)" className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          <option value="sheikh">شيخ</option>
          <option value="admin">مدير</option>
        </select>
        <select value={sheikhId} onChange={(e) => setSheikhId(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          <option value="">-- اختر شيخاً --</option>
          {sheikhs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'حفظ'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Schedule Modal ─────────────────────────────────────────────────────────

function AddScheduleModal({ circleId, onClose, onCreated }: { circleId: number; onClose: () => void; onCreated: () => void }) {
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [time, setTime] = useState('05:30')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.createSchedule(circleId, dayOfWeek, time)
      onCreated()
    } catch (err: any) {
      setError(err.message || 'فشل الإضافة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="إضافة موعد للحلقة" onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
        </select>
        <input value={time} onChange={(e) => setTime(e.target.value)} type="time" required className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'إضافة'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ManagePage() {
  const [sheikhs, setSheikhs] = useState<(SheikhInfo & { students: StudentInfo[] })[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [schedules, setSchedules] = useState<Record<number, CircleSchedule[]>>({})
  const [activeTab, setActiveTab] = useState<'sheikhs' | 'users' | 'circles'>('sheikhs')
  const [loading, setLoading] = useState(true)

  const [showAddCircle, setShowAddCircle] = useState(false)
  const [editCircle, setEditCircle] = useState<Circle | null>(null)
  const [showAddSheikh, setShowAddSheikh] = useState(false)
  const [editSheikh, setEditSheikh] = useState<SheikhInfo | null>(null)
  const [addingStudent, setAddingStudent] = useState<{ id: number; name: string } | null>(null)
  const [editStudent, setEditStudent] = useState<{ student: StudentInfo; sheikhName: string } | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState<UserInfo | null>(null)
  const [showAddSchedule, setShowAddSchedule] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [sheikhsData, circlesData, usersData] = await Promise.all([
      api.getSheikhs(),
      api.getCircles(),
      api.getUsers(),
    ])
    const withStudents = await Promise.all(
      sheikhsData.map(async (s: SheikhInfo) => ({
        ...s,
        students: await api.getSheikhStudents(s.id),
      }))
    )
    setSheikhs(withStudents)
    setCircles(circlesData)
    setUsers(usersData)
    setLoading(false)
  }, [])

  const loadSchedules = useCallback(async (circleId: number) => {
    const data = await api.getCircleSchedules(circleId)
    setSchedules((prev) => ({ ...prev, [circleId]: data }))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDeleteSheikh = async (id: number) => {
    if (!confirm('حذف الشيخ وجميع طلابه؟')) return
    await api.deleteSheikh(id)
    load()
  }

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('حذف الطالب؟')) return
    await api.deleteStudent(id)
    load()
  }

  const handleDeleteUser = async (id: number) => {
    if (!confirm('حذف المستخدم؟')) return
    await api.deleteUser(id)
    load()
  }

  const handleDeleteCircle = async (id: number) => {
    if (!confirm('حذف الحلقة؟ (سيتم حذف جميع الشيوخ والطلاب المرتبطين بها)')) return
    await api.deleteCircle(id)
    load()
  }

  const handleDeleteSchedule = async (id: number) => {
    await api.deleteSchedule(id)
    if (showAddSchedule) loadSchedules(showAddSchedule)
  }

  if (loading) return null

  const tabs = [
    { key: 'sheikhs', label: 'الشيوخ والطلاب' },
    { key: 'users', label: 'المستخدمين' },
    { key: 'circles', label: 'الحلقات والمواعيد' },
  ] as const

  return (
    <div>
      <h1 className="text-2xl font-bold text-deep-800 mb-6">الإدارة</h1>

      <div className="flex gap-2 mb-6 border-b border-water-200/30">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === t.key ? 'text-cyan-700 border-cyan-500' : 'text-deep-500 border-transparent hover:text-deep-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Sheikhs & Students Tab ─────────────────────────────────────── */}
      {activeTab === 'sheikhs' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddSheikh(true)} className="water-btn text-white px-4 py-2 rounded-xl text-sm">+ إضافة شيخ</button>
          </div>

          {sheikhs.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
              <div className="text-4xl mb-3">💧</div>
              لا يوجد شيوخ بعد
            </div>
          ) : (
            <div className="space-y-4">
              {sheikhs.map((sheikh) => (
                <div key={sheikh.id} className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 bg-water-100/30">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-deep-800">{sheikh.name}</span>
                      <span className="text-deep-500 text-sm">{sheikh.circle_name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setAddingStudent({ id: sheikh.id, name: sheikh.name })} className="water-btn-outline px-3 py-1.5 rounded-xl text-xs">+ إضافة طالب</button>
                      <button onClick={() => setEditSheikh(sheikh)} className="water-btn-outline px-3 py-1.5 rounded-xl text-xs">تعديل</button>
                      <button onClick={() => handleDeleteSheikh(sheikh.id)} className="px-3 py-1.5 rounded-xl text-xs border border-red-200 text-red-600 hover:bg-red-50/50 transition">حذف</button>
                    </div>
                  </div>
                  {sheikh.students.length > 0 ? (
                    <div className="divide-y divide-water-200/30">
                      {sheikh.students.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-water-100/30">
                          <span className="text-deep-800">{s.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => setEditStudent({ student: s, sheikhName: sheikh.name })} className="text-xs text-cyan-600 hover:text-cyan-800 transition">تعديل</button>
                            <button onClick={() => handleDeleteStudent(s.id)} className="text-xs text-red-400 hover:text-red-600 transition">حذف</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-3 text-deep-400 text-sm text-center">لا يوجد طلاب</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Users Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddUser(true)} className="water-btn text-white px-4 py-2 rounded-xl text-sm">+ إضافة مستخدم</button>
          </div>

          {users.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
              لا يوجد مستخدمين
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="divide-y divide-water-200/30">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-water-100/30">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-deep-800">{u.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-purple-100/60 text-purple-700' : 'bg-water-100/60 text-cyan-700'
                      }`}>
                        {u.role === 'admin' ? 'مدير' : 'شيخ'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditUser(u)} className="text-xs text-cyan-600 hover:text-cyan-800 transition">تعديل</button>
                      <button onClick={() => handleDeleteUser(u.id)} className="text-xs text-red-400 hover:text-red-600 transition">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Circles Tab ────────────────────────────────────────────────── */}
      {activeTab === 'circles' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddCircle(true)} className="water-btn text-white px-4 py-2 rounded-xl text-sm">+ إضافة حلقة</button>
          </div>

          {circles.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
              لا يوجد حلقات
            </div>
          ) : (
            <div className="space-y-4">
              {circles.map((c) => (
                <div key={c.id} className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 bg-water-100/30">
                    <div>
                      <span className="text-lg font-bold text-deep-800">{c.name}</span>
                      {c.description && <span className="text-deep-500 text-sm mr-3">{c.description}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddSchedule(c.id); loadSchedules(c.id) }} className="water-btn-outline px-3 py-1.5 rounded-xl text-xs">+ إضافة موعد</button>
                      <button onClick={() => setEditCircle(c)} className="water-btn-outline px-3 py-1.5 rounded-xl text-xs">تعديل</button>
                      <button onClick={() => handleDeleteCircle(c.id)} className="px-3 py-1.5 rounded-xl text-xs border border-red-200 text-red-600 hover:bg-red-50/50 transition">حذف</button>
                    </div>
                  </div>
                  {(schedules[c.id]?.length ?? 0) > 0 && (
                    <div className="divide-y divide-water-200/30 px-5 py-2">
                      {schedules[c.id]?.map((sch) => (
                        <div key={sch.id} className="flex items-center justify-between py-1.5">
                          <span className="text-deep-700 text-sm">{DAY_NAMES[sch.day_of_week]} — {sch.time}</span>
                          <button onClick={() => handleDeleteSchedule(sch.id)} className="text-xs text-red-400 hover:text-red-600 transition">حذف</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddCircle && <AddCircleModal onClose={() => setShowAddCircle(false)} onCreated={() => { setShowAddCircle(false); load() }} />}
      {editCircle && <EditCircleModal circle={editCircle} onClose={() => setEditCircle(null)} onUpdated={() => { setEditCircle(null); load() }} />}
      {showAddSheikh && <AddSheikhModal circles={circles} onClose={() => setShowAddSheikh(false)} onCreated={() => { setShowAddSheikh(false); load() }} />}
      {editSheikh && <EditSheikhModal sheikh={editSheikh} circles={circles} onClose={() => setEditSheikh(null)} onUpdated={() => { setEditSheikh(null); load() }} />}
      {addingStudent && <AddStudentModal sheikhId={addingStudent.id} sheikhName={addingStudent.name} onClose={() => setAddingStudent(null)} onCreated={() => { setAddingStudent(null); load() }} />}
      {editStudent && <EditStudentModal student={editStudent.student} sheikhName={editStudent.sheikhName} onClose={() => setEditStudent(null)} onUpdated={() => { setEditStudent(null); load() }} />}
      {showAddUser && <AddUserModal sheikhs={sheikhs} onClose={() => setShowAddUser(false)} onCreated={() => { setShowAddUser(false); load() }} />}
      {editUser && <EditUserModal user={editUser} sheikhs={sheikhs} onClose={() => setEditUser(null)} onUpdated={() => { setEditUser(null); load() }} />}
      {showAddSchedule && <AddScheduleModal circleId={showAddSchedule} onClose={() => setShowAddSchedule(null)} onCreated={() => { loadSchedules(showAddSchedule); setShowAddSchedule(null) }} />}
    </div>
  )
}
