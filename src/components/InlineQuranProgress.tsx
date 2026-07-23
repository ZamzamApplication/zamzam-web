'use client'

import type { ProgressCategory, QuranProgressEntry, QuranProgressInput } from '@/lib/types'
import { QUALITY_OPTIONS, SURAHS, surahInfo } from '@/lib/quran'

export type ProgressDraftMap = Record<string, QuranProgressInput>

export const INLINE_PROGRESS_CATEGORIES: { key: ProgressCategory; label: string; shortLabel: string }[] = [
  { key: 'new_memorization', label: 'الحفظ', shortLabel: 'حفظ' },
  { key: 'recent_revision', label: 'المراجعة القريبة', shortLabel: 'قريبة' },
  { key: 'old_revision', label: 'المراجعة البعيدة', shortLabel: 'بعيدة' },
]

export function progressDraftKey(studentId: number, category: ProgressCategory) {
  return `${studentId}:${category}`
}

export function isSurahAyahRangeComplete(draft?: QuranProgressInput) {
  if (!draft) return false
  const fromSurah = draft.from_surah || 0
  const fromAyah = draft.from_ayah || 0
  const toSurah = draft.to_surah || 0
  const toAyah = draft.to_ayah || 0
  return fromSurah > 0
    && fromAyah > 0
    && toSurah > 0
    && toAyah > 0
    && (toSurah > fromSurah || (toSurah === fromSurah && toAyah >= fromAyah))
    && draft.quality_score >= 1
    && draft.quality_score <= 5
}

export function progressEntryToInput(entry: QuranProgressEntry): QuranProgressInput {
  return {
    student_id: entry.student_id,
    sheikh_id: entry.sheikh_id,
    category: entry.category,
    range_type: 'surah_ayah',
    from_surah: entry.from_surah || 1,
    from_ayah: entry.from_ayah || 1,
    to_surah: entry.to_surah || entry.from_surah || 1,
    to_ayah: entry.to_ayah || entry.from_ayah || 1,
    quality_score: entry.quality_score,
    mistakes: entry.mistakes,
    notes: entry.notes,
    next_assignment: entry.next_assignment,
  }
}

function makeDraft(studentId: number, sheikhId: number | null, category: ProgressCategory): QuranProgressInput {
  return {
    student_id: studentId,
    sheikh_id: sheikhId,
    category,
    range_type: 'surah_ayah',
    from_surah: 0,
    from_ayah: 0,
    to_surah: 0,
    to_ayah: 0,
    quality_score: 0,
    mistakes: 0,
    notes: null,
    next_assignment: null,
  }
}

function continueDraft(previous: QuranProgressInput, studentId: number, sheikhId: number | null, category: ProgressCategory): QuranProgressInput {
  const draft = makeDraft(studentId, sheikhId, category)
  if (category !== 'new_memorization') {
    return {
      ...draft,
      from_surah: previous.from_surah || 1,
      from_ayah: previous.from_ayah || 1,
      to_surah: previous.to_surah || previous.from_surah || 1,
      to_ayah: previous.to_ayah || previous.from_ayah || 1,
    }
  }

  const previousSurah = previous.to_surah || previous.from_surah || 1
  const previousEnd = previous.to_ayah || previous.from_ayah || 1
  const hasNextAyah = previousEnd < surahInfo(previousSurah).ayahs
  const nextSurah = hasNextAyah || previousSurah === 114 ? previousSurah : previousSurah + 1
  const nextAyah = hasNextAyah ? previousEnd + 1 : previousSurah === 114 ? previousEnd : 1
  return {
    ...draft,
    from_surah: nextSurah,
    to_surah: nextSurah,
    from_ayah: nextAyah,
    to_ayah: nextAyah,
  }
}

export function createRequiredProgressDraft(studentId: number, sheikhId: number | null, category: ProgressCategory, previous?: QuranProgressInput): QuranProgressInput {
  return previous && (previous.from_surah || 0) > 0 ? continueDraft(previous, studentId, sheikhId, category) : makeDraft(studentId, sheikhId, category)
}

function AyahSelect({ value, surah, onChange, label, disabled }: { value: number; surah: number; onChange: (value: number) => void; label: string; disabled: boolean }) {
  const count = surah > 0 ? surahInfo(surah).ayahs : 0
  return (
    <label className="text-[11px] text-deep-500">
      {label}
      <select value={count > 0 ? Math.min(Math.max(value, 1), count) : 0} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled || count === 0} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm disabled:opacity-60">
        {count === 0 && <option value={0}>اختر السورة أولاً</option>}
        {Array.from({ length: count }, (_, index) => index + 1).map((ayah) => <option key={ayah} value={ayah}>{ayah}</option>)}
      </select>
    </label>
  )
}

