'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TrophyCup from '@/components/competitions/TrophyCup'
import StudentAvatar from '@/components/competitions/StudentAvatar'
import { Podium } from '@/components/competitions/CompetitionWorkspace'
import { arabicNumber, shortDate, type PublicLeaderboard } from '@/lib/competitions'

const REFRESH_MS = 60_000

/** Public, unauthenticated leaderboard. Shows only names and totals returned by the API. */
export default function LeaderboardPage() {
  const { token } = useParams<{ token: string }>()
  const [board, setBoard] = useState<PublicLeaderboard | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/competitions/public/${encodeURIComponent(token)}`, { credentials: 'omit', cache: 'no-store' })
      if (!response.ok) throw new Error('لوحة المتصدرين غير متاحة. ربما انتهت صلاحية الرابط.')
      setBoard(await response.json())
      setError('')
    } catch (err: any) {
      // Keep showing the last good board if a background refresh fails.
      setBoard(current => { if (!current) setError(err.message); return current })
    }
  }, [token])
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [load])
  useEffect(() => { if (board) document.title = `${board.title} — لوحة المتصدرين` }, [board])

  const rest = board?.leaderboard.filter((_, index) => index >= 3) ?? []
  const anyOnPodium = board?.leaderboard.some(row => row.trophy)
  return <main className="relative min-h-screen overflow-hidden px-4 pb-10 pt-6 sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-600/10" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/10" />
    <div className="relative mx-auto max-w-3xl">
      <header className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-deep-800"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 text-xl text-white shadow-md">💧</span><span className="text-lg font-bold">زمزم</span></span>
        {board && <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-cyan-100 dark:bg-slate-900/70 dark:text-blue-200 dark:ring-cyan-900">{board.tahfiz_name}</span>}
      </header>

      {error ? <div role="alert" className="glass-card mt-10 rounded-3xl p-10 text-center"><TrophyCup trophy="silver" className="mx-auto h-14 w-14 opacity-50" /><h1 className="mt-4 text-xl font-bold text-deep-900">{error}</h1></div>
        : !board ? <p role="status" className="mt-16 flex items-center justify-center gap-3 text-sm text-deep-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-water-200 border-t-water-600" />جارٍ تحميل لوحة المتصدرين…</p>
        : <>
          <section className="mt-8 text-center">
            <p className="text-xs font-bold tracking-wide text-amber-600 dark:text-amber-300">{board.status === 'ended' ? '🏁 النتائج النهائية' : '● المسابقة جارية'}</p>
            <h1 className="mt-2 text-3xl font-extrabold text-deep-900 sm:text-4xl">{board.title}</h1>
            <p className="mt-2 text-sm text-deep-500">{shortDate(board.start_date)} ← {shortDate(board.end_date)} · {arabicNumber(board.participant_count)} متسابق</p>
            {board.description && <p className="mx-auto mt-4 max-w-xl whitespace-pre-wrap text-sm leading-7 text-deep-600">{board.description}</p>}
          </section>

          <section className="glass-card mt-8 rounded-[2rem] px-3 pb-0 pt-8 sm:px-8" aria-label="المراكز الأولى">
            {anyOnPodium ? <Podium rows={board.leaderboard} showPhotos={board.show_photos} /> : <p className="pb-8 text-center text-sm text-deep-500">لم تُسجل نقاط بعد — كن أول المتصدرين!</p>}
          </section>

          {rest.length > 0 && <ol className="mt-5 space-y-2" aria-label="بقية الترتيب">{rest.map((row, index) => <li key={`${row.name}-${index}`} className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-water-50 text-sm font-extrabold text-deep-700 dark:bg-slate-800">{arabicNumber(row.rank)}</span>
            {board.show_photos && <StudentAvatar photo={row.photo} name={row.name} className="h-11 w-11 text-base" />}
            <span className="min-w-0 flex-1"><span className="block truncate font-bold text-deep-900">{row.name}{row.completed && <span className="mr-1" title="أتم المسابقة">⭐</span>}</span><span className="text-xs text-deep-500">{arabicNumber(row.days)} يوم · أطول سلسلة {arabicNumber(row.best_streak)}</span></span>
            <span className="text-lg font-extrabold text-deep-900">{arabicNumber(row.points)}<span className="mr-1 text-xs font-semibold text-deep-500">نقطة</span></span>
          </li>)}</ol>}

          {board.leaderboard.some(row => row.completed) && <p className="mt-4 text-center text-xs text-deep-500">⭐ = أتم المسابقة بالوصول إلى {arabicNumber(board.completion_threshold ?? 0)} نقطة</p>}
          {board.hidden_count > 0 && <p className="mt-6 text-center text-sm text-deep-500">و{arabicNumber(board.hidden_count)} متسابقين آخرين يواصلون — بالتوفيق للجميع 🤍</p>}
          <p className="mt-8 text-center text-xs text-deep-400">يتحدث تلقائياً كل دقيقة · زمزم</p>
        </>}
    </div>
  </main>
}
