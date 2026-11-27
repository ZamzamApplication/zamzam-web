'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface ScrollMetrics {
  canScroll: boolean
  /** 0 at the reading start (right edge in RTL), 1 at the far end. */
  progress: number
  /** Visible share of the content, 0–1. */
  ratio: number
}

const INITIAL: ScrollMetrics = { canScroll: false, progress: 0, ratio: 1 }

/**
 * Horizontally scrolling table with a slim scrollbar that stays pinned to the
 * bottom of the viewport while the table is on screen, plus edge fades that
 * show when more columns are hidden. The browser's own bar is hidden.
 */
export default function ScrollableTable({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startProgress: number } | null>(null)
  const [metrics, setMetrics] = useState<ScrollMetrics>(INITIAL)
  const [dragging, setDragging] = useState(false)

  const isRtl = () => (scrollRef.current ? getComputedStyle(scrollRef.current).direction === 'rtl' : true)

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const canScroll = max > 1
    const progress = canScroll ? Math.min(1, Math.max(0, Math.abs(el.scrollLeft) / max)) : 0
    const ratio = canScroll ? el.clientWidth / el.scrollWidth : 1
    setMetrics(current => (
      current.canScroll === canScroll && Math.abs(current.progress - progress) < 0.001 && Math.abs(current.ratio - ratio) < 0.001
        ? current
        : { canScroll, progress, ratio }
    ))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const scrollToProgress = (progress: number, smooth = false) => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const clamped = Math.min(1, Math.max(0, progress))
    el.scrollTo({ left: (isRtl() ? -1 : 1) * clamped * max, behavior: smooth ? 'smooth' : 'auto' })
  }

  const thumbFraction = Math.max(0.08, metrics.ratio)
  const travel = 1 - thumbFraction

  const onThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startProgress: metrics.progress }
    setDragging(true)
  }

  const onThumbPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || !track || travel <= 0) return
    const dx = event.clientX - drag.startX
    const direction = isRtl() ? -1 : 1
    scrollToProgress(drag.startProgress + (direction * dx) / (track.clientWidth * travel))
  }

  const endDrag = () => {
    dragRef.current = null
    setDragging(false)
  }

  const onTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const fromStart = isRtl() ? rect.right - event.clientX : event.clientX - rect.left
    const thumbWidth = rect.width * thumbFraction
    scrollToProgress((fromStart - thumbWidth / 2) / (rect.width - thumbWidth || 1), true)
  }

  const onTrackKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.25 : 0.1
    const forward = isRtl() ? 'ArrowLeft' : 'ArrowRight'
    const backward = isRtl() ? 'ArrowRight' : 'ArrowLeft'
    if (event.key === forward) scrollToProgress(metrics.progress + step, true)
    else if (event.key === backward) scrollToProgress(metrics.progress - step, true)
    else if (event.key === 'Home') scrollToProgress(0, true)
    else if (event.key === 'End') scrollToProgress(1, true)
    else return
    event.preventDefault()
  }

  const atEnd = metrics.progress >= 0.998

  return (
    <div className="relative">
      <div className="relative">
        <div ref={scrollRef} onScroll={measure} className="table-scroll-no-bar overflow-x-auto">
          {children}
        </div>
        {/* Fade on the far edge while more columns are hidden there. */}
        {metrics.canScroll && <div aria-hidden="true" className={`table-edge-fade ${atEnd ? 'opacity-0' : 'opacity-100'}`} />}
      </div>

      {metrics.canScroll && (
        <>
          <div className="table-scrollbar sticky bottom-0 z-20 hidden px-3 pb-2 pt-2 md:block">
            <div
              ref={trackRef}
              role="scrollbar"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(metrics.progress * 100)}
              aria-label="التمرير الأفقي للجدول"
              tabIndex={0}
              onPointerDown={onTrackPointerDown}
              onKeyDown={onTrackKeyDown}
              className={`table-scrollbar-track group relative h-2 cursor-pointer rounded-full transition-[height] hover:h-2.5 ${dragging ? 'h-2.5' : ''}`}
            >
              <div
                onPointerDown={onThumbPointerDown}
                onPointerMove={onThumbPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={`table-scrollbar-thumb absolute inset-y-0 cursor-grab rounded-full ${dragging ? 'cursor-grabbing table-scrollbar-thumb-active' : ''}`}
                style={{
                  width: `${thumbFraction * 100}%`,
                  insetInlineStart: `${metrics.progress * travel * 100}%`,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
