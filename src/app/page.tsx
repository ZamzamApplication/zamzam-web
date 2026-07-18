'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

const features = [
  { icon: '📋', title: 'إدارة الجلسات', desc: 'إنشاء وتنظيم جلسات التحفيظ بسهولة ومتابعة مواعيدها' },
  { icon: '✅', title: 'تسجيل الحضور', desc: 'تسجيل حضور وغياب الطلاب في كل جلسة بلمسة واحدة' },
  { icon: '📊', title: 'تقارير شاملة', desc: 'إحصائيات دقيقة عن نسب الحضور وأداء الحلقات' },
]

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.getMe().then(setUser).catch(() => localStorage.removeItem('token'))
    }
  }, [])

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/80" />

        <div className="relative z-10 text-center px-4 max-w-3xl">
          <div className="text-7xl mb-6 animate-float inline-block drop-shadow-lg">💧</div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
            زمزم لتحفيظ القرآن
          </h1>
          <p className="text-lg md:text-xl text-cyan-200/90 mb-8 max-w-xl mx-auto drop-shadow">
            منصة متابعة حضور حلقات تحفيظ القرآن الكريم — إدارة الجلسات، تسجيل الحضور، والتقارير
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-block bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white px-8 py-3 rounded-xl text-lg font-medium transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
              >
                الذهاب إلى لوحة التحكم
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white px-8 py-3 rounded-xl text-lg font-medium transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
              >
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 animate-float">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <button
          onClick={toggleMute}
          className="absolute bottom-8 right-8 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-3 rounded-full transition-all border border-white/20"
          title={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
        >
          {muted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
            </svg>
          )}
        </button>
      </section>

      {/* Features */}
      <section className="py-20 px-4" dir="rtl">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-deep-800 mb-12">مميزات المنصة</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card rounded-2xl p-6 text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-deep-800 mb-2">{f.title}</h3>
                <p className="text-deep-600/70 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-deep-500/50 text-sm border-t border-water-200/20">
        زمزم لتحفيظ القرآن © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
