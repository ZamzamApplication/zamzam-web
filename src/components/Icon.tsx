import type { ReactNode } from 'react'

export type IconName =
  | 'home' | 'sessions' | 'attendance' | 'reports' | 'finance' | 'manage' | 'settings' | 'trips' | 'competitions'
  | 'more' | 'logout' | 'audit' | 'link' | 'list' | 'table' | 'chevron-down' | 'chevron-next' | 'chevron-prev'
  | 'check' | 'alert' | 'info' | 'close' | 'edit' | 'drop' | 'plus' | 'search' | 'dots' | 'users' | 'inbox'
  | 'book' | 'lock' | 'bell' | 'palette'

const PATHS: Record<IconName, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9.5 20v-6h5v6" /></>,
  sessions: <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3v5M16 3v5M4 10h16M8 14h3M8 17h7" /></>,
  trips: <><path d="M4 16h16M5 16V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9M5 11h14M9 5v6" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  competitions: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8.5 20h7M9.5 17h5v3h-5z" /></>,
  attendance: <><path d="M9 5H6a2 2 0 0 0-2 2v12h13v-3" /><path d="M9 3h6v4H9zM9 12l2.2 2.2L20 6" /></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  finance: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M16 10h5v6h-5a3 3 0 0 1 0-6ZM7 6V4h10v2" /></>,
  manage: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M17 8h4M19 6v4M17 15h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  dots: <><circle cx="12" cy="5" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="12" cy="19" r="1.3" /></>,
  logout: <path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />,
  audit: <><path d="M9 4h6v3H9zM9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><path d="M8 12h8M8 16h5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  // "Next"/"previous" in reading order: in RTL the next item sits to the left.
  'chevron-next': <path d="m15 6-6 6 6 6" />,
  'chevron-prev': <path d="m9 6 6 6-6 6" />,
  check: <path d="M5 12.5 10 17l9-10" />,
  alert: <><path d="M12 8v5M12 16.5h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  drop: <path d="M12 3.5c3.5 4.3 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.5-6.2 6-10.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20v-1.5A5.5 5.5 0 0 1 8.5 13h1A5.5 5.5 0 0 1 15 18.5V20M16 4.5a3.2 3.2 0 0 1 0 6.3M18 13.4a5.5 5.5 0 0 1 3 4.9V20" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.8 1.7-1.6 0-.9-.7-1.4-.7-2.3 0-.9.8-1.6 1.7-1.6H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="14.5" cy="7.5" r="1" /></>,
  inbox: <><path d="M4 13h4l1.5 3h5L16 13h4" /><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2.5-8Z" /></>,
}

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  )
}
