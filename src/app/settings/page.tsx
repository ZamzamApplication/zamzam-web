'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { configuredAttendanceStatuses } from '@/lib/attendance'
import type { Circle } from '@/lib/types'
import AsyncState from '@/components/AsyncState'

const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function TahfizSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Circle | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [maxWarnings, setMaxWarnings] = useState(3)
  const [weekStartDay, setWeekStartDay] = useState(6)
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [progressTrackingEnabled, setProgressTrackingEnabled] = useState(false)
  const [attendanceStatuses, setAttendanceStatuses] = useState<string[]>([])
  const [newAttendanceStatus, setNewAttendanceStatus] = useState('')
  const [whatsendApiUrl, setWhatsendApiUrl] = useState('')
  const [whatsendGroupsUrl, setWhatsendGroupsUrl] = useState('')
  const [whatsendApiKey, setWhatsendApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    if (storedUser.role !== 'admin' && storedUser.role !== 'super_admin') {
      router.replace('/dashboard')
      return
    }
    api.getTahfizSettings()
      .then((data: Circle) => {
        setSettings(data)
        setName(data.name)
        setDescription(data.description || '')
        setContactPhone(data.contact_phone || '')
        setMaxWarnings(data.max_warnings || 3)
        setWeekStartDay(data.week_start_day ?? 6)
        setMonthStartDay(data.month_start_day ?? 1)
        setProgressTrackingEnabled(Boolean(data.progress_tracking_enabled))
        setAttendanceStatuses(configuredAttendanceStatuses(data.attendance_statuses))
        setWhatsendApiUrl(data.whatsend_api_url || '')
        setWhatsendGroupsUrl(data.whatsend_groups_url || '')
      })
      .catch((err: any) => setError(err.message || 'تعذر تحميل إعدادات التحفيظ'))
      .finally(() => setLoading(false))
  }, [router])

  const addAttendanceStatus = () => {
    const status = newAttendanceStatus.trim()
    if (!status || attendanceStatuses.includes(status)) return
    setAttendanceStatuses(current => [...current, status])
    setNewAttendanceStatus('')
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || attendanceStatuses.length === 0) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await api.updateTahfizSettings({
        name: name.trim(),
        description,
        contact_phone: contactPhone,
        max_warnings: maxWarnings,
        week_start_day: weekStartDay,
        month_start_day: monthStartDay,
        attendance_statuses: attendanceStatuses,
        progress_tracking_enabled: progressTrackingEnabled,
        whatsend_api_url: whatsendApiUrl,
        whatsend_groups_url: whatsendGroupsUrl,
        ...(whatsendApiKey ? { whatsend_api_key: whatsendApiKey } : {}),
      })
      setSettings(updated)
      setWhatsendApiKey('')
      setNotice('تم حفظ إعدادات التحفيظ')
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (storedUser.tahfiz) {
        storedUser.tahfiz.name = updated.name
        localStorage.setItem('user', JSON.stringify(storedUser))
        localStorage.setItem('active_tahfiz_name', updated.name)
      }
    } catch (err: any) {
      setError(err.message || 'فشل حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page-loading" aria-label="جاري تحميل الإعدادات" />
  if (!settings) return <AsyncState message={error || 'تعذر تحميل إعدادات التحفيظ'} />

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-2xl p-5 md:p-7">
        <span className="inline-flex rounded-full bg-cyan-100/80 px-3 py-1 text-xs font-bold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
          إعدادات عامة
        </span>
        <h1 className="mt-3 text-2xl font-bold text-deep-900">إعدادات التحفيظ</h1>
        <p className="mt-2 text-sm text-deep-500">إدارة هوية التحفيظ، نظام الحضور، بداية الفترات والتكاملات.</p>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200">{notice}</div>}

      <form onSubmit={save} className="space-y-5">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">بيانات التحفيظ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-deep-700">
              اسم التحفيظ
              <input value={name} onChange={event => setName(event.target.value)} required className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold text-deep-700">
              رقم التواصل
              <input value={contactPhone} onChange={event => setContactPhone(event.target.value)} dir="ltr" className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold text-deep-700 md:col-span-2">
              الوصف
              <input value={description} onChange={event => setDescription(event.target.value)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" />
            </label>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">الفترات والإنذارات</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-deep-700">
              بداية الأسبوع
              <select value={weekStartDay} onChange={event => setWeekStartDay(Number(event.target.value))} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal">
                {WEEKDAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-deep-700">
              بداية الشهر
              <select value={monthStartDay} onChange={event => setMonthStartDay(Number(event.target.value))} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal">
                {Array.from({ length: 28 }, (_, index) => index + 1).map(day => <option key={day} value={day}>اليوم {day}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-deep-700">
              الحد الأقصى للإنذارات
              <input value={maxWarnings} onChange={event => setMaxWarnings(Number(event.target.value))} type="number" min="1" className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" />
            </label>
          </div>
          <p className="mt-3 text-xs text-deep-500">بداية الشهر تتحكم في نطاقات سجل الحضور والتقارير الشهرية.</p>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">الحضور ومتابعة القرآن</h2>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/60 p-4 dark:border-cyan-800 dark:bg-cyan-900/20">
            <input type="checkbox" checked={progressTrackingEnabled} onChange={event => setProgressTrackingEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-cyan-600" />
            <span>
              <span className="block text-sm font-bold text-deep-800">تفعيل متابعة الحفظ والمراجعة</span>
              <span className="mt-1 block text-xs text-deep-500">إيقافها يخفي الميزة دون حذف البيانات السابقة.</span>
            </span>
          </label>
          <div className="mt-5">
            <h3 className="text-sm font-bold text-deep-800">خيارات حالة الحضور</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {attendanceStatuses.map(status => (
                <div key={status} className="flex items-center justify-between rounded-xl border border-water-200 bg-white/40 px-3 py-2">
                  <span className="text-sm text-deep-800">{status}</span>
                  <button type="button" disabled={attendanceStatuses.length === 1} onClick={() => setAttendanceStatuses(current => current.filter(item => item !== status))} className="text-xs font-semibold text-red-500 disabled:opacity-40">حذف</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newAttendanceStatus}
                onChange={event => setNewAttendanceStatus(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addAttendanceStatus()
                  }
                }}
                maxLength={50}
                placeholder="حالة جديدة"
                className="surface-field min-w-0 flex-1 rounded-xl px-4 py-2.5"
              />
              <button type="button" onClick={addAttendanceStatus} disabled={!newAttendanceStatus.trim()} className="water-btn-outline rounded-xl px-4 text-sm disabled:opacity-40">إضافة</button>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">تكامل WhatSend</h2>
          <p className="mt-1 text-xs text-deep-500">اترك المفتاح فارغاً للاحتفاظ بالمفتاح المحفوظ حالياً.</p>
          <div className="mt-4 grid gap-4">
            <input value={whatsendApiUrl} onChange={event => setWhatsendApiUrl(event.target.value)} dir="ltr" placeholder="Send API URL" className="surface-field rounded-xl px-4 py-2.5" />
            <input value={whatsendGroupsUrl} onChange={event => setWhatsendGroupsUrl(event.target.value)} dir="ltr" placeholder="Groups API URL (اختياري)" className="surface-field rounded-xl px-4 py-2.5" />
            <input type="password" value={whatsendApiKey} onChange={event => setWhatsendApiKey(event.target.value)} dir="ltr" placeholder={settings.whatsend_api_key_configured ? 'المفتاح محفوظ — اكتب بديلاً لتغييره' : 'API key'} className="surface-field rounded-xl px-4 py-2.5" />
          </div>
        </section>

        <div className="sticky bottom-20 z-20 flex justify-end md:bottom-4">
          <button type="submit" disabled={saving || !name.trim() || attendanceStatuses.length === 0} className="water-btn rounded-xl px-7 py-3 font-semibold text-white shadow-lg disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  )
}
