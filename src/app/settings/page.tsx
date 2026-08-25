'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { configuredAbsentStatus, configuredAttendanceStatuses, configuredPresentStatus } from '@/lib/attendance'
import { configuredExcelExportTemplates, DEFAULT_EXCEL_EXPORT_TEMPLATES, type ExcelExportTemplates } from '@/lib/excel-templates'
import type { Circle, SheikhInfo, StudentCategory, TahfizInvitation } from '@/lib/types'
import type { WardCategory } from '@/lib/types'
import { PROGRESS_CATEGORY_OPTIONS } from '@/components/TahfizInitialSettingsFields'
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

const SETTINGS_CATEGORIES = [
  { key: 'general', icon: '🏠', title: 'بيانات التحفيظ', description: 'الاسم، التواصل، الفترات والإنذارات' },
  { key: 'attendance', icon: '✓', title: 'الحضور والحلقات', description: 'الصلاحيات، الحلقات، التصنيفات وحالات الحضور' },
  { key: 'progress', icon: '📖', title: 'متابعة القرآن', description: 'تفعيل متابعة الحفظ والمراجعة' },
  { key: 'excel', icon: '📊', title: 'قوالب Excel', description: 'الأعمدة والعناوين وتنسيق ملفات التصدير' },
  { key: 'invitations', icon: '👥', title: 'دعوات الانضمام', description: 'إضافة المديرين والشيوخ ومتابعة الدعوات' },
  { key: 'integrations', icon: '🔗', title: 'التكاملات', description: 'إعداد خدمات WhatSend وواتساب' },
] as const

