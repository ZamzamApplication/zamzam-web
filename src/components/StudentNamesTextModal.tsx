'use client'

import { useEffect, useRef, useState } from 'react'

export default function StudentNamesTextModal({ names, onClose }: { names: string[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const text = names.join('\n')

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const copyNames = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setError('')
    } catch {
      textRef.current?.focus()
      textRef.current?.select()
      setError('تعذر النسخ التلقائي. يمكنك نسخ النص المحدد يدوياً.')
    }
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="student-names-title" dir="rtl" className="glass-card m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-5 text-deep-800 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm">
      <h2 id="student-names-title" className="text-lg font-bold">أسماء الطلاب كنص</h2>
      <p className="mt-2 text-sm text-deep-500">جميع الطلاب المعروضين بعد التصفية والبحث ({names.length})، كل اسم في سطر.</p>
      <textarea ref={textRef} autoFocus readOnly aria-label="أسماء الطلاب" value={text} onFocus={event => event.target.select()} className="surface-field mt-4 h-72 w-full resize-y rounded-xl px-3 py-3 text-sm leading-7" />
      <p role="status" className="mt-2 text-sm text-deep-500">{error || (copied ? 'تم نسخ أسماء الطلاب ✓' : '')}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="water-btn-outline rounded-lg px-4 py-2 text-sm font-semibold">إغلاق</button>
        <button type="button" onClick={copyNames} disabled={names.length === 0} className="water-btn rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{copied ? 'تم النسخ ✓' : 'نسخ الأسماء'}</button>
      </div>
    </dialog>
  )
}
