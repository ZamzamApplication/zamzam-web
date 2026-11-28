'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/Icon'

/**
 * Dialog shell for management forms. Rendered into <body> so it always sits
 * above the sticky navigation, with a close button, Escape support and an
 * optional footer that stays pinned to the bottom while the body scrolls.
 * `onClose` may ask for confirmation (e.g. unsaved changes) before closing.
 */
export function Modal({ title, onClose, children, wide = false, footer, toolbar }: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /** Pinned under the scrolling body (save / cancel buttons). */
  footer?: ReactNode
  /** Pinned under the title (e.g. section tabs). */
  toolbar?: ReactNode
}) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // A confirm dialog on top handles its own Escape.
      if (document.querySelector('[role="alertdialog"]')) return
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="mobile-sheet-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/35 backdrop-blur-sm"
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`mobile-sheet glass-strong mx-4 flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-2xl ${wide ? 'max-w-3xl' : 'max-w-sm'}`}
      >
        <header className="sticky top-0 z-10 bg-[rgb(var(--glass-strong-bg))] px-5 pt-5 sm:px-6">
          <div className="flex items-start gap-3 pb-3">
            <h2 id={titleId} className="min-w-0 flex-1 text-xl font-bold text-deep-800">{title}</h2>
            <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-deep-400 transition hover:bg-water-100/60 hover:text-deep-700">
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
          {toolbar}
        </header>
        <div className="flex-1 px-5 pb-5 pt-1 sm:px-6">{children}</div>
        {footer && (
          <footer className="sticky bottom-0 z-10 border-t border-water-200/60 bg-[rgb(var(--glass-strong-bg))] px-5 py-3 sm:px-6 dark:border-slate-700/70">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ErrorMsg({ error }: { error: string }) {
  if (!error) return null
  return <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">{error}</div>
}