export default function TahfizSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedSection = searchParams.get('section')
  const section = ['general', 'attendance', 'progress', 'excel', 'invitations', 'integrations'].includes(requestedSection || '')
    ? requestedSection as 'general' | 'attendance' | 'progress' | 'excel' | 'invitations' | 'integrations'
    : null
  const [settings, setSettings] = useState<Circle | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [maxWarnings, setMaxWarnings] = useState(3)
  const [weekStartDay, setWeekStartDay] = useState(6)
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [progressTrackingEnabled, setProgressTrackingEnabled] = useState(false)
  const [progressCategories, setProgressCategories] = useState<WardCategory[]>(['new_memorization'])
  const [sheikhSelectionEnabled, setSheikhSelectionEnabled] = useState(true)
  const [restrictSheikhStudentAccess, setRestrictSheikhStudentAccess] = useState(true)
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
  const [presentStatus, setPresentStatus] = useState('حاضر')
  const [absentStatus, setAbsentStatus] = useState('غياب')
  const [multipleSessionsEnabled, setMultipleSessionsEnabled] = useState(false)
  const [sessionNameOptions, setSessionNameOptions] = useState<string[]>([])
  const [sheikhCustomFieldsEnabled, setSheikhCustomFieldsEnabled] = useState(true)
  const [newSessionNameOption, setNewSessionNameOption] = useState('')
  const [studentCategories, setStudentCategories] = useState<StudentCategory[]>([])
  const [newStudentCategory, setNewStudentCategory] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)
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
  const [dirty, setDirty] = useState(false)
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
        setProgressCategories(data.progress_categories?.length ? data.progress_categories : ['new_memorization'])
        setSheikhSelectionEnabled(data.attendance_sheikh_selection_enabled ?? true)
        setRestrictSheikhStudentAccess(data.restrict_sheikh_student_access ?? true)
        setAttendanceStatuses(configuredAttendanceStatuses(data.attendance_statuses))
        setPresentStatus(configuredPresentStatus(data.present_status, data.attendance_statuses))
        setAbsentStatus(configuredAbsentStatus(data.absent_status, data.attendance_statuses))
        setMultipleSessionsEnabled(Boolean(data.multiple_sessions_per_day_enabled))
        setSessionNameOptions(data.session_name_options || ['الصباحية', 'المسائية'])
        setSheikhCustomFieldsEnabled(data.sheikh_custom_fields_enabled ?? true)
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

  useEffect(() => {
    api.getStudentCategories()
      .then(setStudentCategories)
      .catch(() => {})
  }, [])

  const createStudentCategory = async () => {
    const categoryName = newStudentCategory.trim()
    if (!categoryName) return
    setCategoryBusy(true)
    setError('')
    try {
      const created = await api.createStudentCategory(categoryName)
      setStudentCategories(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'ar')))
      setNewStudentCategory('')
    } catch (reason: any) {
      setError(reason.message || 'تعذر إنشاء تصنيف الطلاب')
    } finally {
      setCategoryBusy(false)
    }
  }

  const renameStudentCategory = async (category: StudentCategory) => {
    const nextName = window.prompt('اسم التصنيف الجديد', category.name)?.trim()
    if (!nextName || nextName === category.name) return
    setCategoryBusy(true)
    try {
      const updated = await api.updateStudentCategory(category.id, nextName)
      setStudentCategories(current => current.map(item => item.id === category.id ? { ...item, name: updated.name } : item))
    } catch (reason: any) {
      setError(reason.message || 'تعذر تعديل التصنيف')
    } finally {
      setCategoryBusy(false)
    }
  }

  const deleteStudentCategory = async (category: StudentCategory) => {
    if (!window.confirm(`حذف تصنيف «${category.name}»؟ لن تتغير الحلقات السابقة.`)) return
    setCategoryBusy(true)
    try {
      await api.deleteStudentCategory(category.id)
      setStudentCategories(current => current.filter(item => item.id !== category.id))
    } catch (reason: any) {
      setError(reason.message || 'تعذر حذف التصنيف')
    } finally {
      setCategoryBusy(false)
    }
  }

  const loadInvitations = async () => {
    const [invitationRows, sheikhRows] = await Promise.all([
      api.getInvitations(),
      api.getSheikhs() as Promise<SheikhInfo[]>,
    ])
    setInvitations(invitationRows)
    setSheikhs(sheikhRows)
  }

  useEffect(() => {
    if (section !== 'invitations') return
    loadInvitations().catch((err: any) => setError(err.message || 'تعذر تحميل الدعوات'))
  }, [section])

  useEffect(() => {
    if (!dirty || section === 'invitations') return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty, section])

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
      if (status === presentStatus) setPresentStatus(configuredPresentStatus(undefined, next))
      if (status === absentStatus) setAbsentStatus(configuredAbsentStatus(undefined, next))
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
      setPresentStatus(current => current === previousName ? nextName : current)
      setAbsentStatus(current => current === previousName ? nextName : current)
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

  const save = async (event: React.FormEvent, activeSection: NonNullable<typeof section>) => {
    event.preventDefault()
    if (activeSection === 'general' && !name.trim()) return
    if (activeSection === 'attendance' && attendanceStatuses.length === 0) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payloads: Record<Exclude<NonNullable<typeof section>, 'invitations'>, Record<string, unknown>> = {
        general: {
          name: name.trim(), description, contact_phone: contactPhone,
          max_warnings: maxWarnings, week_start_day: weekStartDay, month_start_day: monthStartDay,
        },
        attendance: {
          attendance_statuses: attendanceStatuses,
          attendance_status_renames: attendanceStatusRenames,
          attendance_status_colors: attendanceStatusColors,
          attendance_streak_alert_enabled: streakAlertEnabled,
          attendance_streak_status: streakStatus,
          attendance_streak_limit: excusedStreakLimit,
          attendance_streak_reset_statuses: excusedResetStatuses,
          present_status: presentStatus,
          absent_status: absentStatus,
          attendance_sheikh_selection_enabled: sheikhSelectionEnabled,
          restrict_sheikh_student_access: restrictSheikhStudentAccess,
          multiple_sessions_per_day_enabled: multipleSessionsEnabled,
          session_name_options: sessionNameOptions,
          sheikh_custom_fields_enabled: sheikhCustomFieldsEnabled,
        },
        progress: { progress_tracking_enabled: progressTrackingEnabled, progress_categories: progressCategories },
        excel: { excel_export_templates: excelExportTemplates },
        integrations: {
          whatsend_enabled: whatsendEnabled,
          ...(whatsendEnabled ? {
            whatsend_api_url: whatsendApiUrl,
            whatsend_groups_url: whatsendGroupsUrl,
            ...(whatsendApiKey ? { whatsend_api_key: whatsendApiKey } : {}),
          } : {}),
        },
      }
      if (activeSection === 'invitations') return
      const updated = await api.updateTahfizSettings(payloads[activeSection])
      setSettings(updated)
      setDirty(false)
      setAttendanceStatusRenames({})
      setWhatsendApiKey('')
      setNotice('تم حفظ الإعدادات')
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

  if (!section) {
    return <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div><h1 className="text-2xl font-bold text-deep-900">إعدادات التحفيظ</h1><p className="mt-1 text-sm text-deep-500">اختر القسم الذي تريد تعديله.</p></div>
        <Link href="/audit-log" className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold">📋 سجل التدقيق</Link>
      </header>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_CATEGORIES.map(category => <Link key={category.key} href={`/settings?section=${category.key}`} className="glass-card group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-water-100 text-xl">{category.icon}</span>
          <h2 className="mt-4 font-bold text-deep-900 group-hover:text-blue-700 dark:group-hover:text-blue-300">{category.title}</h2>
          <p className="mt-1 text-sm leading-6 text-deep-500">{category.description}</p>
          <span className="mt-4 inline-block text-sm font-semibold text-blue-700 dark:text-blue-300">فتح الإعدادات ‹</span>
        </Link>)}
      </div>
    </div>
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div><Link href="/settings" onClick={event => { if (dirty && section !== 'invitations' && !window.confirm('لديك تغييرات غير محفوظة. هل تريد الخروج؟')) event.preventDefault() }} className="text-sm font-semibold text-blue-700 dark:text-blue-300">كل الإعدادات ‹</Link><h1 className="mt-1 text-2xl font-bold text-deep-900">{SETTINGS_CATEGORIES.find(item => item.key === section)?.title}</h1><p className="mt-1 text-sm text-deep-500">{SETTINGS_CATEGORIES.find(item => item.key === section)?.description}</p></div>
      </header>

      <nav aria-label="أقسام الإعدادات" className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {SETTINGS_CATEGORIES.map(item => <Link key={item.key} href={`/settings?section=${item.key}`} onClick={event => {
            if (item.key !== section && dirty && section !== 'invitations' && !window.confirm('لديك تغييرات غير محفوظة. هل تريد الانتقال دون حفظها؟')) event.preventDefault()
          }} aria-current={item.key === section ? 'page' : undefined} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${item.key === section ? 'border-cyan-500 bg-cyan-600 text-white shadow-sm' : 'border-water-200 bg-white/55 text-deep-600 hover:border-cyan-300 dark:bg-slate-800/65'}`}>
            <span aria-hidden="true">{item.icon}</span>{item.title}
          </Link>)}
        </div>
      </nav>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200">{notice}</div>}

      <form onSubmit={event => void save(event, section)} onChangeCapture={event => { if (!(event.target as HTMLElement).closest('[data-immediate-action]')) setDirty(true) }} onClickCapture={event => { const button = (event.target as HTMLElement).closest('button:not([type="submit"])'); if (button && !button.closest('[data-immediate-action]')) setDirty(true) }} className="space-y-5">
        {section === 'general' && <>
        <SettingsSection title="بيانات التحفيظ" description="الاسم وبيانات التواصل الظاهرة للمستخدمين.">
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
        </>}

        {section === 'attendance' && <div className="space-y-3">
          <SettingsAccordion icon="🔐" title="الصلاحيات وطريقة التسجيل" description="وصول الشيوخ والخيارات التي تظهر أثناء أخذ الحضور." defaultOpen>
          <FeatureToggle
            enabled={restrictSheikhStudentAccess}
            onChange={(enabled) => {
              if (!enabled && !window.confirm('عند إيقاف هذا الخيار سيتمكن جميع الشيوخ من عرض وتعديل بيانات جميع طلاب التحفيظ. هل تريد المتابعة؟')) return
              setRestrictSheikhStudentAccess(enabled)
            }}
            title="تقييد الشيوخ بطلابهم"
            description="عند التفعيل لا يستطيع الشيخ عرض أو تعديل إلا الطلاب المسندين إليه. يظل المدير قادراً على إدارة جميع الطلاب."
          />
          {!restrictSheikhStudentAccess && (
            <p role="alert" className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-200">
              التقييد متوقف: يستطيع كل شيخ الوصول إلى جميع طلاب التحفيظ.
            </p>
          )}
          <div className="mt-3">
            <FeatureToggle
              enabled={sheikhSelectionEnabled}
              onChange={setSheikhSelectionEnabled}
              title="اختيار الشيخ أثناء تسجيل الحضور"
              description="عند إيقافه يُخفى عمود الشيخ ويُستخدم الشيخ المرتبط بالطالب تلقائياً."
            />
          </div>
          <div className="mt-3">
            <FeatureToggle
              enabled={multipleSessionsEnabled}
              onChange={setMultipleSessionsEnabled}
              title="السماح بأكثر من حلقة في اليوم"
              description="عند التفعيل يمكنك إنشاء حلقات متعددة في التاريخ نفسه واختيار طلاب كل حلقة بالتصنيفات والاستثناءات."
            />
          </div>
          <div className="mt-3">
            <FeatureToggle
              enabled={sheikhCustomFieldsEnabled}
              onChange={setSheikhCustomFieldsEnabled}
              title="السماح للشيوخ بإنشاء حقول طلاب مخصصة"
              description="يمكن للشيخ إنشاء حقول إضافية وتعبئتها لطلابه فقط. يظل المدير قادراً على إدارة جميع الحقول."
            />
          </div>
          </SettingsAccordion>

          <SettingsAccordion icon="🗓️" title="الحلقات وتصنيفات الطلاب" description="أسماء الحلقات المتعددة والمجموعات المستخدمة لاختيار الطلاب.">
          {multipleSessionsEnabled && <div className="mt-5 rounded-xl border border-water-200/70 bg-white/35 p-4 dark:bg-slate-800/35">
            <h3 className="text-sm font-bold text-deep-800">أسماء الحلقات</h3>
            <p className="mt-1 text-xs text-deep-500">تظهر هذه الأسماء في القائمة عند إنشاء حلقة جديدة، ويظهر تاريخ الحلقة بجانب الاسم تلقائياً.</p>
            <div className="mt-3 flex gap-2">
              <input value={newSessionNameOption} onChange={event => setNewSessionNameOption(event.target.value)} onKeyDown={event => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                const value = newSessionNameOption.trim()
                if (value && !sessionNameOptions.includes(value)) setSessionNameOptions(current => [...current, value])
                setNewSessionNameOption('')
              }} maxLength={100} placeholder="مثال: الصباحية" className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" />
              <button type="button" onClick={() => {
                const value = newSessionNameOption.trim()
                if (value && !sessionNameOptions.includes(value)) setSessionNameOptions(current => [...current, value])
                setNewSessionNameOption('')
              }} disabled={!newSessionNameOption.trim()} className="water-btn rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">إضافة</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sessionNameOptions.length === 0 && <span className="text-xs text-amber-700 dark:text-amber-300">أضف اسماً واحداً على الأقل لتتمكن من إنشاء حلقة.</span>}
              {sessionNameOptions.map(option => <span key={option} className="inline-flex items-center gap-2 rounded-full border border-water-200 bg-white/60 px-3 py-1.5 text-xs text-deep-700 dark:bg-slate-800/60">
                <span>{option}</span>
                <button type="button" onClick={() => setSessionNameOptions(current => current.filter(item => item !== option))} aria-label={`حذف ${option}`} className="font-bold text-red-500">×</button>
              </span>)}
            </div>
          </div>}
          <div className="mt-5 rounded-xl border border-water-200/70 bg-white/35 p-4 dark:bg-slate-800/35">
            <h3 className="text-sm font-bold text-deep-800">تصنيفات الطلاب</h3>
            <p className="mt-1 text-xs text-deep-500">مثل صباحي أو مسائي. يمكن إسناد الطالب لأكثر من تصنيف من صفحة تعديله.</p>
            <div className="mt-3 flex gap-2" data-immediate-action>
              <input value={newStudentCategory} onChange={event => setNewStudentCategory(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void createStudentCategory() } }} maxLength={50} placeholder="اسم التصنيف" className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" />
              <button type="button" onClick={() => void createStudentCategory()} disabled={categoryBusy || !newStudentCategory.trim()} className="water-btn rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">إضافة</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" data-immediate-action>
              {studentCategories.length === 0 && <span className="text-xs text-deep-500">لا توجد تصنيفات بعد.</span>}
              {studentCategories.map(category => <span key={category.id} className="inline-flex items-center gap-2 rounded-full border border-water-200 bg-white/60 px-3 py-1.5 text-xs text-deep-700 dark:bg-slate-800/60">
                <span>{category.name} ({category.student_count || 0})</span>
                <button type="button" disabled={categoryBusy} onClick={() => void renameStudentCategory(category)} aria-label={`تعديل ${category.name}`} className="font-bold text-blue-700 dark:text-blue-300">✎</button>
                <button type="button" disabled={categoryBusy} onClick={() => void deleteStudentCategory(category)} aria-label={`حذف ${category.name}`} className="font-bold text-red-500 dark:text-red-300">×</button>
              </span>)}
            </div>
          </div>
          </SettingsAccordion>

          <SettingsAccordion icon="🎨" title="حالات الحضور" description="الأسماء والترتيب والألوان، والحالات الأساسية للحضور والغياب." defaultOpen>
          <div>
            <h3 className="sr-only">خيارات حالة الحضور</h3>
            <div className="mt-2 grid gap-2">
              {attendanceStatuses.map((status, index) => (
                <div key={status} className="grid gap-3 rounded-2xl border border-water-200/80 bg-white/75 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-50 text-xs font-bold text-blue-700 dark:bg-cyan-950 dark:text-blue-300">{index + 1}</span>
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
                      {attendanceStatusNameError && <p className="mt-1 text-[11px] text-red-600 dark:text-red-300">{attendanceStatusNameError}</p>}
                    </div>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-deep-800">{status}</span>
                  )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <div className="flex items-center gap-1.5 rounded-xl border border-water-200/70 bg-white/70 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" aria-label={`لون ${status}`}>
                    <span className="ml-1 text-[10px] font-semibold text-deep-500">اللون</span>
                    {STATUS_COLOR_OPTIONS.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setAttendanceStatusColors(current => ({ ...current, [status]: option.key }))}
                        title={option.label}
                        aria-label={`اختيار اللون ${option.label} لحالة ${status}`}
                        aria-pressed={(attendanceStatusColors[status] || 'violet') === option.key}
                        className={`h-4 w-4 rounded-full transition ${option.className} ${(attendanceStatusColors[status] || 'violet') === option.key ? 'ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-slate-800' : 'opacity-55 hover:scale-110 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                  {editingAttendanceStatus === status ? (
                    <>
                      <button type="button" onClick={renameAttendanceStatus} className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white">حفظ</button>
                      <button type="button" onClick={() => { setEditingAttendanceStatus(null); setAttendanceStatusNameError('') }} className="rounded-lg px-2 py-1.5 text-xs text-deep-500">إلغاء</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => startEditingAttendanceStatus(status)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-cyan-50 dark:text-blue-300 dark:hover:bg-cyan-950/60">تعديل</button>
                  )}
                  <div className="inline-flex overflow-hidden rounded-lg border border-water-200 dark:border-slate-700">
                    <button type="button" disabled={index === 0} onClick={() => moveAttendanceStatus(index, -1)} aria-label={`تحريك ${status} لأعلى`} className="bg-white/70 px-2.5 py-1.5 text-xs hover:bg-water-50 disabled:opacity-30 dark:bg-slate-800 dark:hover:bg-slate-700">↑</button>
                    <button type="button" disabled={index === attendanceStatuses.length - 1} onClick={() => moveAttendanceStatus(index, 1)} aria-label={`تحريك ${status} لأسفل`} className="border-r border-water-200 bg-white/70 px-2.5 py-1.5 text-xs hover:bg-water-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">↓</button>
                  </div>
                  <button type="button" disabled={attendanceStatuses.length === 1} onClick={() => removeAttendanceStatus(status)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/40">حذف</button>
                  </div>
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
            <div className="mt-5">
              <label className="block text-sm font-bold text-deep-800" htmlFor="present-status">
                الحالة التي تعني الحضور
              </label>
              <p className="mt-1 text-xs leading-5 text-deep-500">
                تُستخدم هذه الحالة في متابعة القرآن، وحساب الحاضرين في الإحصائيات والتقارير. إنها الحالة التي تُفعل عندها متابعة الحفظ والمراجعة للطالب.
              </p>
              <select id="present-status" value={presentStatus} onChange={event => setPresentStatus(event.target.value)} className="surface-field mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-normal">
                {attendanceStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="mt-5">
              <label className="block text-sm font-bold text-deep-800" htmlFor="absent-status">
                الحالة التي تعني الغياب
              </label>
              <p className="mt-1 text-xs leading-5 text-deep-500">
                تُستخدم باعتبارها «غياب» في الإحصائيات والتقارير والتنبيهات، ويبدأ بها الطلاب تلقائياً عند إنشاء الحلقة قبل تطبيق الأعذار والاستثناءات.
              </p>
              <select id="absent-status" value={absentStatus} onChange={event => setAbsentStatus(event.target.value)} className="surface-field mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-normal">
                {attendanceStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
          </SettingsAccordion>

          <SettingsAccordion icon="🔔" title="تنبيهات تكرار الحالات" description="اختر الحالة التي يزيد معها العداد ومتى يظهر التنبيه.">
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
                        <label key={status} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${checked ? 'border-cyan-400 bg-cyan-50 text-blue-800 dark:bg-cyan-900/30 dark:text-blue-200' : 'border-water-200 bg-white/50 text-deep-600 dark:bg-slate-800/50'}`}>
                          <input type="checkbox" checked={checked} onChange={() => setExcusedResetStatuses(current => checked ? current.filter(item => item !== status) : [...current, status])} className="accent-cyan-600" />
                          {status}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
                <p className="text-[11px] leading-5 text-deep-500 md:col-span-2">حالة «{streakStatus}» تزيد العداد، والحالات المحددة تصفّره، وبقية الحالات لا تغيّره.</p>
              </div>}
          </SettingsAccordion>
        </div>}

        {section === 'progress' && <SettingsSection title="متابعة القرآن" description="تحكم في ظهور تسجيل الحفظ والمراجعة.">
          <FeatureToggle
            enabled={progressTrackingEnabled}
            onChange={setProgressTrackingEnabled}
            title="متابعة الحفظ والمراجعة"
            description="إيقافها يخفي الميزة دون حذف البيانات السابقة."
          />
          {progressTrackingEnabled && <div className="mt-4 grid gap-3 md:grid-cols-3">
            {PROGRESS_CATEGORY_OPTIONS.map(option => {
              const checked = progressCategories.includes(option.key)
              return <label key={option.key} className={`cursor-pointer rounded-xl border p-4 ${checked ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30' : 'border-water-200 bg-white/50 dark:bg-slate-800/50'}`}>
                <span className="flex items-center gap-2 text-sm font-bold text-deep-800"><input type="checkbox" checked={checked} disabled={option.key === 'new_memorization'} onChange={() => setProgressCategories(current => checked ? current.filter(item => item !== option.key) : [...current, option.key])} />{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-deep-500">{option.description}</span>
              </label>
            })}
          </div>}
          <p className="mt-3 text-xs leading-5 text-deep-500">الحفظ متاح افتراضياً. تعطيل قسم إضافي يخفيه من الإدخال الجديد دون حذف سجلاته السابقة.</p>
        </SettingsSection>}

        {section === 'excel' && <SettingsSection title="قوالب Excel" description="اختر الأعمدة وعناوينها مرة واحدة لجميع ملفات الحضور والتقارير.">
          <p className="text-xs leading-5 text-deep-500">
            الأعمدة المخصصة تظهر فارغة في كل صف لتعبئتها بعد التنزيل. ستستخدم المعاينة والتصدير هذه الإعدادات تلقائياً.
          </p>
          <ExcelTemplateSettings value={excelExportTemplates} onChange={setExcelExportTemplates} />
        </SettingsSection>}

        {section === 'invitations' && <SettingsSection title="دعوات الانضمام" description="روابط مؤقتة لإضافة المديرين والشيوخ.">
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
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/35">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-sm text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200" aria-hidden="true">✓</span>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">تم إنشاء الرابط — انسخه وأرسله للمستخدم</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input readOnly value={latestInvitationLink} dir="ltr" aria-label="رابط الدعوة" className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs" />
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(latestInvitationLink); setNotice('تم نسخ رابط الدعوة') }} className="water-btn shrink-0 rounded-xl px-5 py-2.5 text-xs font-bold text-white">نسخ الرابط</button>
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {invitations.length === 0 && <p className="text-xs text-deep-500">لا توجد دعوات بعد.</p>}
            {invitations.map(invitation => (
              <div key={invitation.id} className="grid gap-3 rounded-xl border border-water-200 bg-white/45 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-deep-800">{invitation.role === 'admin' ? 'مدير' : `شيخ${invitation.sheikh_name ? ` — ${invitation.sheikh_name}` : ''}`}</p>
                  <p className="mt-1 text-[11px] leading-5 text-deep-500">أنشأها {invitation.creator_username || '—'} <span aria-hidden="true">·</span> تنتهي {new Date(invitation.expires_at).toLocaleString('ar-EG')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${invitation.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-200' : invitation.status === 'used' ? 'bg-cyan-100 text-blue-700 dark:bg-cyan-900/45 dark:text-blue-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>
                    {invitation.status === 'active' ? 'نشطة' : invitation.status === 'used' ? 'مقبولة' : invitation.status === 'expired' ? 'منتهية' : 'ملغاة'}
                  </span>
                  {invitation.status !== 'used' && <button type="button" onClick={() => resendInvitation(invitation.id)} disabled={invitationBusy} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-cyan-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-cyan-950/50">إعادة إرسال</button>}
                  {invitation.status === 'active' && <button type="button" onClick={() => revokeInvitation(invitation.id)} disabled={invitationBusy} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40">إلغاء</button>}
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>}

        {section === 'integrations' && <SettingsSection title="التكاملات" description="خدمات خارجية اختيارية؛ تبقى إعداداتها محفوظة عند إيقافها.">
          <FeatureToggle enabled={whatsendEnabled} onChange={setWhatsendEnabled} title="تكامل WhatSend" description="إرسال الإنذارات وتحميل مجموعات واتساب. إيقافه يحتفظ بالإعدادات." />
          {whatsendEnabled && <div className="mt-4 grid gap-4">
            <input value={whatsendApiUrl} onChange={event => setWhatsendApiUrl(event.target.value)} dir="ltr" placeholder="Send API URL" className="surface-field rounded-xl px-4 py-2.5" />
            <input value={whatsendGroupsUrl} onChange={event => setWhatsendGroupsUrl(event.target.value)} dir="ltr" placeholder="Groups API URL (اختياري)" className="surface-field rounded-xl px-4 py-2.5" />
            <input type="password" value={whatsendApiKey} onChange={event => setWhatsendApiKey(event.target.value)} dir="ltr" placeholder={settings.whatsend_api_key_configured ? 'المفتاح محفوظ — اكتب بديلاً لتغييره' : 'API key'} className="surface-field rounded-xl px-4 py-2.5" />
          </div>}
        </SettingsSection>}

        {section !== 'invitations' && <div className="settings-save-bar sticky z-20 flex items-center justify-between gap-3">
          <span className={`text-xs font-semibold ${dirty ? 'text-amber-700 dark:text-amber-300' : 'text-deep-500'}`}>{dirty ? 'لديك تغييرات غير محفوظة' : 'جميع التغييرات محفوظة'}</span>
          <button type="submit" disabled={!dirty || saving || (section === 'general' && !name.trim()) || (section === 'attendance' && attendanceStatuses.length === 0)} className="water-btn rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>}
      </form>
    </div>
  )
}

function SettingsAccordion({ icon, title, description, defaultOpen = false, children }: {
  icon: string
  title: string
  description: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="group glass-card overflow-hidden rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 outline-none transition hover:bg-water-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 dark:hover:bg-slate-800/70 [&::-webkit-details-marker]:hidden sm:p-5">
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-water-100 text-lg dark:bg-slate-800">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-deep-900 sm:text-base">{title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-deep-500">{description}</span>
        </span>
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-water-200 text-deep-500 transition group-open:rotate-180 dark:border-slate-700">⌄</span>
      </summary>
      <div className="border-t border-water-200/60 p-4 dark:border-slate-700/70 sm:p-5">{children}</div>
    </details>
  )
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl overflow-hidden">
      <header className="border-b border-water-200/60 p-5">
        <h2 className="font-bold text-deep-900">{title}</h2>
        <p className="mt-1 text-xs text-deep-500">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
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
