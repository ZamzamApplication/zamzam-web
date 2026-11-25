'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import AsyncState from '@/components/AsyncState'
import TrophyCup from '@/components/competitions/TrophyCup'
import { CompetitionFormDialog } from '@/components/competitions/CompetitionForms'
import { STATUS_LABELS, arabicNumber, shortDate, type Competition } from '@/lib/competitions'

const STATUS_STYLES: Record<Competition['status'], string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  ended: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
}

export default function CompetitionsPage() {
  const [items, setItems] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [archive, setArchive] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setItems(await api.getCompetitions()) } catch (err: any) { setError(err.message || 'تعذر تحميل المسابقات') } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    try { const role = JSON.parse(localStorage.getItem('user') || '{}').role; setIsAdmin(role === 'admin' || role === 'super_admin') } catch { setIsAdmin(false) }
    void load()
  }, [load])
  const visible = items.filter(item => archive ? item.status === 'ended' : item.status !== 'ended')
  return <div className="mx-auto max-w-6xl space-y-6 pb-6">
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-amber-950/10 sm:p-9">
      <div className="pointer-events-none absolute -left-10 -top-16 opacity-15" aria-hidden="true"><TrophyCup trophy="gold" className="h-64 w-64" /></div>
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />﴿وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ﴾</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">المسابقات</h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-slate-300">تحديات يومية بسيطة — كصلاة الفجر — مع لوحة متصدرين يشاركها الأهالي برابط واحد.</p>
        </div>
        {isAdmin && <button type="button" onClick={() => setCreating(true)} className="min-h-12 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-400/15 transition hover:bg-amber-300">＋ مسابقة جديدة</button>}
      </div>
    </section>
    <div className="flex items-center justify-between gap-3">
      <div className="flex rounded-xl border border-water-200 bg-white/50 p-1 dark:bg-slate-900/50">{[{ value: false, label: 'الحالية' }, { value: true, label: 'المنتهية' }].map(tab => <button type="button" key={tab.label} onClick={() => setArchive(tab.value)} aria-pressed={archive === tab.value} className={`min-h-10 rounded-lg px-4 text-sm font-bold transition ${archive === tab.value ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-cyan-300' : 'text-deep-500'}`}>{tab.label}</button>)}</div>
      <span className="text-xs text-deep-500">{visible.length} مسابقة</span>
    </div>
    {loading ? <div className="page-loading" aria-label="جاري تحميل المسابقات" />
      : error ? <AsyncState message={error} onRetry={load} />
      : visible.length === 0 ? <div className="glass-card rounded-3xl px-6 py-14 text-center">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 dark:bg-amber-950/40"><TrophyCup trophy="gold" className="h-10 w-10" /></span>
        <h2 className="text-lg font-bold text-deep-800">{archive ? 'لا توجد مسابقات منتهية بعد' : 'لا توجد مسابقات حالية'}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-deep-500">{archive ? 'ستُحفظ هنا نتائج المسابقات بعد انتهائها.' : isAdmin ? 'ابدأ بتحدٍّ واحد واضح، مثل صلاة الفجر في المسجد لمدة ٣٠ يوماً.' : 'ستظهر هنا المسابقات التي يطلقها المدير لتسجّل لطلابك.'}</p>
        {!archive && isAdmin && <button onClick={() => setCreating(true)} className="water-btn mt-6 min-h-11 rounded-xl px-6 py-2 text-sm font-bold text-white">إنشاء أول مسابقة</button>}
      </div>
      : <div className="grid gap-4 md:grid-cols-2">{visible.map(item => <Link key={item.id} href={`/competitions/${item.id}`} className="glass-card group rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-amber-500">
        <div className="flex items-start justify-between gap-3"><span className={`rounded-lg px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[item.status]}`}>{STATUS_LABELS[item.status]}</span>{item.public_enabled && <span className="text-xs text-deep-500">🔗 رابط عام مفعّل</span>}</div>
        <h2 className="mt-5 text-xl font-bold text-deep-900">{item.title}</h2>
        <p className="mt-2 text-sm text-deep-500">{shortDate(item.start_date)} ← {shortDate(item.end_date)}</p>
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-water-200/60 pt-4"><span className="text-xs text-deep-500">{arabicNumber(item.participant_count || 0)} متسابق</span><span className="text-sm font-bold text-blue-700 transition group-hover:-translate-x-1 dark:text-cyan-300">فتح المسابقة ←</span></div>
      </Link>)}</div>}
    {creating && <CompetitionFormDialog onClose={() => setCreating(false)} onSaved={competition => router.push(`/competitions/${competition.id}`)} />}
  </div>
}
