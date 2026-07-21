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
    from_surah: 1,
    from_ayah: 1,
    to_surah: 1,
    to_ayah: 1,
    quality_score: 3,
    mistakes: 0,
    notes: null,
    next_assignment: null,
  }
}

function continueDraft(previous: QuranProgressInput, studentId: number, sheikhId: number | null, category: ProgressCategory): QuranProgressInput {
  const surah = previous.to_surah || previous.from_surah || 1
  const previousEnd = previous.to_ayah || previous.from_ayah || 1
  const shouldAdvance = category === 'new_memorization' && previousEnd < surahInfo(surah).ayahs
  const fromAyah = shouldAdvance ? previousEnd + 1 : (previous.from_ayah || 1)
  const toAyah = shouldAdvance ? fromAyah : Math.max(fromAyah, previous.to_ayah || fromAyah)
  return {
    ...makeDraft(studentId, sheikhId, category),
    from_surah: surah,
    to_surah: surah,
    from_ayah: fromAyah,
    to_ayah: toAyah,
    quality_score: previous.quality_score || 3,
  }
}

function AyahSelect({ value, surah, onChange, label, disabled }: { value: number; surah: number; onChange: (value: number) => void; label: string; disabled: boolean }) {
  const count = surahInfo(surah).ayahs
  return (
    <label className="text-[11px] text-deep-500">
      {label}
      <select value={Math.min(Math.max(value, 1), count)} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm">
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
  onDiscard,
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
  onDiscard: (key: string) => void
  onSaveNext: () => void
  saving: boolean
}) {
  const enabledDrafts = INLINE_PROGRESS_CATEGORIES.map(({ key }) => drafts[progressDraftKey(student.id, key)]).filter(Boolean)

  const updateAll = (patch: Partial<QuranProgressInput>) => {
    enabledDrafts.forEach((draft) => onChange({ ...draft, ...patch }))
  }

  return (
    <div className="mt-3 rounded-xl border border-cyan-200/80 bg-cyan-50/45 p-3 dark:border-cyan-900 dark:bg-cyan-950/20 md:col-span-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-deep-800">متابعة القرآن</p>
          <p className="text-[11px] text-deep-500">فعّل المطلوب، ثم اختر السورة والآيات.</p>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:bg-slate-800">{enabledDrafts.length} أقسام مفعلة</span>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {INLINE_PROGRESS_CATEGORIES.map(({ key, label }) => {
          const draftKey = progressDraftKey(student.id, key)
          const draft = drafts[draftKey]
          const previousDraft = previousDrafts[draftKey]
          const isSaved = savedKeys.has(draftKey)
          const isDirty = dirtyKeys.has(draftKey)
          const surah = draft?.from_surah || 1
          const maxAyah = surahInfo(surah).ayahs
          return (
            <div key={key} className={`rounded-xl border p-2.5 ${draft ? 'border-cyan-300 bg-white/90 dark:border-cyan-700 dark:bg-slate-800/80' : 'border-dashed border-water-300 bg-white/45 dark:bg-slate-900/30'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-deep-700">{label}</span>
                {draft ? (
                  <button type="button" onClick={() => !isSaved && onDiscard(draftKey)} disabled={disabled || isSaved} title={isSaved ? 'السجل محفوظ ويمكن تعديله' : 'إلغاء هذا القسم'} className={`rounded-lg px-2 py-1 text-[10px] ${isDirty ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'} disabled:cursor-default`}>
                    {isDirty ? 'غير محفوظ' : '✓ محفوظ'}
                  </button>
                ) : (
                  <div className="flex gap-1">
                    {previousDraft && <button type="button" onClick={() => onChange(continueDraft(previousDraft, student.id, student.sheikh_id, key))} disabled={disabled} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 disabled:opacity-50">استكمال السابق</button>}
                    <button type="button" onClick={() => onChange(makeDraft(student.id, student.sheikh_id, key))} disabled={disabled} className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-cyan-700 disabled:opacity-50">+ جديد</button>
                  </div>
                )}
              </div>
              {draft && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="col-span-2 text-[11px] text-deep-500">السورة
                    <select value={surah} onChange={(event) => { const nextSurah = Number(event.target.value); onChange({ ...draft, from_surah: nextSurah, to_surah: nextSurah, from_ayah: 1, to_ayah: 1 }) }} disabled={disabled} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm">
                      {SURAHS.map((item) => <option key={item.number} value={item.number}>{item.number}. {item.name} — {item.ayahs} آية</option>)}
                    </select>
                  </label>
                  <AyahSelect label="من آية" value={draft.from_ayah || 1} surah={surah} disabled={disabled} onChange={(value) => onChange({ ...draft, from_ayah: value, to_ayah: Math.max(value, Math.min(draft.to_ayah || value, maxAyah)) })} />
                  <AyahSelect label="إلى آية" value={draft.to_ayah || 1} surah={surah} disabled={disabled} onChange={(value) => onChange({ ...draft, to_ayah: Math.max(draft.from_ayah || 1, value) })} />
                  <button type="button" onClick={() => onChange({ ...draft, from_ayah: 1, to_ayah: maxAyah })} disabled={disabled} className="col-span-2 rounded-lg border border-water-200 bg-water-50 px-2 py-1.5 text-[10px] font-semibold text-cyan-700">السورة كاملة</button>
                  <label className="col-span-2 text-[11px] font-semibold text-deep-600">التقييم
                    <select value={draft.quality_score} onChange={(event) => onChange({ ...draft, quality_score: Number(event.target.value) })} disabled={disabled} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm">
                      {QUALITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {enabledDrafts.length > 0 && (
        <div className="mt-3 rounded-xl border border-water-200 bg-white/75 p-3 dark:bg-slate-800/60">
          <details>
            <summary className="cursor-pointer text-[11px] font-semibold text-cyan-700">ملاحظات (اختياري)</summary>
            <div className="mt-2">
              <input value={enabledDrafts[0]?.notes || ''} onChange={(event) => updateAll({ notes: event.target.value || null })} disabled={disabled} placeholder="ملاحظات المتابعة" className="surface-field rounded-lg px-3 py-2 text-xs" />
            </div>
          </details>
          <button type="button" onClick={onSaveNext} disabled={disabled || saving || dirtyKeys.size === 0} className="water-btn mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'حفظ والطالب التالي'}</button>
        </div>
      )}
    </div>
  )
}
