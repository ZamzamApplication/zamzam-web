'use client'

import { useState } from 'react'
import { mediaUrl } from '@/lib/format'

/** Round student photo, falling back to the name's first letter when there is none or it fails to load. */
export default function StudentAvatar({ photo, name, className = 'h-10 w-10' }: { photo?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = !failed ? mediaUrl(photo) : null
  const base = `shrink-0 rounded-full bg-water-100 object-cover dark:bg-slate-800 ${className}`
  return src
    ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={base} />
    : <span aria-hidden="true" className={`grid place-items-center font-extrabold text-blue-700 dark:text-cyan-300 ${base}`}>{name.trim().charAt(0)}</span>
}
