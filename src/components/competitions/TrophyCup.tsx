import { TROPHY_META, type Trophy } from '@/lib/competitions'

/** A trophy cup tinted gold, silver or bronze. Decorative unless a label is requested. */
export default function TrophyCup({ trophy, className = 'h-10 w-10', labelled = false }: { trophy: Trophy; className?: string; labelled?: boolean }) {
  const { color, label } = TROPHY_META[trophy]
  return <svg viewBox="0 0 64 64" className={className} role={labelled ? 'img' : undefined} aria-label={labelled ? label : undefined} aria-hidden={labelled ? undefined : true}>
    <path d="M18 10h28v14c0 9-6 16-14 16s-14-7-14-16V10Z" fill={color} />
    <path d="M18 14H9v4c0 7 5 12 11 12M46 14h9v4c0 7-5 12-11 12" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <path d="M28 40h8v8h-8z" fill={color} />
    <path d="M20 48h24a3 3 0 0 1 3 3v5H17v-5a3 3 0 0 1 3-3Z" fill={color} />
    <path d="M24 14c0 8 2 14 6 18" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
    <path d="M17 56h30" stroke="#000" strokeOpacity=".15" strokeWidth="2" />
  </svg>
}
