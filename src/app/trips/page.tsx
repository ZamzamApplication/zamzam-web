'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import { tripMoney, type Trip } from '@/lib/trips'
import { CreateTripDialog } from '@/components/trips/TripForms'
import AsyncState from '@/components/AsyncState'

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [create, setCreate] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const router = useRouter()
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setTrips(await api.getTrips()) } catch (err: any) { setError(err.message || 'تعذر تحميل الرحلات') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const visible = trips.filter(trip => showCompleted ? trip.status === 'completed' : trip.status !== 'completed').sort((a, b) => showCompleted ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))
  return <div className="mx-auto max-w-6xl space-y-6 pb-6">
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-cyan-950/10 sm:p-9">
      <div className="pointer-events-none absolute -left-12 -top-24 h-80 w-80 rounded-full border-[40px] border-cyan-400/10" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-6"><div><p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />كلنا معاً، في كل محطة</p><h1 className="text-3xl font-extrabold sm:text-4xl">الرحلات</h1><p className="mt-3 max-w-lg text-sm leading-7 text-slate-300">من أول اسم في القائمة إلى آخر تحقق قبل العودة.<br className="hidden sm:block" /> جهّز المشاركين، تابع السداد، واطمئن أن الجميع معك.</p></div><button type="button" onClick={() => setCreate(true)} className="min-h-12 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-400/15 transition hover:bg-cyan-300">＋ تجهيز رحلة جديدة</button></div>
      <div className="relative mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-xs text-slate-300"><span>✓ طلاب وضيوف</span><span>✓ سداد وإعفاءات</span><span>✓ تحقق متكرر طوال اليوم</span></div>
    </section>
    <div className="flex items-center justify-between gap-3"><div className="flex rounded-xl border border-water-200 bg-white/50 p-1 dark:bg-slate-900/50">{[{ value: false, label: 'الرحلات الجارية' }, { value: true, label: 'الأرشيف' }].map(tab => <button type="button" key={tab.label} onClick={() => setShowCompleted(tab.value)} aria-pressed={showCompleted === tab.value} className={`min-h-10 rounded-lg px-4 text-sm font-bold transition ${showCompleted === tab.value ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-cyan-300' : 'text-deep-500'}`}>{tab.label}</button>)}</div><span className="text-xs text-deep-500">{visible.length} رحلة</span></div>
    {loading ? <div className="page-loading" aria-label="جاري تحميل الرحلات" /> : error ? <AsyncState message={error} onRetry={load} /> : visible.length === 0 ? <div className="glass-card rounded-3xl px-6 py-14 text-center"><span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-cyan-50 text-3xl dark:bg-cyan-950/60" aria-hidden="true">☀</span><h2 className="text-lg font-bold text-deep-800">{showCompleted ? 'ذكريات الرحلات ستبقى هنا' : 'كل رحلة جميلة تبدأ بالتجهيز'}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-deep-500">{showCompleted ? 'ستجد هنا الرحلات المنتهية وسجلات الحضور الخاصة بها.' : 'أنشئ أول رحلة، أضف الطلاب والضيوف، وجهّز يومك في مكان واحد.'}</p>{!showCompleted && <button onClick={() => setCreate(true)} className="water-btn mt-6 min-h-11 rounded-xl px-6 py-2 text-sm font-bold text-white">تجهيز أول رحلة</button>}</div> : <div className="grid gap-4 md:grid-cols-2">{visible.map(trip => <Link key={trip.id} href={`/trips/${trip.id}`} className="glass-card group rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-cyan-500"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">{trip.status === 'completed' ? 'رحلة منتهية' : 'جاهزة للتجهيز'}</span><span className="text-xs text-deep-500">{formatDateWithWeekday(trip.date)}</span></div><h2 className="mt-5 text-xl font-bold text-deep-900">{trip.name}</h2><p className="mt-2 text-sm text-deep-500">{trip.destination || 'الوجهة لم تُحدد'}{trip.departure_time && ` · التجمع ${trip.departure_time}`}</p><div className="mt-6 flex items-center justify-between gap-3 border-t border-water-200/60 pt-4"><span className="text-xs text-deep-500">{trip.participant_count || 0} مشارك · {trip.fee_minor === 0 ? 'بدون رسوم' : tripMoney(trip.fee_minor, trip.currency)}</span><span className="text-sm font-bold text-blue-700 transition group-hover:-translate-x-1 dark:text-cyan-300">فتح الرحلة ←</span></div></Link>)}</div>}
    {create && <CreateTripDialog onClose={() => setCreate(false)} onCreated={id => router.push(`/trips/${id}`)} />}
  </div>
}
