'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import { compressProfileImage } from '@/lib/image'
import { configuredAttendanceStatuses } from '@/lib/attendance'
import { formatQuranRange } from '@/lib/quran'
import type { Circle, ExcusedWeekdayInfo, QuranProgressEntry, QuranProgressRevision, QuranProgressTrendPoint, QuranRangeType, SheikhInfo, StudentGoal, StudentInfo, TahfizInvitation, UserInfo, WarningInfo, WarningRow, WhatsAppGroup } from '@/lib/types'
import AsyncState from '@/components/AsyncState'

const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function normalizeExcusedWeekdays(days: (ExcusedWeekdayInfo | number)[] | undefined): ExcusedWeekdayInfo[] {
  return (days || []).map((day) => (
    typeof day === 'number' ? { weekday: day, note: '' } : { ...day, note: day.note || '' }
  ))
}

// ─── Modal Wrapper ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="mobile-sheet glass-strong rounded-2xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-deep-800 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ErrorMsg({ error }: { error: string }) {
  if (!error) return null
  return <div className="bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl mb-4 text-sm text-center border border-red-200 dark:border-red-800">{error}</div>
}

function WhatsAppGroupSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getWhatsAppGroups()
      .then((res) => {
        if (!cancelled) setGroups(res.groups || [])
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'فشل تحميل مجموعات واتساب')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const hasCurrent = value && groups.some((group) => group.id === value)

  return (
    <div className="space-y-2">
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading && groups.length === 0} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 disabled:opacity-60">
        <option value="">{loading ? 'جاري تحميل مجموعات واتساب...' : 'لا توجد مجموعة واتساب'}</option>
        {!hasCurrent && value && <option value={value}>المجموعة الحالية: {value}</option>}
        {groups.map((group) => (
          <option key={group.id} value={group.id}>{group.name} — {group.id}</option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Circle Modals ──────────────────────────────────────────────────────────

function AddCircleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxWarnings, setMaxWarnings] = useState(3)
  const [weekStartDay, setWeekStartDay] = useState(6)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.createCircle(name, description || undefined, maxWarnings, weekStartDay)
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
        <div>
          <label htmlFor="add-circle-name" className="block text-sm font-medium text-deep-700 mb-1">اسم الحلقة</label>
          <input id="add-circle-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الحلقة" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label htmlFor="add-circle-description" className="block text-sm font-medium text-deep-700 mb-1">وصف الحلقة</label>
          <input id="add-circle-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label htmlFor="add-circle-max-warnings" className="block text-sm font-medium text-deep-700 mb-1">الحد الأقصى للإنذارات</label>
          <input id="add-circle-max-warnings" value={maxWarnings} onChange={(e) => setMaxWarnings(Number(e.target.value))} type="number" min="1" placeholder="الحد الأقصى للإنذارات" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label htmlFor="add-circle-week-start" className="block text-sm font-medium text-deep-700 mb-1">بداية الأسبوع</label>
          <select id="add-circle-week-start" value={weekStartDay} onChange={(e) => setWeekStartDay(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
            {WEEKDAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
        </div>
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
  const [maxWarnings, setMaxWarnings] = useState(circle.max_warnings || 3)
  const [weekStartDay, setWeekStartDay] = useState(circle.week_start_day ?? 6)
  const [monthStartDay, setMonthStartDay] = useState(circle.month_start_day ?? 1)
  const [contactPhone, setContactPhone] = useState(circle.contact_phone || '')
  const [whatsendApiUrl, setWhatsendApiUrl] = useState(circle.whatsend_api_url || '')
  const [whatsendGroupsUrl, setWhatsendGroupsUrl] = useState(circle.whatsend_groups_url || '')
  const [whatsendApiKey, setWhatsendApiKey] = useState('')
  const [progressTrackingEnabled, setProgressTrackingEnabled] = useState(Boolean(circle.progress_tracking_enabled))
  const [attendanceStatuses, setAttendanceStatuses] = useState(configuredAttendanceStatuses(circle.attendance_statuses))
  const [newAttendanceStatus, setNewAttendanceStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.updateTahfizSettings({
        name,
        description,
        contact_phone: contactPhone,
        max_warnings: maxWarnings,
        week_start_day: weekStartDay,
        month_start_day: monthStartDay,
        attendance_statuses: attendanceStatuses,
        whatsend_api_url: whatsendApiUrl,
        whatsend_groups_url: whatsendGroupsUrl,
        progress_tracking_enabled: progressTrackingEnabled,
        ...(whatsendApiKey ? { whatsend_api_key: whatsendApiKey } : {}),
      })
      onUpdated()
    } catch (err: any) {
      setError(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  const addAttendanceStatus = () => {
    const status = newAttendanceStatus.trim()
    if (!status || attendanceStatuses.includes(status)) return
    setAttendanceStatuses((current) => [...current, status])
    setNewAttendanceStatus('')
  }

  return (
    <Modal title={`إعدادات التحفيظ — ${circle.name}`} onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-circle-name" className="block text-sm font-medium text-deep-700 mb-1">اسم التحفيظ</label>
          <input id="edit-circle-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم التحفيظ" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/60 p-4 dark:border-cyan-800 dark:bg-cyan-900/20">
          <input
            type="checkbox"
            checked={progressTrackingEnabled}
            onChange={(event) => setProgressTrackingEnabled(event.target.checked)}
            className="mt-1 h-4 w-4 accent-cyan-600"
          />
          <span>
            <span className="block text-sm font-bold text-deep-800">تفعيل متابعة الحفظ والمراجعة</span>
            <span className="mt-1 block text-xs leading-5 text-deep-500">
              يضيف تسجيل الحفظ الجديد والمراجعة والاختبارات والأهداف. الإدخال اختياري تماماً،
              وإيقاف الميزة لاحقاً يخفيها دون حذف البيانات.
            </span>
          </span>
        </label>
        <div>
          <label htmlFor="edit-circle-description" className="block text-sm font-medium text-deep-700 mb-1">وصف التحفيظ</label>
          <input id="edit-circle-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-700 mb-1">رقم التواصل</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} dir="ltr" className="w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
        </div>
        <div>
          <label htmlFor="edit-circle-max-warnings" className="block text-sm font-medium text-deep-700 mb-1">الحد الأقصى للإنذارات</label>
          <input id="edit-circle-max-warnings" value={maxWarnings} onChange={(e) => setMaxWarnings(Number(e.target.value))} type="number" min="1" placeholder="الحد الأقصى للإنذارات" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div className="border-t border-water-200 pt-4 space-y-3">
          <h3 className="font-bold text-deep-800">تكامل WhatSend</h3>
          <input value={whatsendApiUrl} onChange={(e) => setWhatsendApiUrl(e.target.value)} dir="ltr" placeholder="Send API URL" className="w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          <input value={whatsendGroupsUrl} onChange={(e) => setWhatsendGroupsUrl(e.target.value)} dir="ltr" placeholder="Groups API URL (اختياري)" className="w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          <input type="password" value={whatsendApiKey} onChange={(e) => setWhatsendApiKey(e.target.value)} dir="ltr" placeholder={circle.whatsend_api_key_configured ? 'المفتاح محفوظ — اكتب بديلاً لتغييره' : 'API key'} className="w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
        </div>
        <div>
          <label htmlFor="edit-circle-week-start" className="block text-sm font-medium text-deep-700 mb-1">بداية الأسبوع</label>
          <select id="edit-circle-week-start" value={weekStartDay} onChange={(e) => setWeekStartDay(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
            {WEEKDAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="edit-circle-month-start" className="block text-sm font-medium text-deep-700 mb-1">بداية الشهر</label>
          <select id="edit-circle-month-start" value={monthStartDay} onChange={(e) => setMonthStartDay(Number(e.target.value))} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
            {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>اليوم {day}</option>)}
          </select>
          <p className="mt-1 text-xs text-deep-500">يبدأ عرض الشهر في سجل الحضور والتقارير من هذا اليوم وينتهي قبله بيوم في الشهر التالي.</p>
        </div>
        <div className="border-t border-water-200 pt-4 space-y-3">
          <div>
            <h3 className="font-bold text-deep-800">خيارات حالة الحضور</h3>
            <p className="mt-1 text-xs text-deep-500">تظهر هذه الخيارات عند إنشاء الجلسات وتسجيل الحضور.</p>
          </div>
          <div className="space-y-2">
            {attendanceStatuses.map((status) => (
              <div key={status} className="flex items-center justify-between gap-3 rounded-xl border border-water-200 bg-white/40 px-3 py-2">
                <span className="text-sm text-deep-800">{status}</span>
                <button
                  type="button"
                  disabled={attendanceStatuses.length === 1}
                  onClick={() => setAttendanceStatuses((current) => current.filter((item) => item !== status))}
                  className="text-xs text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newAttendanceStatus}
              onChange={(event) => setNewAttendanceStatus(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addAttendanceStatus()
                }
              }}
              maxLength={50}
              placeholder="حالة جديدة"
              className="min-w-0 flex-1 px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-water-300 rounded-xl"
            />
            <button type="button" onClick={addAttendanceStatus} disabled={!newAttendanceStatus.trim()} className="water-btn-outline rounded-xl px-4 text-sm disabled:opacity-40">إضافة</button>
          </div>
        </div>
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
  const [whatsappGroupId, setWhatsappGroupId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.createSheikh(name, circleId, phone || undefined, whatsappGroupId || undefined)
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <WhatsAppGroupSelect value={whatsappGroupId} onChange={setWhatsappGroupId} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'إضافة'}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditSheikhModal({ sheikh, circles: _circles, onClose, onUpdated }: { sheikh: SheikhInfo; circles: Circle[]; onClose: () => void; onUpdated: () => void }) {
  const [name, setName] = useState(sheikh.name)
  const [phone, setPhone] = useState(sheikh.phone || '')
  const [whatsappGroupId, setWhatsappGroupId] = useState(sheikh.whatsapp_group_id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await api.updateSheikh(sheikh.id, name, phone || undefined, whatsappGroupId || undefined)
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <WhatsAppGroupSelect value={whatsappGroupId} onChange={setWhatsappGroupId} />
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
  const [studentId, setStudentId] = useState('')
  const [birthday, setBirthday] = useState('')
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().split('T')[0])
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null)
  const [profilePicPreview, setProfilePicPreview] = useState('')
  const [status, setStatus] = useState('مقيد')
  const [parentPhones, setParentPhones] = useState<{ phone_number: string; parent_type: string; name?: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addParentPhone = () => {
    setParentPhones([...parentPhones, { phone_number: '', parent_type: 'أب', name: '' }])
  }

  const updateParentPhone = (i: number, field: 'phone_number' | 'parent_type' | 'name', value: string) => {
    const updated = [...parentPhones]
    updated[i] = { ...updated[i], [field]: value }
    setParentPhones(updated)
  }

  const removeParentPhone = (i: number) => {
    setParentPhones(parentPhones.filter((_, idx) => idx !== i))
  }

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePicFile(file)
      setProfilePicPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      const filteredPhones = parentPhones.filter((p) => p.phone_number)
      const result = await api.createStudent(name, sheikhId, phone || undefined, birthday || undefined, studentId || undefined, status, filteredPhones.length ? filteredPhones : undefined, registrationDate || undefined)
      if (profilePicFile) {
        await api.uploadStudentPic(result.id, profilePicFile)
      }
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم هاتف الطالب (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="رقم الطالب (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <div>
          <label className="block text-sm text-deep-600 mb-1">تاريخ الميلاد</label>
          <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label className="block text-sm text-deep-600 mb-1">تاريخ التسجيل</label>
          <input value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} type="date" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label className="block text-sm text-deep-600 mb-1">الصورة الشخصية</label>
          <div className="flex items-center gap-3">
            {profilePicPreview && (
              <img src={profilePicPreview} alt="preview" className="w-14 h-14 rounded-full object-cover border border-water-300" />
            )}
            <input type="file" accept="image/*" onChange={handleProfilePicChange} className="w-full text-sm text-deep-600 file:ml-0 file:mr-3 file:px-3 file:py-1.5 file:rounded-xl file:border-0 file:text-sm file:water-btn file:text-white file:cursor-pointer" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-deep-600 mb-1">الحالة</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
            <option value="مقيد">مقيد</option>
            <option value="مستبعد">مستبعد</option>
            <option value="منقطع">منقطع</option>
            <option value="ضيف">ضيف</option>
            <option value="غير مقيد">غير مقيد</option>
          </select>
        </div>
        <div className="border-t border-water-200/30 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-deep-700">أرقام ولي الأمر</span>
            <button type="button" onClick={addParentPhone} className="text-xs water-btn-outline px-2 py-1 rounded-lg">+ إضافة</button>
          </div>
          {parentPhones.map((pp, i) => (
            <div key={i} className="space-y-1.5 mb-2 p-2 rounded-xl bg-water-100/20">
              <div className="flex gap-2">
                <input value={pp.phone_number} onChange={(e) => updateParentPhone(i, 'phone_number', e.target.value)} placeholder="رقم الهاتف" className="flex-1 px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
                <select value={pp.parent_type} onChange={(e) => updateParentPhone(i, 'parent_type', e.target.value)} className="px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
                  <option value="أب">أب</option>
                  <option value="أم">أم</option>
                  <option value="أخ">أخ</option>
                  <option value="أخت">أخت</option>
                  <option value="جد">جد</option>
                  <option value="جدة">جدة</option>
                  <option value="أرضي">أرضي</option>
                </select>
                <button type="button" onClick={() => removeParentPhone(i)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
              </div>
              <input value={pp.name || ''} onChange={(e) => updateParentPhone(i, 'name', e.target.value)} placeholder="الاسم (اختياري)" className="w-full px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
            </div>
          ))}
        </div>
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
  const [studentId, setStudentId] = useState(student.student_id || '')
  const [birthday, setBirthday] = useState(student.birthday || '')
  const [registrationDate, setRegistrationDate] = useState(student.registration_date || '')
  const [profilePic, setProfilePic] = useState(student.profile_pic || '')
  const [status, setStatus] = useState(student.status)
  const [warnings, setWarnings] = useState<WarningInfo[]>(student.warnings)
  const [newWarningReason, setNewWarningReason] = useState('')
  const [addingWarning, setAddingWarning] = useState(false)
  const [deletingWarningId, setDeletingWarningId] = useState<number | null>(null)
  const [editingWarningId, setEditingWarningId] = useState<number | null>(null)
  const [editingWarningText, setEditingWarningText] = useState('')
  const [savingWarningEdit, setSavingWarningEdit] = useState(false)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [parentPhones, setParentPhones] = useState<{ phone_number?: string; parent_type?: string; name?: string }[]>(
    student.parent_phones?.map((p) => ({ phone_number: p.phone_number, parent_type: p.parent_type, name: p.name || '' })) || []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [excusedWeekdays, setExcusedWeekdays] = useState<ExcusedWeekdayInfo[]>(normalizeExcusedWeekdays(student.excused_weekdays))

  useEffect(() => {
    if (!student.excused_weekdays) {
      api.getExcusedWeekdays(student.id).then((data) => {
        setExcusedWeekdays(normalizeExcusedWeekdays(data))
      }).catch(() => {})
    }
  }, [student.id, student.excused_weekdays])

  const toggleExcusedWeekday = (wd: number) => {
    setExcusedWeekdays((prev) =>
      prev.some((d) => d.weekday === wd)
        ? prev.filter((d) => d.weekday !== wd)
        : [...prev, { weekday: wd, note: '' }]
    )
  }

  const updateExcusedWeekdayNote = (wd: number, note: string) => {
    setExcusedWeekdays((prev) =>
      prev.map((d) => d.weekday === wd ? { ...d, note } : d)
    )
  }

  const addParentPhone = () => {
    setParentPhones([...parentPhones, { phone_number: '', parent_type: 'أب' }])
  }

  const updateParentPhone = (i: number, field: 'phone_number' | 'parent_type' | 'name', value: string) => {
    const updated = [...parentPhones]
    updated[i] = { ...updated[i], [field]: value }
    setParentPhones(updated)
  }

  const removeParentPhone = (i: number) => {
    setParentPhones(parentPhones.filter((_, idx) => idx !== i))
  }

  const handleAddWarning = async () => {
    if (!newWarningReason.trim()) return
    setAddingWarning(true)
    setError('')
    try {
      const result = await api.addWarning(student.id, newWarningReason)
      setWarnings([{ id: result.id, reason: result.reason, warning_number: result.warning_number, sent: result.sent, sent_at: result.sent_at, created_at: result.created_at }, ...warnings])
      setNewWarningReason('')
    } catch (err: any) {
      setError(err.message || 'فشل إضافة الإنذار')
    } finally {
      setAddingWarning(false)
    }
  }

  const handleDeleteWarning = async (warningId: number) => {
    setDeletingWarningId(warningId)
    setError('')
    try {
      await api.deleteWarning(warningId)
      setWarnings(warnings.filter((w) => w.id !== warningId))
    } catch (err: any) {
      setError(err.message || 'فشل حذف الإنذار')
    } finally {
      setDeletingWarningId(null)
    }
  }

  const handleStartEditWarning = (w: WarningInfo) => {
    setEditingWarningId(w.id)
    setEditingWarningText(w.reason)
  }

  const handleSaveWarningEdit = async () => {
    if (!editingWarningId || !editingWarningText.trim()) return
    setSavingWarningEdit(true)
    setError('')
    try {
      const updated = await api.updateWarning(editingWarningId, editingWarningText)
      setWarnings(warnings.map((w) => w.id === editingWarningId ? { ...w, reason: updated.reason } : w))
      setEditingWarningId(null)
      setEditingWarningText('')
    } catch (err: any) {
      setError(err.message || 'فشل تعديل الإنذار')
    } finally {
      setSavingWarningEdit(false)
    }
  }

  const handleCancelEditWarning = () => {
    setEditingWarningId(null)
    setEditingWarningText('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      await Promise.all([
        api.updateStudent(student.id, name, phone || undefined, birthday || undefined, studentId || undefined, profilePic || undefined, status, parentPhones, registrationDate || undefined),
        api.updateExcusedWeekdays(student.id, excusedWeekdays),
      ])
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم هاتف الطالب (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="رقم الطالب (اختياري)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <div>
          <label className="block text-sm text-deep-600 mb-1">تاريخ الميلاد</label>
          <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label className="block text-sm text-deep-600 mb-1">تاريخ التسجيل</label>
          <input value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} type="date" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        </div>
        <div>
          <label className="block text-sm text-deep-600 mb-1">الصورة الشخصية</label>
          <div className="flex items-center gap-3">
            {profilePic && (
              <img src={mediaUrl(profilePic) || profilePic} alt="preview" className="w-14 h-14 rounded-full object-cover border border-water-300 shrink-0" />
            )}
            <label className={`flex-1 flex items-center justify-center px-4 py-2.5 border border-dashed border-water-300 rounded-xl cursor-pointer hover:bg-water-100/30 transition text-sm text-deep-500 ${uploadingPic ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPic}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingPic(true)
                  setError('')
                  try {
                    const compressed = await compressProfileImage(file)
                    const result = await api.uploadStudentPic(student.id, compressed)
                    setProfilePic(result.url)
                  } catch (err: any) {
                    setError(err.message || 'فشل رفع الصورة')
                  } finally {
                    setUploadingPic(false)
                  }
                }}
                className="hidden"
              />
              {uploadingPic ? 'جاري الرفع...' : (profilePic ? 'تغيير الصورة' : 'اختيار صورة')}
            </label>
            {profilePic && (
              <button
                type="button"
                onClick={async () => {
                  setProfilePic('')
                  await api.updateStudent(student.id, undefined, undefined, undefined, undefined, '', undefined, undefined, undefined)
                }}
                className="text-xs text-red-500 hover:text-red-700 shrink-0"
              >
                حذف
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm text-deep-600 mb-1">الحالة</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
            <option value="مقيد">مقيد</option>
            <option value="مستبعد">مستبعد</option>
            <option value="منقطع">منقطع</option>
            <option value="ضيف">ضيف</option>
            <option value="غير مقيد">غير مقيد</option>
          </select>
        </div>
        <div className="border-t border-water-200/30 pt-3">
          <span className="text-sm font-medium text-deep-700 block mb-2">أيام الإعفاء</span>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAY_NAMES.map((name, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleExcusedWeekday(i)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                  excusedWeekdays.some((d) => d.weekday === i)
                    ? 'bg-yellow-100/60 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
                    : 'bg-white/50 text-deep-500 border-water-300 dark:bg-slate-800/50 dark:text-deep-400 hover:bg-water-100/30'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {excusedWeekdays.length > 0 && (
            <div className="space-y-2 mt-3">
              {excusedWeekdays
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map((day) => (
                  <label key={day.weekday} className="block">
                    <span className="block text-xs text-deep-500 mb-1">{WEEKDAY_NAMES[day.weekday]} - سبب عدم الانطباق</span>
                    <input
                      value={day.note || ''}
                      onChange={(e) => updateExcusedWeekdayNote(day.weekday, e.target.value)}
                      placeholder="مثال: لديه دوام ثابت في هذا اليوم"
                      className="w-full px-3 py-2 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
                    />
                  </label>
                ))}
            </div>
          )}
        </div>
        <div className="border-t border-water-200/30 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-deep-700">الإنذارات ({warnings.length})</span>
          </div>
          <div className="flex gap-2 mb-3">
            <input value={newWarningReason} onChange={(e) => setNewWarningReason(e.target.value)} placeholder="سبب الإنذار" className="flex-1 px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
            <button type="button" onClick={handleAddWarning} disabled={addingWarning || !newWarningReason.trim()} className="water-btn text-white px-3 py-1.5 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">{addingWarning ? 'جاري...' : '+ إنذار'}</button>
          </div>
          {warnings.length === 0 ? (
            <p className="text-xs text-deep-400 text-center py-2">لا يوجد إنذارات</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {warnings.map((w) => (
                <div key={w.id} className="flex items-start gap-2 bg-red-50/40 dark:bg-red-900/20 rounded-xl px-3 py-2">
                  <span className="text-red-500 text-sm mt-0.5 shrink-0">⚠</span>
                  <div className="flex-1 min-w-0">
                    {editingWarningId === w.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editingWarningText}
                          onChange={(e) => setEditingWarningText(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs bg-white/50 dark:bg-slate-800/50 border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
                          autoFocus
                        />
                        <button type="button" onClick={handleSaveWarningEdit} disabled={savingWarningEdit || !editingWarningText.trim()} className="text-xs text-green-600 hover:text-green-700 px-1 disabled:opacity-40">{savingWarningEdit ? '...' : 'حفظ'}</button>
                        <button type="button" onClick={handleCancelEditWarning} className="text-xs text-deep-400 hover:text-deep-600 px-1">إلغاء</button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-deep-800">{w.reason}</p>
                        <p className="text-[10px] text-deep-400">{new Date(w.created_at).toLocaleDateString('ar-SA')}</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditWarning(w)}
                      className="text-deep-400 hover:text-cyan-600 text-xs px-1 transition"
                    >
                      ✏
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWarning(w.id)}
                      disabled={deletingWarningId === w.id}
                      className="text-red-400 hover:text-red-600 text-sm px-1 transition disabled:opacity-40"
                    >
                      {deletingWarningId === w.id ? '...' : '✕'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-water-200/30 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-deep-700">أرقام ولي الأمر</span>
            <button type="button" onClick={addParentPhone} className="text-xs water-btn-outline px-2 py-1 rounded-lg">+ إضافة</button>
          </div>
          {parentPhones.map((pp, i) => (
            <div key={i} className="space-y-1.5 mb-2 p-2 rounded-xl bg-water-100/20">
              <div className="flex gap-2">
                <input value={pp.phone_number || ''} onChange={(e) => updateParentPhone(i, 'phone_number', e.target.value)} placeholder="رقم الهاتف" className="flex-1 px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
                <select value={pp.parent_type || 'أب'} onChange={(e) => updateParentPhone(i, 'parent_type', e.target.value)} className="px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
                  <option value="أب">أب</option>
                  <option value="أم">أم</option>
                  <option value="أخ">أخ</option>
                  <option value="أخت">أخت</option>
                  <option value="جد">جد</option>
                  <option value="جدة">جدة</option>
                  <option value="أرضي">أرضي</option>
                </select>
                <button type="button" onClick={() => removeParentPhone(i)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
              </div>
              <input value={pp.name || ''} onChange={(e) => updateParentPhone(i, 'name', e.target.value)} placeholder="الاسم (اختياري)" className="w-full px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'حفظ'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── User Modals ────────────────────────────────────────────────────────────

function InviteUserModal({ sheikhs, onClose }: { sheikhs: SheikhInfo[]; onClose: () => void }) {
  const [role, setRole] = useState<'admin' | 'sheikh'>('sheikh')
  const [sheikhId, setSheikhId] = useState<number | null>(null)
  const [invitations, setInvitations] = useState<TahfizInvitation[]>([])
  const [createdLink, setCreatedLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadInvitations = useCallback(() => {
    return api.getInvitations()
      .then(setInvitations)
      .catch((err: any) => setError(err.message || 'تعذر تحميل الدعوات'))
  }, [])

  useEffect(() => { loadInvitations() }, [loadInvitations])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setCopied(false)
    try {
      const invitation = await api.createInvitation(role, role === 'sheikh' ? sheikhId : null, 48)
      setCreatedLink(`${window.location.origin}${invitation.path}`)
      await loadInvitations()
    } catch (err: any) {
      setError(err.message || 'تعذر إنشاء رابط الدعوة')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(createdLink)
    setCopied(true)
  }

  const revoke = async (invitation: TahfizInvitation) => {
    if (!confirm('إلغاء رابط الدعوة؟')) return
    setLoading(true)
    setError('')
    try {
      await api.revokeInvitation(invitation.id)
      await loadInvitations()
    } catch (err: any) {
      setError(err.message || 'تعذر إلغاء الدعوة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="إنشاء رابط دعوة" onClose={onClose}>
      <ErrorMsg error={error} />
      <form onSubmit={create} className="space-y-4">
        <p className="rounded-xl bg-cyan-50/70 p-3 text-xs leading-5 text-cyan-900 dark:bg-cyan-900/25 dark:text-cyan-100">
          الرابط صالح لمدة 48 ساعة ويُستخدم مرة واحدة فقط. يجب على المستلم تسجيل الدخول قبل قبوله.
        </p>
        <label className="block text-sm font-medium text-deep-700">
          الصلاحية
          <select value={role} onChange={event => setRole(event.target.value as 'admin' | 'sheikh')} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5">
            <option value="sheikh">مستخدم / شيخ</option>
            <option value="admin">مدير التحفيظ</option>
          </select>
        </label>
        {role === 'sheikh' && (
          <label className="block text-sm font-medium text-deep-700">
            ربط بشيخ محدد (اختياري)
            <select value={sheikhId || ''} onChange={event => setSheikhId(event.target.value ? Number(event.target.value) : null)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5">
              <option value="">بدون ربط</option>
              {sheikhs.map(sheikh => <option key={sheikh.id} value={sheikh.id}>{sheikh.name}</option>)}
            </select>
          </label>
        )}
        <button type="submit" disabled={loading} className="water-btn w-full rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-50">
          {loading ? 'جاري الإنشاء...' : 'إنشاء رابط وحيد الاستخدام'}
        </button>
      </form>

      {createdLink && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">انسخ الرابط الآن — لن يظهر كاملاً مرة أخرى</p>
          <input readOnly value={createdLink} dir="ltr" className="surface-field mt-2 w-full rounded-lg px-3 py-2 text-xs" />
          <button type="button" onClick={copy} className="water-btn-outline mt-2 w-full rounded-lg px-3 py-2 text-sm">{copied ? 'تم النسخ ✓' : 'نسخ الرابط'}</button>
        </div>
      )}

      <div className="mt-5 border-t border-water-200 pt-4">
        <h3 className="text-sm font-bold text-deep-800">الدعوات النشطة</h3>
        <div className="mt-2 space-y-2">
          {invitations.filter(invitation => invitation.status === 'active').length === 0 ? (
            <p className="text-xs text-deep-500">لا توجد دعوات نشطة</p>
          ) : invitations.filter(invitation => invitation.status === 'active').map(invitation => (
            <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-xl border border-water-200 px-3 py-2 text-xs">
              <span>
                {invitation.role === 'admin' ? 'مدير' : 'مستخدم / شيخ'}
                {invitation.sheikh_name ? ` · ${invitation.sheikh_name}` : ''}
              </span>
              <button type="button" onClick={() => revoke(invitation)} disabled={loading} className="font-semibold text-red-500 disabled:opacity-50">إلغاء</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

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
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="كلمة المرور" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          <option value="sheikh">شيخ</option>
          <option value="admin">مدير</option>
        </select>
        {role === 'sheikh' && (
          <select value={sheikhId} onChange={(e) => setSheikhId(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
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
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="كلمة المرور (اتركه فارغاً إذا لم ترد تغييره)" className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          <option value="sheikh">شيخ</option>
          <option value="admin">مدير</option>
        </select>
        <select value={sheikhId} onChange={(e) => setSheikhId(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
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

// ─── Image Preview Modal ─────────────────────────────────────────────────────

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <img src={src} alt="صورة الطالب" className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

// ─── Delete Student Modal ────────────────────────────────────────────────────

function DeleteStudentModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (deleteSessions: boolean) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-deep-800 mb-2">حذف الطالب</h2>
        <p className="text-deep-600 text-sm mb-4">اختر نوع الحذف:</p>
        <div className="space-y-3">
          <button onClick={() => onConfirm(true)} className="w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50/50 dark:hover:bg-red-900/30 transition text-right">
            <div className="font-medium">حذف مع الجلسات</div>
            <div className="text-xs text-deep-400 font-normal mt-0.5">سيتم حذف الطالب وجميع سجلات حضوره</div>
          </button>
          <button onClick={() => onConfirm(false)} className="w-full px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-50/50 dark:hover:bg-amber-900/30 transition text-right">
            <div className="font-medium">حذف الطالب فقط</div>
            <div className="text-xs text-deep-400 font-normal mt-0.5">سيتم حذف الطالب والاحتفاظ بسجل الحضور</div>
          </button>
          <button onClick={onClose} className="w-full px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// ─── Move Sheikh Modal ───────────────────────────────────────────────────────

function MoveSheikhModal({ student, currentSheikhName, sheikhs, onClose, onMoved }: {
  student: StudentInfo
  currentSheikhName: string
  sheikhs: { id: number; name: string; circle_name: string }[]
  onClose: () => void
  onMoved: () => void
}) {
  const [selectedSheikhId, setSelectedSheikhId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSheikhId) return
    setLoading(true)
    setError('')
    try {
      await api.moveStudentSheikh(student.id, selectedSheikhId)
      onMoved()
    } catch (err: any) {
      setError(err.message || 'فشل النقل')
    } finally {
      setLoading(false)
    }
  }

  const otherSheikhs = sheikhs.filter((s) => s.name !== currentSheikhName)

  return (
    <Modal title={`نقل الطالب — ${student.name}`} onClose={onClose}>
      <ErrorMsg error={error} />
      <p className="text-sm text-deep-600 mb-4">الشيخ الحالي: <strong>{currentSheikhName}</strong></p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select value={selectedSheikhId} onChange={(e) => setSelectedSheikhId(e.target.value ? Number(e.target.value) : '')} required className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400">
          <option value="">-- اختر الشيخ الجديد --</option>
          {otherSheikhs.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.circle_name}</option>
          ))}
        </select>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button type="submit" disabled={loading || !selectedSheikhId} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'نقل'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Student Profile Overlay ─────────────────────────────────────────────────

function ViewStudentModal({ student, sheikhName, onClose, onEdit, onDelete, onMove, onZoomPic }: {
  student: StudentInfo
  sheikhName: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onMove: () => void
  onZoomPic?: (url: string) => void
}) {
  const [progressEnabled, setProgressEnabled] = useState(false)
  const [progressEntries, setProgressEntries] = useState<QuranProgressEntry[]>([])
  const [goals, setGoals] = useState<StudentGoal[]>([])
  const [progressTrend, setProgressTrend] = useState<QuranProgressTrendPoint[]>([])
  const [progressRevisions, setProgressRevisions] = useState<QuranProgressRevision[]>([])
  const [averageQuality, setAverageQuality] = useState(0)
  const [goalRangeType, setGoalRangeType] = useState<QuranRangeType>('page')
  const [goalFromPage, setGoalFromPage] = useState(1)
  const [goalToPage, setGoalToPage] = useState(1)
  const [goalFromSurah, setGoalFromSurah] = useState(1)
  const [goalFromAyah, setGoalFromAyah] = useState(1)
  const [goalToSurah, setGoalToSurah] = useState(1)
  const [goalToAyah, setGoalToAyah] = useState(1)
  const [goalDate, setGoalDate] = useState('')
  const [goalBusy, setGoalBusy] = useState(false)
  const [progressError, setProgressError] = useState('')

  const loadProgress = useCallback(async () => {
    try {
      const result = await api.getStudentProgress(student.id)
      setProgressEnabled(result.enabled)
      setProgressEntries(result.entries)
      setGoals(result.goals)
      setAverageQuality(result.average_quality)
      setProgressTrend(result.trend || [])
      setProgressRevisions(result.revisions || [])
    } catch (err: any) {
      setProgressError(err.message || 'تعذر تحميل تقدم الطالب')
    }
  }, [student.id])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const addGoal = async () => {
    setGoalBusy(true)
    setProgressError('')
    try {
      await api.createStudentGoal(student.id, {
        range_type: goalRangeType,
        ...(goalRangeType === 'page'
          ? { from_page: goalFromPage, to_page: goalToPage }
          : {
              from_surah: goalFromSurah,
              from_ayah: goalFromAyah,
              to_surah: goalToSurah,
              to_ayah: goalToAyah,
            }),
        target_date: goalDate || null,
      })
      await loadProgress()
    } catch (err: any) {
      setProgressError(err.message || 'تعذر إضافة الهدف')
    } finally {
      setGoalBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-4">
          {student.profile_pic ? (
            <img src={mediaUrl(student.profile_pic)!} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-water-300 mb-3 cursor-pointer hover:opacity-80 transition" onClick={() => onZoomPic?.(mediaUrl(student.profile_pic)!)} />
          ) : (
            <div className="w-20 h-20 rounded-full bg-water-200/50 flex items-center justify-center text-deep-400 text-2xl border-2 border-water-300 mb-3">
              {student.name.charAt(0)}
            </div>
          )}
          <h2 className="text-xl font-bold text-deep-800">{student.name}</h2>
          <span className="text-deep-500 text-sm">{student.student_id ? `#${student.student_id}` : `#${student.id}`}</span>
        </div>

        <div className="space-y-3 text-sm">
          {student.phone && (
            <div className="flex justify-between items-center py-1 border-b border-water-100/50">
              <span className="text-deep-500">الهاتف</span>
              <span className="text-deep-800 font-medium" dir="ltr">{student.phone}</span>
            </div>
          )}
          {student.birthday && (
            <div className="flex justify-between items-center py-1 border-b border-water-100/50">
              <span className="text-deep-500">تاريخ الميلاد</span>
              <span className="text-deep-800 font-medium">{student.birthday}</span>
            </div>
          )}
          {student.registration_date && (
            <div className="flex justify-between items-center py-1 border-b border-water-100/50">
              <span className="text-deep-500">تاريخ التسجيل</span>
              <span className="text-deep-800 font-medium">{student.registration_date}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-1 border-b border-water-100/50">
            <span className="text-deep-500">الشيخ</span>
            <span className="text-deep-800 font-medium">{sheikhName}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-water-100/50">
            <span className="text-deep-500">الحالة</span>
            <span className={`font-medium ${
              student.status === 'مقيد' ? 'text-emerald-600' :
              student.status === 'مستبعد' ? 'text-red-500' :
              student.status === 'منقطع' ? 'text-orange-500' :
              student.status === 'ضيف' ? 'text-blue-500' : 'text-deep-500'
            }`}>
              {student.status}
            </span>
          </div>
          {student.excused_weekdays && student.excused_weekdays.length > 0 && (
            <div className="py-1 border-b border-water-100/50">
              <span className="text-deep-500 block mb-1">أيام الإعفاء</span>
              <div className="space-y-1">
                {normalizeExcusedWeekdays(student.excused_weekdays).map((d) => (
                  <div key={d.weekday} className="text-xs text-deep-800">
                    <span className="font-medium">{WEEKDAY_NAMES[d.weekday]}</span>
                    {d.note && <span className="text-deep-500"> - {d.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="py-1 border-b border-water-100/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-deep-500">الإنذارات</span>
              <span className={`font-medium ${student.warnings.length > 0 ? 'text-red-500' : 'text-deep-800'}`}>{student.warnings.length}</span>
            </div>
            {student.warnings.length > 0 && (
              <div className="space-y-1 mt-1 mb-1">
                {student.warnings.map((w) => (
                  <div key={w.id} className="flex items-start gap-1.5 bg-red-50/40 dark:bg-red-900/20 rounded-lg px-2 py-1.5">
                    <span className="text-red-500 text-xs mt-0.5">⚠</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-deep-700">{w.reason}</p>
                      <p className="text-[10px] text-deep-400">{new Date(w.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {student.parent_phones && student.parent_phones.length > 0 && (
            <div className="pt-1">
              <span className="text-deep-500 text-xs block mb-2">أرقام ولي الأمر</span>
              {student.parent_phones.map((p, i) => (
                <div key={i} className="flex items-center py-1 text-sm">
                  <span className="text-deep-600 bg-water-100/50 px-2 py-0.5 rounded-lg text-xs ml-2">{p.parent_type}</span>
                  <span className="text-deep-800 font-medium flex-1">{p.name || ''}</span>
                  <span className="text-deep-600" dir="ltr">{p.phone_number}</span>
                </div>
              ))}
            </div>
          )}

          {progressEnabled && (
            <div className="rounded-xl border border-cyan-200/70 bg-cyan-50/50 p-3 dark:border-cyan-800 dark:bg-cyan-900/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-deep-800">الحفظ والمراجعة</span>
                <span className="text-sm font-bold text-cyan-700">متوسط {averageQuality}/5</span>
              </div>
              {progressError && <p role="alert" className="mt-2 text-xs text-red-600">{progressError}</p>}
              {progressEntries.length === 0 ? (
                <p className="mt-2 text-xs text-deep-500">لا توجد سجلات متابعة بعد.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {progressEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded-lg bg-white/60 px-2.5 py-2 text-xs dark:bg-slate-800/50">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold">{entry.category === 'new_memorization' ? 'حفظ جديد' : entry.category === 'recent_revision' ? 'مراجعة قريبة' : entry.category === 'old_revision' ? 'مراجعة قديمة' : 'اختبار'}</span>
                        <span>{entry.quality_score}/5 — {entry.mistakes} أخطاء</span>
                      </div>
                      <p className="mt-1 font-semibold text-cyan-800 dark:text-cyan-200">{formatQuranRange(entry)}</p>
                      {entry.next_assignment && <p className="mt-1 text-deep-500">التالي: {entry.next_assignment}</p>}
                    </div>
                  ))}
                </div>
              )}
              {progressTrend.length > 0 && (
                <div className="mt-3 border-t border-cyan-200/60 pt-3">
                  <p className="mb-2 text-xs font-semibold text-deep-700">اتجاه التقييم — آخر {progressTrend.length} سجلاً</p>
                  <div className="flex h-24 items-end gap-1 rounded-lg bg-white/50 px-2 pt-2 dark:bg-slate-800/40" role="img" aria-label="اتجاه تقييم تقدم الطالب">
                    {progressTrend.map((point) => (
                      <div key={point.entry_id} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
                        <span className="mb-1 text-[9px] font-semibold text-deep-500">{point.quality_score}</span>
                        <div
                          className="w-full max-w-5 rounded-t bg-cyan-500 transition-colors group-hover:bg-cyan-600"
                          style={{ height: `${Math.max(12, point.quality_score * 12)}px` }}
                          title={`${point.session_date}: ${point.quality_score}/5، ${point.mistakes} أخطاء`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {progressRevisions.length > 0 && (
                <details className="mt-3 border-t border-cyan-200/60 pt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-deep-700">سجل تعديلات المتابعة ({progressRevisions.length})</summary>
                  <div className="mt-2 space-y-2">
                    {progressRevisions.slice(0, 10).map((revision) => (
                      <div key={revision.id} className="rounded-lg bg-amber-50/75 px-2.5 py-2 text-[11px] dark:bg-amber-950/25">
                        <p className="font-semibold text-deep-800">{revision.editor_username} — {new Date(revision.created_at).toLocaleString('ar-EG')}</p>
                        <p className="mt-1 text-deep-500">
                          {formatQuranRange(revision.before as QuranProgressEntry)} ← {formatQuranRange(revision.after as QuranProgressEntry)}
                        </p>
                        <p className="mt-1 text-deep-500">
                          التقييم {revision.before.quality_score ?? '—'} ← {revision.after.quality_score ?? '—'}،
                          الأخطاء {revision.before.mistakes ?? '—'} ← {revision.after.mistakes ?? '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <div className="mt-3 border-t border-cyan-200/60 pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-deep-700">إضافة هدف للطالب</p>
                  <select value={goalRangeType} onChange={(event) => setGoalRangeType(event.target.value as QuranRangeType)} className="surface-field rounded-lg px-2 py-1 text-xs">
                    <option value="page">بالصفحات</option>
                    <option value="surah_ayah">بالسورة والآية</option>
                  </select>
                </div>
                {goalRangeType === 'page' ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input aria-label="صفحة بداية الهدف" type="number" min={1} max={604} value={goalFromPage} onChange={(event) => setGoalFromPage(Number(event.target.value))} className="surface-field min-w-0 rounded-lg px-2 py-1.5 text-xs" />
                    <input aria-label="صفحة نهاية الهدف" type="number" min={goalFromPage} max={604} value={goalToPage} onChange={(event) => setGoalToPage(Number(event.target.value))} className="surface-field min-w-0 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input aria-label="سورة البداية" placeholder="سورة البداية" type="number" min={1} max={114} value={goalFromSurah} onChange={(event) => setGoalFromSurah(Number(event.target.value))} className="surface-field min-w-0 rounded-lg px-2 py-1.5 text-xs" />
                    <input aria-label="آية البداية" placeholder="آية البداية" type="number" min={1} value={goalFromAyah} onChange={(event) => setGoalFromAyah(Number(event.target.value))} className="surface-field min-w-0 rounded-lg px-2 py-1.5 text-xs" />
                    <input aria-label="سورة النهاية" placeholder="سورة النهاية" type="number" min={1} max={114} value={goalToSurah} onChange={(event) => setGoalToSurah(Number(event.target.value))} className="surface-field min-w-0 rounded-lg px-2 py-1.5 text-xs" />
                    <input aria-label="آية النهاية" placeholder="آية النهاية" type="number" min={1} value={goalToAyah} onChange={(event) => setGoalToAyah(Number(event.target.value))} className="surface-field min-w-0 rounded-lg px-2 py-1.5 text-xs" />
                  </div>
                )}
                <input aria-label="تاريخ الهدف" type="date" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} className="surface-field mt-1.5 w-full rounded-lg px-2 py-1.5 text-xs" />
                <button type="button" onClick={addGoal} disabled={goalBusy || (goalRangeType === 'page' && goalToPage < goalFromPage)} className="water-btn-outline mt-2 w-full rounded-lg px-3 py-1.5 text-xs disabled:opacity-50">{goalBusy ? 'جاري...' : 'إضافة الهدف'}</button>
                {goals.filter((goal) => goal.status === 'active').map((goal) => (
                  <div key={goal.id} className="mt-2 flex items-center justify-between rounded-lg bg-white/60 px-2 py-1.5 text-xs dark:bg-slate-800/50">
                    <span>{goal.range_type === 'page' ? `صفحات ${goal.from_page}–${goal.to_page}` : `سورة ${goal.from_surah}:${goal.from_ayah} إلى ${goal.to_surah}:${goal.to_ayah}`}</span>
                    <button type="button" onClick={async () => { await api.updateStudentGoal(student.id, goal.id, { status: 'completed' }); await loadProgress() }} className="font-semibold text-emerald-600">إكمال</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 mt-4 border-t border-water-200/30">
          <button onClick={onEdit} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium">تعديل</button>
          <button onClick={onMove} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm font-medium">نقل</button>
          <button onClick={onDelete} className="flex-1 px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50/50 dark:hover:bg-red-900/30 transition">حذف</button>
        </div>
      </div>
    </div>
  )
}

// ─── Student Status Tabs ─────────────────────────────────────────────────────

const STATUS_ORDER = ['مقيد', 'مستبعد', 'منقطع', 'ضيف', 'غير مقيد']

const STATUS_COLORS: Record<string, string> = {
  'مقيد': 'text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700',
  'مستبعد': 'text-red-600 border-red-300 bg-red-50/50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700',
  'منقطع': 'text-orange-600 border-orange-300 bg-orange-50/50 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700',
  'ضيف': 'text-blue-600 border-blue-300 bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700',
  'غير مقيد': 'text-deep-500 border-water-300 bg-water-50/50 dark:bg-slate-800/30 dark:text-deep-400 dark:border-slate-700',
}

function StudentStatusTabs({
  students,
  sheikhName,
  sheikhId,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  onDragStart,
  onDropReorder,
  onDropOnSheikh,
  onZoomPic,
}: {
  students: StudentInfo[]
  sheikhName: string
  sheikhId: number
  onViewStudent: (s: StudentInfo) => void
  onEditStudent: (s: StudentInfo) => void
  onDeleteStudent: (id: number) => void
  onDragStart: (studentId: number, fromSheikhId: number) => void
  onDropReorder: (sheikhId: number, targetStudentId?: number) => void
  onDropOnSheikh: (sheikhId: number) => void
  onZoomPic?: (url: string) => void
}) {
  const [openTab, setOpenTab] = useState('مقيد')

  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = students.filter((s) => s.status === status)
      return acc
    },
    {} as Record<string, StudentInfo[]>,
  )

  return (
    <div className="min-h-[40px]">
      <div className="flex border-b border-water-200/30">
        {STATUS_ORDER.map((status) => {
          const count = grouped[status].length
          return (
            <button
              key={status}
              onClick={() => setOpenTab(openTab === status ? '' : status)}
              className={`px-3 py-2 text-xs font-medium transition border-b-2 -mb-px ${
                openTab === status
                  ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400'
                  : 'border-transparent text-deep-500 hover:text-deep-700'
              }`}
            >
              {status} ({count})
            </button>
          )
        })}
      </div>
      {openTab && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault()
            const drag = (window as any).__dragData
            if (!drag) return
            if (drag.fromSheikhId === sheikhId) {
              onDropReorder(sheikhId)
            } else {
              await onDropOnSheikh(sheikhId)
            }
          }}
        >
          {grouped[openTab].length > 0 ? (
            <div className="divide-y divide-water-200/30">
              {grouped[openTab].map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => { (window as any).__dragData = { studentId: s.id, fromSheikhId: sheikhId }; onDragStart(s.id, sheikhId) }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const drag = (window as any).__dragData
                    if (!drag) return
                    if (drag.fromSheikhId === sheikhId) {
                      onDropReorder(sheikhId, s.id)
                    } else {
                      await onDropOnSheikh(sheikhId)
                    }
                  }}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-water-100/30 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewStudent(s)}>
                    {s.profile_pic ? (
                      <img src={mediaUrl(s.profile_pic)!} alt="" className="w-8 h-8 rounded-full object-cover border border-water-300 cursor-pointer hover:opacity-80 transition" onClick={(e) => { e.stopPropagation(); onZoomPic?.(mediaUrl(s.profile_pic)!) }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-water-200/50 flex items-center justify-center text-deep-400 text-xs border border-water-300">
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-deep-600 text-xs ml-1">{s.student_id ? `#${s.student_id}` : `#${s.id}`}</span>
                    <span className="text-deep-800">{s.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onEditStudent(s)} className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 transition">تعديل</button>
                    <button onClick={() => onDeleteStudent(s.id)} className="text-xs text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-3 text-deep-400 text-sm text-center">لا يوجد طلاب</div>
          )}
        </div>
      )}
    </div>
  )
}


// ─── Warnings Tab ────────────────────────────────────────────────────────────

function WarningsTab({ sheikhs }: { sheikhs: SheikhInfo[] }) {
  const [warnings, setWarnings] = useState<WarningRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sending, setSending] = useState(false)
  const [sheikhFilter, setSheikhFilter] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  const loadWarnings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getWarnings(sheikhFilter || undefined)
      setWarnings(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [sheikhFilter])

  useEffect(() => { loadWarnings() }, [loadWarnings])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === warnings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(warnings.map((w) => w.id)))
    }
  }

  const handleSend = async () => {
    if (selectedIds.size === 0) return
    if (!confirm('إرسال الإنذارات المحددة؟')) return
    setSending(true)
    setResult(null)
    try {
      const res = await api.sendWarnings(Array.from(selectedIds))
      const success = res.results.filter((r: any) => r.success).length
      const failed = res.results.filter((r: any) => !r.success).length
      setResult({ success, failed })
      setSelectedIds(new Set())
      loadWarnings()
    } catch (e: any) {
      setResult({ success: 0, failed: selectedIds.size })
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="page-loading" aria-label="جاري التحميل" />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={sheikhFilter}
          onChange={(e) => setSheikhFilter(e.target.value ? Number(e.target.value) : '')}
          className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 text-sm"
        >
          <option value="">كل الشيوخ</option>
          {sheikhs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          onClick={handleSend}
          disabled={selectedIds.size === 0 || sending}
          className="water-btn text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {sending ? 'جاري الإرسال...' : `إرسال المحدد (${selectedIds.size})`}
        </button>
      </div>

      {result && (
        <div className={`mb-4 px-4 py-2 rounded-xl text-sm text-center ${
          result.failed > 0 ? 'bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' : 'bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        }`}>
          تم إرسال {result.success} إنذارات بنجاح{result.failed > 0 ? `، فشل ${result.failed}` : ''}
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        {warnings.length === 0 ? (
          <div className="p-8 text-center text-deep-400">لا يوجد إنذارات</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-water-100/30 border-b border-water-200/30">
                <th className="px-3 py-3 text-right">
                  <input type="checkbox" checked={selectedIds.size === warnings.length && warnings.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-3 py-3 text-right text-deep-600 font-medium">#</th>
                <th className="px-3 py-3 text-right text-deep-600 font-medium">الطالب</th>
                <th className="px-3 py-3 text-right text-deep-600 font-medium">الشيخ</th>
                <th className="px-3 py-3 text-right text-deep-600 font-medium">السبب</th>
                <th className="px-3 py-3 text-right text-deep-600 font-medium">التاريخ</th>
                <th className="px-3 py-3 text-right text-deep-600 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-water-200/30">
              {warnings.map((w) => (
                <tr key={w.id} className="hover:bg-water-100/30">
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => toggleSelect(w.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-3 text-deep-800 font-medium">{w.warning_number}</td>
                  <td className="px-3 py-3 text-deep-800">{w.student_name}</td>
                  <td className="px-3 py-3 text-deep-600">{w.sheikh_name || '-'}</td>
                  <td className="px-3 py-3 text-deep-600 max-w-[200px] truncate">{w.reason}</td>
                  <td className="px-3 py-3 text-deep-600 text-xs">{new Date(w.created_at).toLocaleDateString('ar-SA')}</td>
                  <td className="px-3 py-3">
                    {w.sent ? (
                      <span className="text-emerald-600 bg-emerald-50/80 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full text-xs">تم الإرسال{w.sent_at ? ` (${new Date(w.sent_at).toLocaleDateString('ar-SA')})` : ''}</span>
                    ) : (
                      <span className="text-deep-400 bg-water-100/50 px-2 py-0.5 rounded-full text-xs">غير مرسل</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ManagePage() {
  const router = useRouter()
  const [sheikhs, setSheikhs] = useState<(SheikhInfo & { students: StudentInfo[] })[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [activeTab, setActiveTab] = useState<'sheikhs' | 'users' | 'circles' | 'warnings'>('sheikhs')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [expandedSheikhs, setExpandedSheikhs] = useState<Set<number>>(new Set())

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (u.role !== 'admin' && u.role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [router])

  const toggleSheikh = (id: number) => {
    setExpandedSheikhs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allExpanded = sheikhs.length > 0 && expandedSheikhs.size === sheikhs.length

  const toggleAllSheikhs = () => {
    if (allExpanded) {
      setExpandedSheikhs(new Set())
    } else {
      setExpandedSheikhs(new Set(sheikhs.map((s) => s.id)))
    }
  }
  const [previewPic, setPreviewPic] = useState<string | null>(null)
  const [viewStudent, setViewStudent] = useState<{ student: StudentInfo; sheikhName: string } | null>(null)

  const [showAddCircle, setShowAddCircle] = useState(false)
  const [showAddSheikh, setShowAddSheikh] = useState(false)
  const [editSheikh, setEditSheikh] = useState<SheikhInfo | null>(null)
  const [addingStudent, setAddingStudent] = useState<{ id: number; name: string } | null>(null)
  const [editStudent, setEditStudent] = useState<{ student: StudentInfo; sheikhName: string } | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showInviteUser, setShowInviteUser] = useState(false)
  const [editUser, setEditUser] = useState<UserInfo | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [sheikhsData, tahfizSettings, usersData, studentsData] = await Promise.all([
        api.getSheikhs(),
        api.getTahfizSettings(),
        api.getUsers(),
        api.getStudents(),
      ])
      const studentsBySheikh = new Map<number, StudentInfo[]>()
      ;(studentsData as StudentInfo[]).forEach((student) => {
        if (!student.sheikh) return
        const current = studentsBySheikh.get(student.sheikh.id) || []
        current.push(student)
        studentsBySheikh.set(student.sheikh.id, current)
      })
      const withStudents = sheikhsData.map((s: SheikhInfo) => ({
        ...s,
        students: (studentsBySheikh.get(s.id) || []).sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'ar')
        ),
      }))
      setSheikhs(withStudents)
      setCircles([tahfizSettings])
      setUsers(usersData)
    } catch (err: any) {
      setLoadError(err.message || 'تعذر تحميل بيانات الإدارة')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const [moveStudent, setMoveStudent] = useState<{ student: StudentInfo; sheikhName: string } | null>(null)
  const handleDragStart = (studentId: number, sheikhId: number) => {
    ;(window as any).__dragData = { studentId, fromSheikhId: sheikhId }
  }

  const handleDropReorder = async (sheikhId: number, targetStudentId?: number) => {
    const drag = (window as any).__dragData
    if (!drag) return
    ;(window as any).__dragData = null
    const sheikh = sheikhs.find((s) => s.id === sheikhId)
    if (!sheikh) return
    const ids = sheikh.students.map((s) => s.id)
    const fromIdx = ids.indexOf(drag.studentId)
    if (fromIdx === -1) return
    ids.splice(fromIdx, 1)
    if (targetStudentId !== undefined) {
      const toIdx = ids.indexOf(targetStudentId)
      if (toIdx !== -1) ids.splice(toIdx, 0, drag.studentId)
      else ids.push(drag.studentId)
    } else {
      ids.push(drag.studentId)
    }
    try {
      await api.reorderStudents(sheikhId, ids)
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDropOnSheikh = async (sheikhId: number) => {
    const drag = (window as any).__dragData
    if (!drag) return
    ;(window as any).__dragData = null
    if (drag.fromSheikhId === sheikhId) return
    try {
      await api.moveStudentSheikh(drag.studentId, sheikhId)
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteSheikh = async (id: number) => {
    if (!confirm('حذف الشيخ وجميع طلابه؟')) return
    await api.deleteSheikh(id)
    load()
  }

  const [deleteConfirm, setDeleteConfirm] = useState<{ studentId: number } | null>(null)

  const handleDeleteStudent = async (id: number) => {
    setDeleteConfirm({ studentId: id })
  }

  const confirmDeleteStudent = async (deleteSessions: boolean) => {
    if (!deleteConfirm) return
    await api.deleteStudent(deleteConfirm.studentId, deleteSessions)
    setDeleteConfirm(null)
    load()
  }

  const handleDeleteUser = async (id: number) => {
    if (!confirm('حذف المستخدم؟')) return
    await api.deleteUser(id)
    load()
  }

  const handleDeleteCircle = async (id: number) => {
    if (!confirm('تحذير: سيتم حذف الحلقة وجميع ما فيها بما في ذلك الجلسات وسجلات الحضور والشيوخ. هل أنت متأكد؟')) return
    await api.deleteCircle(id)
    load()
  }

  if (loading) return <div className="page-loading" aria-label="جاري التحميل" />
  if (loadError) return <AsyncState message={loadError} onRetry={load} />

  const tabs = [
    { key: 'sheikhs', label: 'الشيوخ والطلاب' },
    { key: 'users', label: 'المستخدمين' },
    { key: 'warnings', label: 'الإنذارات' },
  ] as const

  return (
    <div>
      <h1 className="text-2xl font-bold text-deep-800 mb-1">الإدارة</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-deep-500 text-sm">إجمالي الطلاب المقيدين: {sheikhs.reduce((sum, s) => sum + s.students.filter((st) => st.status === 'مقيد').length, 0)}</p>
        <Link href="/settings" className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold">⚙ إعدادات التحفيظ</Link>
      </div>

      <div className="mobile-scroll-tabs flex gap-2 mb-6 border-b border-water-200/30">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === t.key ? 'text-cyan-700 dark:text-cyan-400 border-cyan-500' : 'text-deep-500 border-transparent hover:text-deep-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Sheikhs & Students Tab ─────────────────────────────────────── */}
      {activeTab === 'sheikhs' && (
        <div>
          <div className="flex justify-between items-center gap-3 mb-4">
            <button onClick={toggleAllSheikhs} className="water-btn-outline px-4 py-2 rounded-xl text-sm">
              {allExpanded ? 'طي الكل' : 'فتح الكل'}
            </button>
            <button onClick={() => setShowAddSheikh(true)} className="water-btn text-white px-4 py-2 rounded-xl text-sm">+ إضافة شيخ</button>
          </div>

          {sheikhs.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
              <div className="text-4xl mb-3">💧</div>
              لا يوجد شيوخ بعد
            </div>
          ) : (
            <div className="space-y-4">
              {sheikhs.map((sheikh) => {
                const isExpanded = expandedSheikhs.has(sheikh.id)
                return (
                <div key={sheikh.id} className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-4 bg-water-100/30 cursor-pointer" onClick={() => toggleSheikh(sheikh.id)}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                      <span className={`text-deep-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>{'<'}</span>
                      <span className="text-lg font-bold text-deep-800 truncate">{sheikh.name}</span>
                      <span className="text-xs bg-water-200/50 text-deep-600 px-2 py-0.5 rounded-full">{sheikh.students.length} طالب</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setAddingStudent({ id: sheikh.id, name: sheikh.name })} className="water-btn-outline px-3 py-2 rounded-xl text-xs">+ طالب</button>
                      <button onClick={() => setEditSheikh(sheikh)} className="water-btn-outline px-3 py-2 rounded-xl text-xs">تعديل</button>
                      <button onClick={() => handleDeleteSheikh(sheikh.id)} className="px-3 py-2 rounded-xl text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/30 transition">حذف</button>
                    </div>
                  </div>
                   {isExpanded && (
                    <StudentStatusTabs
                      students={sheikh.students}
                      sheikhName={sheikh.name}
                      sheikhId={sheikh.id}
                      onViewStudent={(s) => setViewStudent({ student: s, sheikhName: sheikh.name })}
                      onEditStudent={(s) => setEditStudent({ student: s, sheikhName: sheikh.name })}
                      onDeleteStudent={handleDeleteStudent}
                      onDragStart={handleDragStart}
                      onDropReorder={handleDropReorder}
                      onDropOnSheikh={handleDropOnSheikh}
                      onZoomPic={(url) => setPreviewPic(url)}
                    />
                   )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Users Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div>
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            <button onClick={() => setShowInviteUser(true)} className="water-btn-outline px-4 py-2 rounded-xl text-sm">🔗 دعوة مستخدم</button>
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
                        u.role === 'admin' ? 'bg-purple-100/60 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-water-100/60 text-cyan-700'
                      }`}>
                        {u.role === 'admin' ? 'مدير' : 'شيخ'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditUser(u)} className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 transition">تعديل</button>
                      <button onClick={() => handleDeleteUser(u.id)} className="text-xs text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Warnings Tab ────────────────────────────────────────────────── */}
      {activeTab === 'warnings' && (
        <WarningsTab sheikhs={sheikhs} />
      )}

      {/* Modals */}
      {showAddCircle && <AddCircleModal onClose={() => setShowAddCircle(false)} onCreated={() => { setShowAddCircle(false); load() }} />}
      {showAddSheikh && <AddSheikhModal circles={circles} onClose={() => setShowAddSheikh(false)} onCreated={() => { setShowAddSheikh(false); load() }} />}
      {editSheikh && <EditSheikhModal sheikh={editSheikh} circles={circles} onClose={() => setEditSheikh(null)} onUpdated={() => { setEditSheikh(null); load() }} />}
      {addingStudent && <AddStudentModal sheikhId={addingStudent.id} sheikhName={addingStudent.name} onClose={() => setAddingStudent(null)} onCreated={() => { setAddingStudent(null); load() }} />}
      {editStudent && <EditStudentModal student={editStudent.student} sheikhName={editStudent.sheikhName} onClose={() => setEditStudent(null)} onUpdated={() => { setEditStudent(null); load() }} />}
      {showAddUser && <AddUserModal sheikhs={sheikhs} onClose={() => setShowAddUser(false)} onCreated={() => { setShowAddUser(false); load() }} />}
      {showInviteUser && <InviteUserModal sheikhs={sheikhs} onClose={() => setShowInviteUser(false)} />}
      {editUser && <EditUserModal user={editUser} sheikhs={sheikhs} onClose={() => setEditUser(null)} onUpdated={() => { setEditUser(null); load() }} />}
      {previewPic && <ImagePreviewModal src={previewPic} onClose={() => setPreviewPic(null)} />}
      {deleteConfirm && (
        <DeleteStudentModal
          onClose={() => setDeleteConfirm(null)}
          onConfirm={(deleteSessions) => confirmDeleteStudent(deleteSessions)}
        />
      )}
      {viewStudent && (
        <ViewStudentModal
          student={viewStudent.student}
          sheikhName={viewStudent.sheikhName}
          onClose={() => setViewStudent(null)}
          onEdit={() => {
            const s = viewStudent.student
            setViewStudent(null)
            setEditStudent({ student: s, sheikhName: viewStudent.sheikhName })
          }}
          onDelete={() => {
            const id = viewStudent.student.id
            setViewStudent(null)
            handleDeleteStudent(id)
          }}
          onMove={() => {
            setMoveStudent(viewStudent)
            setViewStudent(null)
          }}
          onZoomPic={(url) => setPreviewPic(url)}
        />
      )}
      {moveStudent && (
        <MoveSheikhModal
          student={moveStudent.student}
          currentSheikhName={moveStudent.sheikhName}
          sheikhs={sheikhs}
          onClose={() => setMoveStudent(null)}
          onMoved={() => { setMoveStudent(null); load() }}
        />
      )}

      <div className="mt-8 pt-6 border-t border-water-200/30 flex justify-center">
        <button
          onClick={async () => {
            try {
              const blob = await api.exportDb()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'zamzam_backup.db'
              a.click()
              URL.revokeObjectURL(url)
            } catch (err) {
              alert('فشل تصدير قاعدة البيانات')
            }
          }}
          className="water-btn-outline px-6 py-3 rounded-xl text-sm"
        >
          📥 تصدير قاعدة البيانات
        </button>
      </div>
    </div>
  )
}