export default function InlineQuranProgress({
  student,
  drafts,
  previousDrafts,
  savedKeys,
  dirtyKeys,
  disabled,
  onChange,
  onSaveNext,
  saving,
}: {
  student: { id: number; name: string; sheikh_id: number | null }
  drafts: ProgressDraftMap
  previousDrafts: ProgressDraftMap
  savedKeys: Set<string>
  dirtyKeys: Set<string>
  disabled: boolean
  onChange: (draft: QuranProgressInput) => void
  onSaveNext: () => void
  saving: boolean
}) {
  const requiredDrafts = INLINE_PROGRESS_CATEGORIES.map(({ key }) => drafts[progressDraftKey(student.id, key)] || createRequiredProgressDraft(student.id, student.sheikh_id, key, previousDrafts[progressDraftKey(student.id, key)]))
  const allComplete = requiredDrafts.every(isSurahAyahRangeComplete)

  const updateAll = (patch: Partial<QuranProgressInput>) => {
    requiredDrafts.forEach((draft) => onChange({ ...draft, ...patch }))
  }

  return (
    <div className="mt-3 rounded-xl border border-cyan-200/80 bg-cyan-50/45 p-3 dark:border-cyan-900 dark:bg-cyan-950/20 md:col-span-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-deep-800">متابعة القرآن</p>
          <p className="text-[11px] text-deep-500">اختر السورة والآيات والتقييم لكل قسم.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${allComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{allComplete ? '✓ مكتمل' : 'كل الأقسام مطلوبة'}</span>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {INLINE_PROGRESS_CATEGORIES.map(({ key, label }) => {
          const draftKey = progressDraftKey(student.id, key)
          const draft = drafts[draftKey] || createRequiredProgressDraft(student.id, student.sheikh_id, key, previousDrafts[draftKey])
          const isSaved = savedKeys.has(draftKey)
          const isDirty = dirtyKeys.has(draftKey)
          const fromSurah = draft.from_surah || 0
          const toSurah = draft.to_surah || 0
          const toSurahMaxAyah = toSurah > 0 ? surahInfo(toSurah).ayahs : 0
          return (
            <div key={key} className="rounded-xl border border-cyan-300 bg-white/90 p-2.5 dark:border-cyan-700 dark:bg-slate-800/80">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-deep-700">{label}</span>
                <span className={`rounded-lg px-2 py-1 text-[10px] ${isDirty ? 'bg-amber-50 text-amber-700' : isSaved ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{isDirty ? 'غير محفوظ' : isSaved ? '✓ محفوظ' : 'مطلوب'}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-deep-500">من سورة
                    <select value={fromSurah} onChange={(event) => { const nextSurah = Number(event.target.value); const nextToSurah = Math.max(nextSurah, toSurah || nextSurah); onChange({ ...draft, from_surah: nextSurah, to_surah: nextToSurah, from_ayah: 1, to_ayah: 1 }) }} disabled={disabled} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm">
                      <option value={0}>اختر السورة</option>
                      {SURAHS.map((item) => <option key={item.number} value={item.number}>{item.number}. {item.name} — {item.ayahs} آية</option>)}
                    </select>
                  </label>
                  <AyahSelect label="من آية" value={draft.from_ayah || 1} surah={fromSurah} disabled={disabled} onChange={(value) => onChange({ ...draft, from_ayah: value, to_ayah: toSurah === fromSurah ? Math.max(value, Math.min(draft.to_ayah || value, toSurahMaxAyah)) : draft.to_ayah })} />
                  <label className="text-[11px] text-deep-500">إلى سورة
                    <select value={toSurah} onChange={(event) => { const nextSurah = Number(event.target.value); onChange({ ...draft, to_surah: nextSurah, to_ayah: nextSurah === fromSurah ? Math.max(draft.from_ayah || 1, 1) : 1 }) }} disabled={disabled || fromSurah === 0} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm disabled:opacity-60">
                      {fromSurah === 0 && <option value={0}>اختر سورة البداية</option>}
                      {SURAHS.filter((item) => item.number >= fromSurah).map((item) => <option key={item.number} value={item.number}>{item.number}. {item.name} — {item.ayahs} آية</option>)}
                    </select>
                  </label>
                  <AyahSelect label="إلى آية" value={draft.to_ayah || 1} surah={toSurah} disabled={disabled} onChange={(value) => onChange({ ...draft, to_ayah: toSurah === fromSurah ? Math.max(draft.from_ayah || 1, value) : value })} />
                  <button type="button" onClick={() => onChange({ ...draft, from_ayah: 1, to_ayah: toSurahMaxAyah })} disabled={disabled || fromSurah === 0 || toSurah === 0} className="col-span-2 rounded-lg border border-water-200 bg-water-50 px-2 py-1.5 text-[10px] font-semibold text-cyan-700 disabled:opacity-50">السور المحددة كاملة</button>
                  <div className="col-span-2">
                    <p className="mb-1 text-[11px] font-semibold text-deep-600">التقييم</p>
                    <div className="flex flex-wrap gap-1">
                      {QUALITY_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => onChange({ ...draft, quality_score: option.value })} disabled={disabled} className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${draft.quality_score === option.value ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-water-200 bg-white text-deep-600 dark:bg-slate-900'}`}>{option.label}</button>)}
                    </div>
                  </div>
                </div>
            </div>
          )
        })}
      </div>

      {requiredDrafts.length > 0 && (
        <div className="mt-3 rounded-xl border border-water-200 bg-white/75 p-3 dark:bg-slate-800/60">
          <details>
            <summary className="cursor-pointer text-[11px] font-semibold text-cyan-700">ملاحظات (اختياري)</summary>
            <div className="mt-2">
              <input value={requiredDrafts[0]?.notes || ''} onChange={(event) => updateAll({ notes: event.target.value || null })} disabled={disabled} placeholder="ملاحظات المتابعة" className="surface-field rounded-lg px-3 py-2 text-xs" />
            </div>
          </details>
          <button type="button" onClick={onSaveNext} disabled={disabled || saving || dirtyKeys.size === 0 || !allComplete} className="water-btn mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'جاري الحفظ...' : allComplete ? 'حفظ والطالب التالي' : 'أكمل الأقسام المطلوبة'}</button>
        </div>
      )}
    </div>
  )
}
