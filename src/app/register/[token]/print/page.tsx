'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RegistrationQr from '@/components/RegistrationQr'
import type { PublicRegistration } from '@/lib/student-registration'

export default function RegistrationPoster() {
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<PublicRegistration | null>(null),
    [error, setError] = useState(''),
    [url, setUrl] = useState('')
  useEffect(() => {
    setUrl(`${location.origin}/register/${token}`)
    fetch(`/api/student-registration/public/${encodeURIComponent(token)}`, {
      credentials: 'omit',
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('رابط التسجيل غير متاح')
        setForm(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [token])
  return (
    <main className="poster-page min-h-screen bg-slate-100 p-6 text-center text-slate-900">
      <style>{`@page { size: A4; margin: 15mm; } @media print { .poster-controls { display:none!important; } .poster-page { padding:0!important; background:white!important; } .registration-poster { box-shadow:none!important; min-height:250mm; break-inside:avoid; } }`}</style>
      <div className="poster-controls mx-auto mb-6 flex max-w-xl justify-center gap-3">
        <button
          disabled={!form}
          className="water-btn rounded-xl px-5 py-3"
          onClick={() => window.print()}
        >
          طباعة / حفظ PDF
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {form && (
        <article className="registration-poster mx-auto flex min-h-[850px] max-w-[720px] flex-col items-center justify-center rounded-3xl border-[10px] border-emerald-800 bg-white px-8 py-16 shadow-xl">
          <div className="mb-8 text-sm font-bold tracking-widest text-emerald-700">
            أهلاً بكم في رحاب القرآن الكريم
          </div>
          <h1 className="text-4xl font-extrabold text-emerald-950">
            {form.tahfiz_name}
          </h1>
          <div className="my-8 h-1 w-20 bg-amber-500" />
          <h2 className="text-2xl font-bold">{form.title}</h2>
          <p className="my-6 max-w-md whitespace-pre-wrap text-lg text-slate-600">
            {form.description.length > 400
              ? `${form.description.slice(0, 400)}…`
              : form.description}
          </p>
          {url && <RegistrationQr url={url} />}
          <p className="mt-6 text-2xl font-bold text-emerald-800">
            امسح الرمز وابدأ رحلة الحفظ
          </p>
          <p className="mt-3 text-sm text-slate-500">
            افتح كاميرا هاتفك • املأ النموذج • انتظر موافقة الإدارة
          </p>
          <p
            dir="ltr"
            className="mt-6 max-w-full break-all text-xs text-slate-500"
          >
            {url}
          </p>
          <p className="mt-10 text-xs text-slate-400">زمزم • إدارة التحفيظ</p>
        </article>
      )}
    </main>
  )
}
