'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'
import styles from './landing.module.css'

function Icon({ name, className = '' }: { name: 'book' | 'arrow' | 'check' | 'people' | 'chart' | 'calendar' | 'moon'; className?: string }) {
  const paths = {
    book: <><path d="M12 6C9 4 5 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-1-9 1Z" /><path d="M12 6v14M6 8h3M15 8h3M6 11h3M15 11h3" /></>,
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m2 10v-3a6 6 0 0 0-2-4" /></>,
    chart: <><path d="M4 4v16h17M8 15v-4m5 4V7m5 8v-6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3" /></>,
    moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
  }
  return <svg className={className} aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const features = [
  { icon: 'people' as const, number: '٠١', title: 'كل حلقة، في مكانها', desc: 'نظّم الحلقات ومواعيدها، وأضف الطلاب والمشايخ. بداية مرتبة ليوم أكثر هدوءًا.', tag: 'إدارة الحلقات والطلاب' },
  { icon: 'calendar' as const, number: '٠٢', title: 'حضور يُسجَّل بسهولة', desc: 'سجّل الحضور والغياب من هاتفك، وتابع انتظام الطلاب دون الانشغال بالكشوف الورقية.', tag: 'متابعة يومية أبسط' },
  { icon: 'chart' as const, number: '٠٣', title: 'صورة أوضح للتقدّم', desc: 'من خطط الحفظ والمراجعة إلى تقارير الحضور؛ اعرف أين وصل طلابك وما يحتاج إلى اهتمام.', tag: 'خطط وتقارير' },
]
const students = ['أحمد محمد', 'عمر عبدالله', 'يوسف إبراهيم', 'عبدالرحمن علي']

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [dark, setDark] = useState(false)
  const [tab, setTab] = useState('attendance')
  const [present, setPresent] = useState([true, true, false, true])

  useEffect(() => {
    api.getMe().then(setUser).catch(() => setUser(null))
    const preferredDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDark(preferredDark)
    document.documentElement.classList.toggle('dark', preferredDark)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  const startHref = user ? '/dashboard' : '/signup'

  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skip}>انتقل إلى المحتوى</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="زمزم — الرئيسية"><span className={styles.brandMark}><Icon name="book" /></span><span>زمزم<small>رفيق رحلتكم مع القرآن</small></span></Link>
        <nav className={styles.nav} aria-label="التنقل الرئيسي"><a href="#features">لماذا زمزم؟</a><a href="#how-it-works">كيف تبدأ؟</a><Link href="/plan">خطة الحفظ</Link></nav>
        <div className={styles.headerActions}><button type="button" onClick={toggleTheme} className={styles.theme} aria-label={dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'} aria-pressed={dark}><Icon name="moon" /></button><Link className={styles.login} href={user ? '/dashboard' : '/login'}>{user ? 'لوحة التحكم' : 'تسجيل الدخول'}<Icon name="arrow" /></Link></div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> مِن أول آية… إلى أثر يبقى</p>
            <h1 id="hero-title">للقرآن في قلوبهم مكان.<br /><span>ولرحلتهم، زمزم.</span></h1>
            <p className={styles.intro}>كل ما تحتاجه لإدارة حلقات التحفيظ، في مساحة واحدة.<br className={styles.desktopBreak} /> تنظيم أسهل، متابعة أقرب، ووقت أكثر لما يستحق.</p>
            <div className={styles.heroActions}><Link href={startHref} className={styles.primary}>{user ? 'الذهاب إلى لوحة التحكم' : 'ابدأ رحلة تحفيظك'}<Icon name="arrow" /></Link><a href="#platform-preview" className={styles.secondary}>اكتشف المنصة<span aria-hidden="true">↙</span></a></div>
            <div className={styles.heroNotes}><span><Icon name="check" />مصمّمة بالعربية</span><span><Icon name="check" />من الهاتف أو الحاسوب</span></div>
            <div className={styles.heroCaption}><span className={styles.captionLine} />اهتمامك بالتعليم. واهتمامنا بالتفاصيل.</div>
          </div>

          <div className={styles.heroVisual} id="platform-preview">
            <div className={styles.orbit} aria-hidden="true" /><span className={styles.spark} aria-hidden="true">✧</span>
            <div className={styles.preview}>
              <div className={styles.previewHeader}><span className={styles.previewBrand}><Icon name="book" />زمزم <small>/ مساحة التحفيظ</small></span><span className={styles.demoLabel}>معاينة تفاعلية</span></div>
              <div className={styles.previewBody}>
                <div className={styles.previewGreeting}><div><p>السّلام عليكم ورحمة الله</p><h2>كل يوم، خطوة أقرب <span aria-hidden="true">✧</span></h2></div><span className={styles.miniIcon}><Icon name="calendar" /></span></div>
                <div className={styles.stats}><div><span>طلاب الحلقة</span><strong>٠٤<small>طلاب</small></strong></div><div><span>حضور اليوم</span><strong>{['٠','١','٢','٣','٤'][present.filter(Boolean).length]}<small>من ٤</small></strong></div><div><span>هدفنا المشترك</span><strong className={styles.statWord}>أهل القرآن</strong></div></div>
                <div className={styles.tabs} role="tablist" aria-label="معاينة مميزات المنصة">{[{ id: 'attendance', label: 'حضور الحلقة' }, { id: 'plan', label: 'خطة الحفظ' }, { id: 'reports', label: 'التقارير' }].map(item => <button type="button" key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls="demo-panel" tabIndex={tab === item.id ? 0 : -1} onKeyDown={event => {
                  const tabs = ['attendance', 'plan', 'reports']
                  const index = tabs.indexOf(tab)
                  const next = event.key === 'ArrowLeft' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowRight' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : null
                  if (next) {
                    event.preventDefault()
                    setTab(next)
                    document.getElementById(`tab-${next}`)?.focus()
                  }
                }} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
                <div id="demo-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.demoPanel}>
                  {tab === 'attendance' ? <><div className={styles.tableHeading}><strong>حلقة الإتقان</strong><span>اضغط لتغيير الحضور</span></div>{students.map((student, i) => <div className={styles.student} key={student}><span className={styles.avatar}>{student.charAt(0)}</span><span>{student}<small>المستوى {i < 2 ? 'الأول' : 'الثاني'}</small></span><button type="button" className={present[i] ? styles.present : styles.absent} aria-label={`حضور ${student}`} aria-pressed={present[i]} onClick={() => setPresent(current => current.map((value, index) => index === i ? !value : value))}>{present[i] ? <><Icon name="check" />حاضر</> : 'غائب'}</button></div>)}</> : tab === 'plan' ? <><div className={styles.tableHeading}><strong>خطوات ثابتة نحو الإتقان</strong><span>خطة توضيحية</span></div>{['الحفظ الجديد · سورة الملك', 'المراجعة القريبة · سورة الرحمن', 'المراجعة البعيدة · جزء عمّ'].map((item, i) => <div className={styles.planRow} key={item}><span>٠{i + 1}</span><div><strong>{item}</strong><small>{i === 0 ? 'الآيات ١ – ٥' : 'مراجعة وتثبيت الحفظ'}</small></div><Icon name="book" /></div>)}<Link href="/plan" className={styles.demoLink}>أنشئ خطتك الخاصة <Icon name="arrow" /></Link></> : <><div className={styles.tableHeading}><strong>حضور الحلقة اليوم</strong><span>بيانات المعاينة</span></div><div className={styles.report}><div className={styles.reportRing} style={{ background: `conic-gradient(var(--accent) ${present.filter(Boolean).length * 25}%, var(--border) 0)` }}><strong>{present.filter(Boolean).length * 25}٪<small>نسبة الحضور</small></strong></div><p>{present.filter(Boolean).length} من ٤ طلاب حاضرون<small>تتحدّث النتيجة عند تغيير الحضور في المعاينة.</small></p></div></>}
                </div>
                <div className={styles.previewFoot}><span><i />كل التفاصيل، في مكان واحد</span><span>بيانات توضيحية</span></div>
              </div>
            </div>
            <div className={styles.floatingNote}><span><Icon name="check" /></span><div><strong>خطوة صغيرة اليوم</strong><small>وأثر يمتدّ للغد</small></div><span aria-hidden="true">✧</span></div>
          </div>
        </section>

        <div className={styles.values}><p>مساحة تجمع كل ما تحتاجه</p><span><Icon name="people" />الحلقات والطلاب</span><span><Icon name="calendar" />الحضور والمتابعة</span><span><Icon name="book" />الحفظ والمراجعة</span><span><Icon name="chart" />التقارير والإحصائيات</span></div>

        <section className={styles.features} id="features" aria-labelledby="features-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>تفاصيل أقل. أثر أكبر.</p><h2 id="features-title">أقرب لطلابك.<br /><span>أخفّ على يومك.</span></h2></div><p>خلف كل حلقة ناجحة، تفاصيل كثيرة.<br />زمزم يجمعها لك، لتتفرّغ لرسالتك.</p></div><div className={styles.featureGrid}>{features.map(feature => <article className={styles.featureCard} key={feature.number}><div className={styles.featureTop}><span><Icon name={feature.icon} /></span><small>{feature.number}</small></div><h3>{feature.title}</h3><p>{feature.desc}</p><span className={styles.featureTag}>{feature.tag}<Icon name="arrow" /></span></article>)}</div></section>

        <section className={styles.stepsSection} id="how-it-works" aria-labelledby="steps-title"><div className={styles.stepsIntro}><p className={styles.eyebrow}>بداية بسيطة، بإذن الله</p><h2 id="steps-title">حلقَتك القادمة،<br />أكثر تنظيمًا.</h2><Link href={startHref} className={styles.textLink}>لنبدأ معًا<Icon name="arrow" /></Link></div><ol className={styles.steps}>{[{ title: 'أنشئ مساحة تحفيظك', desc: 'أدخل بيانات التحفيظ واضبط الإعدادات، ثم أرسل طلبك للمراجعة.' }, { title: 'اجمع أهل الحلقة', desc: 'بعد تفعيل التحفيظ، أضف الحلقات والطلاب وادعُ فريقك.' }, { title: 'تابع الرحلة، يومًا بيوم', desc: 'سجّل الحضور، نظّم خطط الحفظ، واطّلع على التقارير.' }].map((step, i) => <li key={step.title}><span>٠{i + 1}</span><div><h3>{step.title}</h3><p>{step.desc}</p></div></li>)}</ol></section>

        <section className={styles.cta}><div className={styles.ctaMotif} aria-hidden="true">۞</div><p>لكل جهدٍ في تعليم القرآن أثر.</p><h2>امنح رسالتك مساحة تليق بها.</h2><Link href={startHref} className={styles.primary}>{user ? 'افتح لوحة التحكم' : 'أنشئ حساب تحفيظك'}<Icon name="arrow" /></Link><span>زمزم · رفيق رحلتكم مع القرآن</span></section>
      </main>
      <footer className={styles.footer}><Link href="/" className={styles.brand}><span className={styles.brandMark}><Icon name="book" /></span>زمزم</Link><p>صُنع لخدمة أهل القرآن.</p><div><Link href="/plan">إنشاء خطة حفظ</Link><span>© {new Date().getFullYear()} زمزم</span></div></footer>
    </div>
  )
}
