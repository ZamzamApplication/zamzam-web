'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RegistrationQr from '@/components/RegistrationQr'
import type { PublicRegistration } from '@/lib/student-registration'
import styles from './poster.module.css'

const DESIGNS = [
  { id: 'zamzam', name: 'زمزم', hint: 'مائي · فيروزي', colors: ['#0891b2', '#14b8a6'] },
  { id: 'emerald', name: 'زمرّد', hint: 'كلاسيكي · أخضر وذهبي', colors: ['#065f46', '#d97706'] },
  { id: 'night', name: 'ليل', hint: 'داكن · كحلي وذهبي', colors: ['#0b1f2a', '#e2b65c'] },
  { id: 'minimal', name: 'بسيط', hint: 'هادئ · أبيض ورمادي', colors: ['#f1f5f9', '#0891b2'] },
] as const

type DesignId = (typeof DESIGNS)[number]['id']

export default function RegistrationPoster() {
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<PublicRegistration | null>(null),
    [error, setError] = useState(''),
    [url, setUrl] = useState(''),
    [design, setDesign] = useState<DesignId>('zamzam')
  useEffect(() => {
    setUrl(`${location.origin}/register/${token}`)
    const params = new URLSearchParams(location.search)
    const requested = params.get('design')
    const stored = localStorage.getItem('registration-poster-design')
    const initial = DESIGNS.find((item) => item.id === requested)?.id ||
      DESIGNS.find((item) => item.id === stored)?.id
    if (initial) setDesign(initial)
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
  function chooseDesign(next: DesignId) {
    setDesign(next)
    try {
      localStorage.setItem('registration-poster-design', next)
    } catch {
      // Storage can be unavailable in private browsing; the choice still applies.
    }
  }
  const description = form?.description || ''
  return (
    <main className={styles.page}>
      <section className={styles.toolbar} aria-label="خيارات الطباعة">
        <div className={styles.toolbarHead}>
          <h1>ملصق التسجيل</h1>
          <p>اختر التصميم الذي يناسب تحفيظك، ثم اطبعه أو احفظه بصيغة PDF.</p>
        </div>
        <div
          className={styles.designGrid}
          role="group"
          aria-label="تصميم الملصق"
        >
          {DESIGNS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.designOption}
              aria-pressed={design === item.id}
              onClick={() => chooseDesign(item.id)}
            >
              <span className={styles.designSwatch} aria-hidden="true">
                {item.colors.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </span>
              <span>
                <span className={styles.designName}>{item.name}</span>
                <span className={styles.designHint}>{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={!form}
            className={`water-btn ${styles.printButton}`}
            onClick={() => window.print()}
          >
            طباعة / حفظ PDF
          </button>
          <a
            className={`water-btn-outline ${styles.previewLink}`}
            href={`/register/${token}`}
            target="_blank"
            rel="noreferrer"
          >
            معاينة نموذج التسجيل
          </a>
        </div>
      </section>

      <div className={styles.previewWrap}>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {!form && !error && (
          <p role="status" className={styles.loading}>
            جارٍ تحميل الملصق…
          </p>
        )}
        {form && (
          <article
            className={`registration-poster ${styles.poster} ${styles[design]}`}
            data-design={design}
          >
            {(design === 'zamzam' || design === 'night') && (
              <>
                <span
                  className={`${styles.ornament} ${styles.ornamentA}`}
                  aria-hidden="true"
                />
                <span
                  className={`${styles.ornament} ${styles.ornamentB}`}
                  aria-hidden="true"
                />
              </>
            )}
            <header className={styles.posterHeader}>
              <span className={styles.brandMark} aria-hidden="true">
                💧
              </span>
              <span className={styles.brandName}>زمزم</span>
            </header>
            <div className={styles.content}>
              <p className={styles.kicker}>أهلاً بكم في رحاب القرآن الكريم</p>
              <h1 className={styles.tahfiz}>
                {form.tahfiz_name || 'إدارة التحفيظ'}
              </h1>
              <span className={styles.divider} aria-hidden="true" />
              <h2 className={styles.title}>{form.title}</h2>
              {description && (
                <p className={styles.description}>
                  {description.length > 360
                    ? `${description.slice(0, 360)}…`
                    : description}
                </p>
              )}
              {url && (
                <div className={styles.qrCard}>
                  <RegistrationQr url={url} className={styles.qr} />
                </div>
              )}
              <p className={styles.cta}>امسح الرمز وابدأ رحلة الحفظ</p>
              <p className={styles.steps}>
                افتح كاميرا هاتفك • املأ النموذج • انتظر موافقة الإدارة
              </p>
              <p dir="ltr" className={styles.url}>
                {url}
              </p>
            </div>
            <footer className={styles.posterFooter}>
              زمزم · إدارة التحفيظ
            </footer>
            {design === 'zamzam' && (
              <svg
                className={styles.waves}
                viewBox="0 0 600 120"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0 60c60-28 120-28 180 0s120 28 180 0 120-28 240 0v60H0Z"
                  fill="currentColor"
                />
                <path
                  d="M0 82c60-22 120-22 180 0s120 22 180 0 120-22 240 0v38H0Z"
                  fill="currentColor"
                  opacity=".55"
                />
              </svg>
            )}
          </article>
        )}
      </div>
    </main>
  )
}
