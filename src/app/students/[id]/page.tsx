'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import AsyncState from '@/components/AsyncState'
import Badge, { type BadgeTone } from '@/components/Badge'
import EditStudentModal, { WEEKDAY_NAMES, type EditStudentTab } from '@/components/EditStudentModal'
import Icon from '@/components/Icon'
import StudentCustomFieldsEditor from '@/components/StudentCustomFieldsEditor'
import StudentCompetitionsCard from '@/components/competitions/StudentCompetitionsCard'
import StudentQuranPlanEditor from '@/components/StudentQuranPlanEditor'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import { telHref, whatsappHref } from '@/lib/phone'
import { studentStatusClass } from '@/lib/student-status'
import { formatSubscriptionMoney } from '@/lib/subscriptions'
import { toast } from '@/lib/ui-feedback'
import type { StudentCurrentSubscription, StudentCustomField, StudentProfile } from '@/lib/types'

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })
}

function ageFrom(birthday?: string | null) {
  if (!birthday) return null
  const born = new Date(`${birthday}T00:00:00`)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1
  return age >= 0 && age < 120 ? age : null
}

export default function StudentProfilePage() {
  const params = useParams()
  const studentId = Number(params.id)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState<StudentCurrentSubscription | null>(null)
  const [customFields, setCustomFields] = useState<StudentCustomField[]>([])
  const [canCreateCustomFields, setCanCreateCustomFields] = useState(false)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [editingCustomFields, setEditingCustomFields] = useState(false)
  const [customFieldsSaving, setCustomFieldsSaving] = useState(false)
  const [editTab, setEditTab] = useState<EditStudentTab | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const nextProfile = await api.getStudentProfile(studentId)
      setProfile(nextProfile)
      setCustomFieldValues(nextProfile.custom_field_values || {})
      if (nextProfile.can_manage && nextProfile.status === 'مقيد') {
        api.getStudentCurrentSubscription(studentId).then(setSubscription).catch(() => setSubscription(null))
      }
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحميل ملف الطالب')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    api.getStudentCustomFields().then(result => { setCustomFields(result.fields); setCanCreateCustomFields(result.can_create) }).catch(() => setCustomFields([]))
  }, [editingCustomFields])

  if (loading) return <div className="page-loading" aria-label="جاري تحميل ملف الطالب" />
  if (!profile) return <AsyncState message={error || 'الطالب غير موجود'} onRetry={() => void load()} />

  const { attendance } = profile
  const applicable = attendance.total - attendance.not_applicable
  const attendanceRate = applicable > 0 ? Math.round((attendance.present / applicable) * 100) : null
  const stats: { label: string; value: ReactNode; tone?: string }[] = [
    { label: 'نسبة الحضور', value: attendanceRate === null ? '—' : `${attendanceRate}٪`, tone: attendanceRate === null ? '' : attendanceRate >= 80 ? 'text-emerald-700 dark:text-emerald-300' : attendanceRate >= 60 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300' },
    { label: attendance.present_status || 'حاضر', value: attendance.present },
    { label: 'غياب', value: attendance.absent },
    { label: 'غياب بعذر', value: attendance.excused },
  ]
  const age = ageFrom(profile.birthday)
  const backLink = profile.can_manage ? { href: '/manage?section=sheikhs', label: 'الطلاب' } : { href: '/dashboard', label: 'الرئيسية' }
  const recent = profile.recent_attendance || []
  const statusTone = (status: string): BadgeTone => (
    status === attendance.present_status ? 'success'
      : status === 'غياب' ? 'danger'
        : status === 'غياب بعذر' ? 'warning'
          : 'neutral'
  )
  const filledCustomFields = customFields.filter(field => (customFieldValues[String(field.id)] || '') !== '')

  const saveCustomFields = async () => {
    setCustomFieldsSaving(true)
    try {
      await api.updateStudentCustomFieldValues(profile.id, customFieldValues)
      toast('تم حفظ الحقول المخصصة', { tone: 'success' })
      setEditingCustomFields(false)
    } catch (reason: any) {
      toast(reason.message || 'تعذر حفظ الحقول المخصصة', { tone: 'error' })
    } finally {
      setCustomFieldsSaving(false)
    }
  }

  const customFieldText = (field: StudentCustomField) => {
    const value = customFieldValues[String(field.id)] || ''
    if (field.field_type === 'checkbox') return value === 'true' ? 'نعم' : value === 'false' ? 'لا' : value
    return value
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="مسار الصفحة" className="flex items-center gap-1.5 text-sm">
        <Link href={backLink.href} className="font-semibold text-blue-700 hover:underline dark:text-blue-300">{backLink.label}</Link>
        <Icon name="chevron-next" className="h-4 w-4 text-deep-400" />
        <span className="truncate text-deep-500">{profile.name}</span>
      </nav>

      <section className="glass-card rounded-2xl p-5 md:p-7">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {profile.profile_pic ? (
            <img src={mediaUrl(profile.profile_pic)!} alt="" className="h-24 w-24 shrink-0 rounded-full border-2 border-water-300 object-cover" />
          ) : (
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-water-300 bg-water-100 text-3xl font-bold text-blue-700 dark:bg-slate-800">{profile.name.charAt(0)}</div>
          )}
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h1 className="text-2xl font-bold text-deep-900">{profile.name}</h1>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${studentStatusClass(profile.status)}`}>{profile.status}</span>
              {profile.sheikh && <span className="rounded-full bg-water-50 px-3 py-1 text-xs text-deep-600 dark:bg-slate-800">{profile.sheikh.name}</span>}
              {profile.student_id && <span className="rounded-full bg-water-50 px-3 py-1 text-xs text-deep-600 dark:bg-slate-800">رقم الطالب: {profile.student_id}</span>}
              {age !== null && <span className="rounded-full bg-water-50 px-3 py-1 text-xs text-deep-600 dark:bg-slate-800">{age} سنة</span>}
            </div>
          </div>
          {profile.can_manage && (
            <div className="flex w-full flex-wrap justify-center gap-2 sm:w-auto sm:justify-end">
              <button type="button" onClick={() => setEditTab('basic')} className="water-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"><Icon name="edit" className="h-4 w-4" /> تعديل البيانات</button>
              {profile.status === 'مقيد' && <Link href={`/finance?student_id=${profile.id}`} className="water-btn-outline inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"><Icon name="finance" className="h-4 w-4" /> القسم المالي</Link>}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-xl border border-water-200 bg-white/45 p-3 text-center dark:bg-slate-800/40">
              <strong className={`block text-xl text-deep-900 ${stat.tone || ''}`}>{stat.value}</strong>
              <span className="mt-1 block text-xs text-deep-500">{stat.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-deep-400 sm:text-right">من {attendance.total} سجل حضور{attendance.not_applicable ? ` (${attendance.not_applicable} لا ينطبق)` : ''}</p>

        {attendance.streak_alert_enabled && <div className={`mt-4 rounded-xl border p-4 ${attendance.streak > attendance.streak_limit ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' : 'border-water-200 bg-water-50/50 dark:bg-slate-800/40'}`}>
          <p className="text-sm font-bold text-deep-800">سلسلة «{attendance.streak_status}» الحالية: {attendance.streak}</p>
          <p className="mt-1 text-xs text-deep-500">حد التنبيه المضبوط: أكثر من {attendance.streak_limit}</p>
        </div>}

        {profile.can_manage && profile.status === 'مقيد' && subscription?.enabled && <div className="mt-4 flex flex-col gap-2 rounded-xl border border-water-200 bg-white/45 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/40">
          <div><p className="text-xs text-deep-500">اشتراك الدورة الحالية</p><p className="mt-1 font-bold text-deep-900">{(subscription.record?.fee_minor ?? subscription.effective_fee_minor) === 0 ? 'معفى' : subscription.record?.is_paid ? 'مدفوع' : 'غير مدفوع'}{(subscription.record?.fee_minor ?? subscription.effective_fee_minor) > 0 ? ` · ${formatSubscriptionMoney(subscription.record?.fee_minor ?? subscription.effective_fee_minor, subscription.currency || 'EGP')}` : ''}</p></div>
          <Link href={`/finance?student_id=${profile.id}`} className="text-sm font-bold text-blue-700 dark:text-blue-300">فتح سجل الاشتراك</Link>
        </div>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">بيانات التواصل والتسجيل</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-water-100 pb-2 dark:border-slate-700/60">
              <dt className="text-deep-500">هاتف الطالب</dt>
              <dd>{profile.phone ? <PhoneLinks phone={profile.phone} /> : <span className="text-deep-400">—</span>}</dd>
            </div>
            <Detail label="تاريخ الميلاد" value={profile.birthday} />
            <Detail label="تاريخ التسجيل" value={profile.registration_date} />
          </dl>
          <h3 className="mt-5 text-sm font-bold text-deep-800">أولياء الأمور</h3>
          {profile.parent_phones.length ? (
            <div className="mt-2 space-y-2">
              {profile.parent_phones.map(phone => (
                <div key={phone.id ?? phone.phone_number} className="flex items-center justify-between gap-3 rounded-xl border border-water-200 p-3 text-sm dark:border-slate-700">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-deep-800">{phone.name || phone.parent_type}</span>
                    {phone.name && <span className="block text-xs text-deep-500">{phone.parent_type}</span>}
                  </span>
                  <PhoneLinks phone={phone.phone_number} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-deep-500">
              لا توجد أرقام مسجلة.
              {profile.can_manage && <button type="button" onClick={() => setEditTab('parents')} className="ms-1 font-semibold text-blue-700 dark:text-blue-300">إضافة رقم</button>}
            </p>
          )}
        </section>

        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-deep-900">آخر الحلقات</h2>
            <Link href="/attendance" className="text-xs font-semibold text-blue-700 dark:text-blue-300">سجل الحضور</Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-xs text-deep-500">لا توجد سجلات حضور بعد.</p>
          ) : (
            <ul className="mt-3 divide-y divide-water-100 dark:divide-slate-700/60">
              {recent.map(item => (
                <li key={item.session_id}>
                  <Link href={`/sessions/${item.session_id}`} className="flex items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm hover:bg-water-50/60 dark:hover:bg-slate-800/50">
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-deep-800">{formatDate(item.date)}</span>
                      {item.session_name && <span className="block truncate text-xs text-deep-500">{item.session_name}</span>}
                    </span>
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <StudentCompetitionsCard studentId={profile.id} />

      {profile.can_manage && profile.progress.enabled && <StudentQuranPlanEditor studentId={profile.id} initiallyEnabled={profile.progress.student_enabled} configuredCategories={profile.progress.categories} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">المتابعة</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="سجلات القرآن" value={profile.progress.entries} />
            <MiniStat label="متوسط التقييم" value={profile.progress.average_quality} />
            <MiniStat label="أهداف نشطة" value={profile.progress.active_goals} />
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-deep-800">الأعذار</h3>
            {profile.can_manage && <button type="button" onClick={() => setEditTab('excuses')} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300"><Icon name="plus" className="h-3.5 w-3.5" /> فترة عذر</button>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.excused_weekdays.length
              ? profile.excused_weekdays.map(day => <span key={day.weekday} title={day.note || ''} className="rounded-xl bg-sky-50 px-3 py-1.5 text-xs text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">{WEEKDAY_NAMES[day.weekday]}</span>)
              : <span className="text-xs text-deep-500">لا توجد أيام عذر ثابتة.</span>}
          </div>
          {profile.excused_periods.filter(period => period.status === 'active' || period.status === 'upcoming').map(period => (
            <p key={period.id} className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
              {period.status === 'active' ? 'عذر نشط' : 'عذر قادم'}: {period.reason} (<span dir="ltr">{period.start_date}</span> — <span dir="ltr">{period.end_date}</span>)
            </p>
          ))}
        </section>

        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-deep-900">الإنذارات ({profile.warnings.length})</h2>
            {profile.can_manage && <button type="button" onClick={() => setEditTab('warnings')} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300"><Icon name="plus" className="h-3.5 w-3.5" /> إنذار</button>}
          </div>
          <div className="mt-3 space-y-2">
            {profile.warnings.length
              ? profile.warnings.slice(0, 8).map(warning => <div key={warning.id} className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20"><strong>إنذار {warning.warning_number}</strong><p className="mt-1 text-deep-600">{warning.reason}</p></div>)
              : <span className="text-xs text-deep-500">لا توجد إنذارات.</span>}
          </div>
        </section>
      </div>

      {(customFields.length > 0 || editingCustomFields || canCreateCustomFields) && (
        <section className="glass-card rounded-2xl p-5">
          {editingCustomFields ? (
            <>
              <StudentCustomFieldsEditor values={customFieldValues} onChange={setCustomFieldValues} />
              <div className="mt-3 flex items-center gap-2">
                <button type="button" disabled={customFieldsSaving} onClick={() => void saveCustomFields()} className="water-btn rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{customFieldsSaving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                <button type="button" disabled={customFieldsSaving} onClick={() => { setCustomFieldValues(profile.custom_field_values || {}); setEditingCustomFields(false) }} className="water-btn-outline rounded-xl px-4 py-2 text-sm">إلغاء</button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-deep-900">بيانات إضافية</h2>
                <button type="button" onClick={() => setEditingCustomFields(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300"><Icon name={customFields.length ? 'edit' : 'plus'} className="h-3.5 w-3.5" /> {customFields.length ? 'تعديل' : 'إضافة حقل'}</button>
              </div>
              {customFields.length === 0 ? (
                <p className="mt-3 text-xs text-deep-500">لا توجد حقول مخصصة بعد. يمكنك إضافة حقول مثل «المدرسة» أو «المستوى» لكل الطلاب.</p>
              ) : filledCustomFields.length === 0 ? (
                <p className="mt-3 text-xs text-deep-500">لم تُعبّأ أي بيانات إضافية لهذا الطالب.</p>
              ) : (
                <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  {filledCustomFields.map(field => (
                    <div key={field.id} className="flex justify-between gap-4 border-b border-water-100 pb-2 dark:border-slate-700/60">
                      <dt className="text-deep-500">{field.name}</dt>
                      <dd className="font-medium text-deep-800">{customFieldText(field)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </section>
      )}

      {editTab && (
        <EditStudentModal
          student={profile}
          initialTab={editTab}
          onClose={() => setEditTab(null)}
          onUpdated={() => { setEditTab(null); void load(true) }}
        />
      )}
    </div>
  )
}

function PhoneLinks({ phone }: { phone: string }) {
  const tel = telHref(phone)
  const whatsapp = whatsappHref(phone)
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <a href={tel || undefined} dir="ltr" className="font-medium text-blue-700 hover:underline dark:text-blue-300">{phone}</a>
      {tel && <a href={tel} aria-label={`اتصال بالرقم ${phone}`} className="grid h-8 w-8 place-items-center rounded-lg border border-water-200 text-deep-600 hover:bg-water-50 dark:border-slate-700 dark:hover:bg-slate-800"><PhoneIcon /></a>}
      {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" aria-label={`مراسلة ${phone} على واتساب`} className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"><WhatsAppIcon /></a>}
    </span>
  )
}

function PhoneIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
}

function WhatsAppIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.2Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2Z" /></svg>
}

function Detail({ label, value, dir }: { label: string; value?: string | null; dir?: 'ltr' | 'rtl' }) {
  return <div className="flex justify-between gap-4 border-b border-water-100 pb-2 dark:border-slate-700/60"><dt className="text-deep-500">{label}</dt><dd dir={dir} className="font-medium text-deep-800">{value || '—'}</dd></div>
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-water-50/60 p-3 dark:bg-slate-800/50"><strong className="block text-lg text-deep-900">{value}</strong><span className="text-xs text-deep-500">{label}</span></div>
}
