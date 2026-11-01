'use client'
import { useEffect, useState } from 'react'
import { appIntent } from '@/lib/app-links'

/** Explicit intent link works even before verified App Links are configured. */
export default function OpenInApp({ kind, token }: { kind: 'invite' | 'register'; token: string }) {
  const [android, setAndroid] = useState(false)
  useEffect(() => { setAndroid(/Android/i.test(navigator.userAgent)) }, [])
  const href = appIntent(kind, token)
  if (!android || !href) return null
  return <aside className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-center text-sm dark:border-cyan-800 dark:bg-cyan-950/40">
    <a href={href} className="water-btn block rounded-xl px-4 py-3 font-bold text-white">فتح في تطبيق زمزم</a>
    <p className="mt-2 text-xs text-deep-500">إذا لم يكن التطبيق مثبتاً، يمكنك إكمال الخطوات هنا على الموقع.</p>
  </aside>
}
