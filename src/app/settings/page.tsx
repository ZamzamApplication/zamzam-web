'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { configuredAttendanceStatuses } from '@/lib/attendance'
import { configuredExcelExportTemplates, DEFAULT_EXCEL_EXPORT_TEMPLATES, type ExcelExportTemplates } from '@/lib/excel-templates'
import type { Circle, SheikhInfo, TahfizInvitation } from '@/lib/types'
import AsyncState from '@/components/AsyncState'
import ExcelTemplateSettings from '@/components/ExcelTemplateSettings'

const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const STATUS_COLOR_OPTIONS = [
  { key: 'green', label: 'أخضر', className: 'bg-emerald-500' },
  { key: 'slate', label: 'رمادي', className: 'bg-slate-500' },
  { key: 'amber', label: 'ذهبي', className: 'bg-amber-500' },
  { key: 'sky', label: 'أزرق', className: 'bg-sky-500' },
  { key: 'violet', label: 'بنفسجي', className: 'bg-violet-500' },
  { key: 'rose', label: 'وردي', className: 'bg-rose-500' },
] as const

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
  const [sheikhSelectionEnabled, setSheikhSelectionEnabled] = useState(true)
  const [attendanceStatuses, setAttendanceStatuses] = useState<string[]>([])
  const [attendanceStatusColors, setAttendanceStatusColors] = useState<Record<string, string>>({})
  const [attendanceStatusRenames, setAttendanceStatusRenames] = useState<Record<string, string>>({})
  const [excelExportTemplates, setExcelExportTemplates] = useState<ExcelExportTemplates>(
    configuredExcelExportTemplates(DEFAULT_EXCEL_EXPORT_TEMPLATES)
  )
  const [excusedStreakLimit, setExcusedStreakLimit] = useState(3)
  const [excusedResetStatuses, setExcusedResetStatuses] = useState<string[]>(['حاضر'])
  const [streakAlertEnabled, setStreakAlertEnabled] = useState(true)
  const [streakStatus, setStreakStatus] = useState('غياب بعذر')
  const [newAttendanceStatus, setNewAttendanceStatus] = useState('')
  const [editingAttendanceStatus, setEditingAttendanceStatus] = useState<string | null>(null)
  const [editedAttendanceStatusName, setEditedAttendanceStatusName] = useState('')
  const [attendanceStatusNameError, setAttendanceStatusNameError] = useState('')
  const [whatsendApiUrl, setWhatsendApiUrl] = useState('')
  const [whatsendGroupsUrl, setWhatsendGroupsUrl] = useState('')
  const [whatsendApiKey, setWhatsendApiKey] = useState('')
  const [whatsendEnabled, setWhatsendEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [invitations, setInvitations] = useState<TahfizInvitation[]>([])
  const [sheikhs, setSheikhs] = useState<SheikhInfo[]>([])
  const [invitationRole, setInvitationRole] = useState<'admin' | 'sheikh'>('sheikh')
  const [invitationSheikhId, setInvitationSheikhId] = useState<number | null>(null)
  const [invitationHours, setInvitationHours] = useState(48)
  const [invitationBusy, setInvitationBusy] = useState(false)
  const [latestInvitationLink, setLatestInvitationLink] = useState('')

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
        setSheikhSelectionEnabled(data.attendance_sheikh_selection_enabled ?? true)
        setAttendanceStatuses(configuredAttendanceStatuses(data.attendance_statuses))
        setAttendanceStatusColors(data.attendance_status_colors || {
          'حاضر': 'green', 'غياب': 'slate', 'غياب بعذر': 'amber', 'لا ينطبق': 'sky',
        })
        setExcelExportTemplates(configuredExcelExportTemplates(data.excel_export_templates))
        setStreakAlertEnabled(data.attendance_streak_alert_enabled ?? true)
        setStreakStatus(data.attendance_streak_status || 'غياب بعذر')
        setExcusedStreakLimit(data.attendance_streak_limit ?? data.excused_absence_streak_limit ?? 3)
        setExcusedResetStatuses(data.attendance_streak_reset_statuses ?? data.excused_absence_reset_statuses ?? ['حاضر'])
        setWhatsendEnabled(data.whatsend_enabled ?? true)
        setWhatsendApiUrl(data.whatsend_api_url || '')
        setWhatsendGroupsUrl(data.whatsend_groups_url || '')
      })
      .catch((err: any) => setError(err.message || 'تعذر تحميل إعدادات التحفيظ'))
      .finally(() => setLoading(false))
  }, [router])

  const loadInvitations = async () => {
    const [invitationRows, sheikhRows] = await Promise.all([
      api.getInvitations(),
      api.getSheikhs() as Promise<SheikhInfo[]>,
    ])
    setInvitations(invitationRows)
    setSheikhs(sheikhRows)
  }

  useEffect(() => {
    loadInvitations().catch((err: any) => setError(err.message || 'تعذر تحميل الدعوات'))
  }, [])

  const showInvitationLink = (invitation: TahfizInvitation) => {
    if (!invitation.path) return
    setLatestInvitationLink(`${window.location.origin}${invitation.path}`)
  }

  const createInvitation = async () => {
    setInvitationBusy(true)
    setError('')
    try {
      const invitation = await api.createInvitation(invitationRole, invitationRole === 'sheikh' ? invitationSheikhId : null, invitationHours)
      showInvitationLink(invitation)
      await loadInvitations()
    } catch (err: any) {
      setError(err.message || 'تعذر إنشاء الدعوة')
    } finally {
      setInvitationBusy(false)
    }
  }

  const resendInvitation = async (id: number) => {
    setInvitationBusy(true)
    setError('')
    try {
      const invitation = await api.resendInvitation(id)
      showInvitationLink(invitation)
      await loadInvitations()
    } catch (err: any) {
      setError(err.message || 'تعذر إعادة إرسال الدعوة')
    } finally {
      setInvitationBusy(false)
    }
  }

  const revokeInvitation = async (id: number) => {
    if (!window.confirm('هل تريد إلغاء هذه الدعوة؟ لن يعمل رابطها بعد ذلك.')) return
    setInvitationBusy(true)
    try {
      await api.revokeInvitation(id)
      await loadInvitations()
    } catch (err: any) {
      setError(err.message || 'تعذر إلغاء الدعوة')
    } finally {
      setInvitationBusy(false)
    }
  }

  const addAttendanceStatus = () => {
    const status = newAttendanceStatus.trim()
    if (!status || attendanceStatuses.includes(status)) return
    setAttendanceStatuses(current => [...current, status])
    setAttendanceStatusColors(current => ({ ...current, [status]: 'violet' }))
    setNewAttendanceStatus('')
  }

  const moveAttendanceStatus = (index: number, direction: -1 | 1) => {
    setAttendanceStatuses(current => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeAttendanceStatus = (status: string) => {
    setAttendanceStatuses(current => {
      const next = current.filter(item => item !== status)
      if (status === streakStatus) setStreakStatus(next[0] || '')
      return next
    })
    setExcusedResetStatuses(current => current.filter(item => item !== status))
    setAttendanceStatusColors(current => {
      const next = { ...current }
      delete next[status]
      return next
    })
    setAttendanceStatusRenames(current => {
      const next = { ...current }
      const originalStatus = Object.entries(next).find(([, renamed]) => renamed === status)?.[0]
      if (originalStatus) delete next[originalStatus]
      delete next[status]
      return next
    })
  }

  const startEditingAttendanceStatus = (status: string) => {
    setEditingAttendanceStatus(status)
    setEditedAttendanceStatusName(status)
    setAttendanceStatusNameError('')
  }

  const renameAttendanceStatus = () => {
    if (!editingAttendanceStatus) return
    const previousName = editingAttendanceStatus
    const nextName = editedAttendanceStatusName.trim()
    if (!nextName) {
      setAttendanceStatusNameError('اسم الحالة مطلوب')
      return
    }
    if (attendanceStatuses.some(status => status !== previousName && status === nextName)) {
      setAttendanceStatusNameError('اسم الحالة مستخدم بالفعل')
      return
    }
    if (nextName !== previousName) {
      setAttendanceStatuses(current => current.map(status => status === previousName ? nextName : status))
      setAttendanceStatusColors(current => {
        const next = { ...current, [nextName]: current[previousName] || 'violet' }
        delete next[previousName]
        return next
      })
      setStreakStatus(current => current === previousName ? nextName : current)
      setExcusedResetStatuses(current => current.map(status => status === previousName ? nextName : status))
      setAttendanceStatusRenames(current => {
        const next = { ...current }
        const existingOriginalName = Object.entries(next).find(([, renamed]) => renamed === previousName)?.[0]
        const wasPersisted = configuredAttendanceStatuses(settings?.attendance_statuses).includes(previousName)
        const originalName = existingOriginalName || (wasPersisted ? previousName : null)
        if (!originalName) return current
        if (originalName === nextName) delete next[originalName]
        else next[originalName] = nextName
        return next
      })
    }
    setEditingAttendanceStatus(null)
    setEditedAttendanceStatusName('')
    setAttendanceStatusNameError('')
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
        attendance_status_renames: attendanceStatusRenames,
        attendance_status_colors: attendanceStatusColors,
        excel_export_templates: excelExportTemplates,
        attendance_streak_alert_enabled: streakAlertEnabled,
        attendance_streak_status: streakStatus,
        attendance_streak_limit: excusedStreakLimit,
        attendance_streak_reset_statuses: excusedResetStatuses,
        progress_tracking_enabled: progressTrackingEnabled,
        attendance_sheikh_selection_enabled: sheikhSelectionEnabled,
        whatsend_enabled: whatsendEnabled,
        whatsend_api_url: whatsendApiUrl,
        whatsend_groups_url: whatsendGroupsUrl,
        ...(whatsendApiKey ? { whatsend_api_key: whatsendApiKey } : {}),
      })
      setSettings(updated)
      setAttendanceStatusRenames({})
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
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SettingSummary label="متابعة القرآن" enabled={progressTrackingEnabled} />
          <SettingSummary label="اختيار الشيخ في الحضور" enabled={sheikhSelectionEnabled} />
          <SettingSummary label="تنبيهات التكرار" enabled={streakAlertEnabled} />
          <SettingSummary label="تكامل WhatSend" enabled={whatsendEnabled} />
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200">{notice}</div>}

      <form onSubmit={save} className="space-y-5">
        <SettingsSection title="بيانات التحفيظ" description="الاسم وبيانات التواصل الظاهرة للمستخدمين." defaultOpen>
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
        </SettingsSection>

        <SettingsSection title="الفترات والإنذارات" description="بداية نطاقات التقارير والحد العام للإنذارات.">
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
        </SettingsSection>

        <SettingsSection title="الحضور ومتابعة القرآن" description="الحالات وترتيبها والميزات التي تظهر أثناء تسجيل الحلقة." defaultOpen>
          <FeatureToggle
            enabled={progressTrackingEnabled}
            onChange={setProgressTrackingEnabled}
            title="متابعة الحفظ والمراجعة"
            description="إيقافها يخفي الميزة دون حذف البيانات السابقة."
          />
          <div className="mt-3">
            <FeatureToggle
              enabled={sheikhSelectionEnabled}
              onChange={setSheikhSelectionEnabled}
              title="اختيار الشيخ أثناء تسجيل الحضور"
              description="عند إيقافه يُخفى عمود الشيخ ويُستخدم الشيخ المرتبط بالطالب تلقائياً."
            />
          </div>
          <div className="mt-5">
            <h3 className="text-sm font-bold text-deep-800">خيارات حالة الحضور</h3>
            <div className="mt-2 grid gap-2">
              {attendanceStatuses.map((status, index) => (
                <div key={status} className="flex items-center gap-2 rounded-xl border border-water-200 bg-white/40 px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-cyan-50 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">{index + 1}</span>
                  {editingAttendanceStatus === status ? (
                    <div className="min-w-32 flex-1">
                      <input
                        autoFocus
                        value={editedAttendanceStatusName}
                        onChange={event => {
                          setEditedAttendanceStatusName(event.target.value)
                          setAttendanceStatusNameError('')
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            renameAttendanceStatus()
                          } else if (event.key === 'Escape') {
                            setEditingAttendanceStatus(null)
                            setAttendanceStatusNameError('')
                          }
                        }}
                        maxLength={50}
                        aria-label={`تعديل اسم حالة ${status}`}
                        className="surface-field w-full rounded-lg px-3 py-1.5 text-sm"
                      />
                      {attendanceStatusNameError && <p className="mt-1 text-[11px] text-red-600">{attendanceStatusNameError}</p>}
                    </div>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-deep-800">{status}</span>
                  )}
                  <div className="flex items-center gap-1" aria-label={`لون ${status}`}>
                    {STATUS_COLOR_OPTIONS.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setAttendanceStatusColors(current => ({ ...current, [status]: option.key }))}
                        title={option.label}
                        aria-label={`اختيار اللون ${option.label} لحالة ${status}`}
                        aria-pressed={(attendanceStatusColors[status] || 'violet') === option.key}
                        className={`h-5 w-5 rounded-full ${option.className} ${(attendanceStatusColors[status] || 'violet') === option.key ? 'ring-2 ring-cyan-600 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-65 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                  {editingAttendanceStatus === status ? (
                    <>
                      <button type="button" onClick={renameAttendanceStatus} className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">حفظ الاسم</button>
                      <button type="button" onClick={() => { setEditingAttendanceStatus(null); setAttendanceStatusNameError('') }} className="text-xs text-deep-500">إلغاء</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => startEditingAttendanceStatus(status)} className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">تعديل الاسم</button>
                  )}
                  <button type="button" disabled={index === 0} onClick={() => moveAttendanceStatus(index, -1)} aria-label={`تحريك ${status} لأعلى`} className="rounded-lg border border-water-200 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                  <button type="button" disabled={index === attendanceStatuses.length - 1} onClick={() => moveAttendanceStatus(index, 1)} aria-label={`تحريك ${status} لأسفل`} className="rounded-lg border border-water-200 px-2 py-1 text-xs disabled:opacity-30">↓</button>
                  <button type="button" disabled={attendanceStatuses.length === 1} onClick={() => removeAttendanceStatus(status)} className="text-xs font-semibold text-red-500 disabled:opacity-40">حذف</button>
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
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <FeatureToggle
                enabled={streakAlertEnabled}
                onChange={setStreakAlertEnabled}
                title="تنبيه تكرار حالة حضور متتالية"
                description="اختر أي حالة وحدّ التنبيه وطريقة تصفير العداد."
              />
              {streakAlertEnabled && <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-deep-600">
                  الحالة التي يتم عدّها
                  <select value={streakStatus} onChange={event => {
                    const next = event.target.value
                    setStreakStatus(next)
                    setExcusedResetStatuses(current => current.filter(status => status !== next))
                  }} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm font-normal">
                    {attendanceStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-deep-600">
                  نبّه بعد تجاوز هذا العدد
                  <input type="number" min={1} max={1000} value={excusedStreakLimit} onChange={event => setExcusedStreakLimit(Math.max(1, Number(event.target.value) || 1))} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm font-normal" />
                </label>
                <fieldset className="md:col-span-2">
                  <legend className="text-xs font-semibold text-deep-600">الحالات التي تعيد العداد إلى الصفر</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attendanceStatuses.filter(status => status !== streakStatus).map(status => {
                      const checked = excusedResetStatuses.includes(status)
                      return (
                        <label key={status} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${checked ? 'border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200' : 'border-water-200 bg-white/50 text-deep-600 dark:bg-slate-800/50'}`}>
                          <input type="checkbox" checked={checked} onChange={() => setExcusedResetStatuses(current => checked ? current.filter(item => item !== status) : [...current, status])} className="accent-cyan-600" />
                          {status}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
                <p className="text-[11px] leading-5 text-deep-500 md:col-span-2">حالة «{streakStatus}» تزيد العداد، والحالات المحددة تصفّره، وبقية الحالات لا تغيّره.</p>
              </div>}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="قوالب Excel" description="اختر الأعمدة وعناوينها مرة واحدة لجميع ملفات الحضور والتقارير.">
          <p className="text-xs leading-5 text-deep-500">
            الأعمدة المخصصة تظهر فارغة في كل صف لتعبئتها بعد التنزيل. ستستخدم المعاينة والتصدير هذه الإعدادات تلقائياً.
          </p>
          <ExcelTemplateSettings value={excelExportTemplates} onChange={setExcelExportTemplates} />
        </SettingsSection>

        <SettingsSection title="دعوات الانضمام" description="روابط مؤقتة لإضافة المديرين والشيوخ.">
          <p className="mt-1 text-xs text-deep-500">أنشئ روابط مؤقتة، وتابع المقبول والمنتهي، أو ألغِ وأعد إرسال الدعوات.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <select value={invitationRole} onChange={event => { setInvitationRole(event.target.value as 'admin' | 'sheikh'); setInvitationSheikhId(null) }} className="surface-field rounded-xl px-3 py-2.5 text-sm">
              <option value="sheikh">دعوة شيخ</option>
              <option value="admin">دعوة مدير</option>
            </select>
            <select value={invitationSheikhId ?? ''} onChange={event => setInvitationSheikhId(event.target.value ? Number(event.target.value) : null)} disabled={invitationRole !== 'sheikh'} className="surface-field rounded-xl px-3 py-2.5 text-sm disabled:opacity-50">
              <option value="">بدون ربط بشيخ</option>
              {sheikhs.map(sheikh => <option key={sheikh.id} value={sheikh.id}>{sheikh.name}</option>)}
            </select>
            <select value={invitationHours} onChange={event => setInvitationHours(Number(event.target.value))} className="surface-field rounded-xl px-3 py-2.5 text-sm">
              <option value={24}>صالحة ليوم</option>
              <option value={48}>صالحة ليومين</option>
              <option value={168}>صالحة لأسبوع</option>
            </select>
            <button type="button" onClick={createInvitation} disabled={invitationBusy} className="water-btn rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">إنشاء دعوة</button>
          </div>
          {latestInvitationLink && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center">
              <input readOnly value={latestInvitationLink} dir="ltr" className="surface-field min-w-0 flex-1 rounded-lg px-3 py-2 text-xs" />
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(latestInvitationLink); setNotice('تم نسخ رابط الدعوة') }} className="water-btn-outline rounded-lg px-4 py-2 text-xs font-semibold">نسخ الرابط</button>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {invitations.length === 0 && <p className="text-xs text-deep-500">لا توجد دعوات بعد.</p>}
            {invitations.map(invitation => (
              <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-water-200 bg-white/45 px-3 py-3 dark:bg-slate-800/45">
                <div>
                  <p className="text-sm font-bold text-deep-800">{invitation.role === 'admin' ? 'مدير' : `شيخ${invitation.sheikh_name ? ` — ${invitation.sheikh_name}` : ''}`}</p>
                  <p className="mt-1 text-[11px] text-deep-500">أنشأها {invitation.creator_username || '—'} · تنتهي {new Date(invitation.expires_at).toLocaleString('ar-EG')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${invitation.status === 'active' ? 'bg-emerald-100 text-emerald-700' : invitation.status === 'used' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'}`}>
                    {invitation.status === 'active' ? 'نشطة' : invitation.status === 'used' ? 'مقبولة' : invitation.status === 'expired' ? 'منتهية' : 'ملغاة'}
                  </span>
                  {invitation.status !== 'used' && <button type="button" onClick={() => resendInvitation(invitation.id)} disabled={invitationBusy} className="text-xs font-semibold text-cyan-700 disabled:opacity-50">إعادة إرسال</button>}
                  {invitation.status === 'active' && <button type="button" onClick={() => revokeInvitation(invitation.id)} disabled={invitationBusy} className="text-xs font-semibold text-red-600 disabled:opacity-50">إلغاء</button>}
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="التكاملات" description="خدمات خارجية اختيارية؛ تبقى إعداداتها محفوظة عند إيقافها.">
          <FeatureToggle enabled={whatsendEnabled} onChange={setWhatsendEnabled} title="تكامل WhatSend" description="إرسال الإنذارات وتحميل مجموعات واتساب. إيقافه يحتفظ بالإعدادات." />
          {whatsendEnabled && <div className="mt-4 grid gap-4">
            <input value={whatsendApiUrl} onChange={event => setWhatsendApiUrl(event.target.value)} dir="ltr" placeholder="Send API URL" className="surface-field rounded-xl px-4 py-2.5" />
            <input value={whatsendGroupsUrl} onChange={event => setWhatsendGroupsUrl(event.target.value)} dir="ltr" placeholder="Groups API URL (اختياري)" className="surface-field rounded-xl px-4 py-2.5" />
            <input type="password" value={whatsendApiKey} onChange={event => setWhatsendApiKey(event.target.value)} dir="ltr" placeholder={settings.whatsend_api_key_configured ? 'المفتاح محفوظ — اكتب بديلاً لتغييره' : 'API key'} className="surface-field rounded-xl px-4 py-2.5" />
          </div>}
        </SettingsSection>

        <div className="sticky bottom-40 z-20 flex justify-start md:bottom-4">
          <button type="submit" disabled={saving || !name.trim() || attendanceStatuses.length === 0} className="water-btn rounded-xl px-7 py-3 font-semibold text-white shadow-lg disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SettingsSection({ title, description, defaultOpen = false, children }: { title: string; description: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="group glass-card rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <span>
          <span className="block font-bold text-deep-900">{title}</span>
          <span className="mt-1 block text-xs font-normal text-deep-500">{description}</span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-water-100 text-lg text-deep-600 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-water-200/60 px-5 pb-5 pt-4">{children}</div>
    </details>
  )
}

function SettingSummary({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-water-200 bg-white/45 px-3 py-2 text-xs dark:bg-slate-800/45">
      <span className="font-semibold text-deep-700">{label}</span>
      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
        {enabled ? 'مفعّل' : 'متوقف'}
      </span>
    </div>
  )
}

function FeatureToggle({ enabled, onChange, title, description }: { enabled: boolean; onChange(value: boolean): void; title: string; description: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${enabled ? 'border-cyan-300 bg-cyan-50/60 dark:border-cyan-700 dark:bg-cyan-900/20' : 'border-water-200 bg-white/35 dark:bg-slate-800/35'}`}>
      <span>
        <span className="block text-sm font-bold text-deep-800">{title}</span>
        <span className="mt-1 block text-xs text-deep-500">{description}</span>
      </span>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'right-6' : 'right-1'}`} />
      </button>
    </div>
  )
}
