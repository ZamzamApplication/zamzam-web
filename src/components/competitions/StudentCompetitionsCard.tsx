'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import TrophyCup from '@/components/competitions/TrophyCup'
import { arabicNumber, localToday, type StudentCompetitionCard } from '@/lib/competitions'

/** Quick per-student check-in for active competitions. Renders nothing when there are none. */
export default function StudentCompetitionsCard({ studentId }: { studentId: number }) {
  const [cards, setCards] = useState<StudentCompetitionCard[]>([])
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api.getStudentCompetitions(studentId, localToday()).then(setCards).catch(() => setCards([])), [studentId])
  useEffect(() => { void load() }, [load])
  if (!cards.length) return null
  const toggle = async (card: StudentCompetitionCard) => {
    setSaving(card.id); setError('')
    try { await api.recordCompetitionEntries(card.id, card.date, [card.participant_id], !card.done); await load() }
    catch (err: any) { setError(err.message || 'تعذر الحفظ') } finally { setSaving(null) }
  }
  return <section className="glass-card rounded-2xl p-5" aria-labelledby="student-competitions-title">
    <h2 id="student-competitions-title" className="font-bold text-deep-900">المسابقات الجارية</h2>
    <ul className="mt-3 space-y-2">{cards.map(card => <li key={card.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-water-200 bg-white/45 p-3 dark:bg-slate-800/40">
      {card.trophy ? <TrophyCup trophy={card.trophy} labelled className="h-8 w-8" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-water-50 text-xs font-bold text-deep-600 dark:bg-slate-800">{arabicNumber(card.rank)}</span>}
      <span className="min-w-0 flex-1"><Link href={`/competitions/${card.id}`} className="block truncate text-sm font-bold text-deep-900 hover:underline">{card.title}</Link><span className="text-xs text-deep-500">المركز {arabicNumber(card.rank)} · {arabicNumber(card.points)} نقطة{card.completed ? ' · ⭐' : ''}</span></span>
      {card.can_record && <button type="button" aria-pressed={card.done} disabled={saving === card.id} onClick={() => toggle(card)} className={`min-h-11 rounded-xl px-4 text-sm font-bold transition disabled:opacity-50 ${card.done ? 'bg-emerald-500 text-white' : 'water-btn-outline'}`}>{card.done ? '✓ أنجز اليوم' : 'تسجيل اليوم'}</button>}
    </li>)}</ul>
    {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </section>
}
