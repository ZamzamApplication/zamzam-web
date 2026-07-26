'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import AsyncState from '@/components/AsyncState'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import type { StudentProfile } from '@/lib/types'

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function StudentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const studentId = Number(params.id)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProfile(await api.getStudentProfile(studentId))
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحميل ملف الطالب')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="page-loading" aria-label="جاري تحميل ملف الطالب" />
  if (!profile) return <AsyncState message={error || 'الطالب غير موجود'} onRetry={load} />

  const stats = [
    ['إجمالي السجلات', profile.attendance.total],
    ['حاضر', profile.attendance.present],
    ['غياب', profile.attendance.absent],
    ['غياب بعذر', profile.attendance.excused],
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => router.back()} className="water-btn-outline rounded-xl px-4 py-2 text-sm">رجوع</button>
        {profile.can_manage && <button type="button" onClick={() => router.push('/manage')} className="water-btn rounded-xl px-4 py-2 text-sm font-semibold text-white">إدارة الطالب</button>}
      </div>

      <section className="glass-card rounded-2xl p-5 md:p-7">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {profile.profile_pic ? (
            <img src={mediaUrl(profile.profile_pic)!} alt="" className="h-24 w-24 rounded-full border-2 border-water-300 object-cover" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-water-300 bg-water-100 text-3xl font-bold text-cyan-700">{profile.name.charAt(0)}</div>
          )}
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h1 className="text-2xl font-bold text-deep-900">{profile.name}</h1>
            <p className="mt-1 text-sm text-deep-500">{profile.student_id ? `رقم الطالب: ${profile.student_id}` : `المعرف: ${profile.id}`}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">{profile.status}</span>
              {profile.sheikh && <span className="rounded-full bg-water-50 px-3 py-1 text-xs text-deep-600 dark:bg-slate-800">{profile.sheikh.name}</span>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-water-200 bg-white/45 p-3 text-center dark:bg-slate-800/40">
              <strong className="block text-xl text-deep-900">{value}</strong>
              <span className="mt-1 block text-xs text-deep-500">{label}</span>
            </div>
          ))}
        </div>

        <div className={`mt-4 rounded-xl border p-4 ${profile.attendance.excused_streak > profile.attendance.excused_streak_limit ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' : 'border-water-200 bg-water-50/50 dark:bg-slate-800/40'}`}>
          <p className="text-sm font-bold text-deep-800">سلسلة الغياب بعذر الحالية: {profile.attendance.excused_streak}</p>
          <p className="mt-1 text-xs text-deep-500">حد التنبيه المضبوط: أكثر من {profile.attendance.excused_streak_limit}</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">بيانات التواصل والتسجيل</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Detail label="هاتف الطالب" value={profile.phone} dir="ltr" />
            <Detail label="تاريخ الميلاد" value={profile.birthday} />
            <Detail label="تاريخ التسجيل" value={profile.registration_date} />
          </dl>
          <h3 className="mt-5 text-sm font-bold text-deep-800">أولياء الأمور</h3>
          {profile.parent_phones.length ? (
            <div className="mt-2 space-y-2">
              {profile.parent_phones.map(phone => (
                <div key={phone.id ?? phone.phone_number} className="rounded-xl border border-water-200 p-3 text-sm">
                  <div className="flex justify-between gap-3"><span>{phone.name || phone.parent_type}</span><span dir="ltr">{phone.phone_number}</span></div>
                  {phone.name && <span className="mt-1 block text-xs text-deep-500">{phone.parent_type}</span>}
                </div>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-deep-500">لا توجد أرقام مسجلة.</p>}
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-deep-900">المتابعة</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="سجلات القرآن" value={profile.progress.entries} />
            <MiniStat label="متوسط التقييم" value={profile.progress.average_quality} />
            <MiniStat label="أهداف نشطة" value={profile.progress.active_goals} />
          </div>
          <h3 className="mt-5 text-sm font-bold text-deep-800">أيام العذر الأسبوعية</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.excused_weekdays.length
              ? profile.excused_weekdays.map(day => <span key={day.weekday} title={day.note || ''} className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">{WEEKDAYS[day.weekday]}</span>)
              : <span className="text-xs text-deep-500">لا توجد أيام عذر ثابتة.</span>}
          </div>
          <h3 className="mt-5 text-sm font-bold text-deep-800">الإنذارات ({profile.warnings.length})</h3>
          <div className="mt-2 space-y-2">
            {profile.warnings.length
              ? profile.warnings.slice(0, 8).map(warning => <div key={warning.id} className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20"><strong>إنذار {warning.warning_number}</strong><p className="mt-1 text-deep-600">{warning.reason}</p></div>)
              : <span className="text-xs text-deep-500">لا توجد إنذارات.</span>}
          </div>
        </section>
      </div>
    </div>
  )
}

function Detail({ label, value, dir }: { label: string; value?: string | null; dir?: 'ltr' | 'rtl' }) {
  return <div className="flex justify-between gap-4 border-b border-water-100 pb-2"><dt className="text-deep-500">{label}</dt><dd dir={dir} className="font-medium text-deep-800">{value || '—'}</dd></div>
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-water-50/60 p-3 dark:bg-slate-800/50"><strong className="block text-lg text-deep-900">{value}</strong><span className="text-[10px] text-deep-500">{label}</span></div>
}
