'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export default function ScrollableTable({ children }: { children: ReactNode }) {
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const bottom = bottomRef.current
    if (!bottom) return

    const updateSize = () => {
      setContentWidth(bottom.scrollWidth)
      setCanScroll(bottom.scrollWidth > bottom.clientWidth + 1)
      if (topRef.current) topRef.current.scrollLeft = bottom.scrollLeft
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(bottom)
    if (bottom.firstElementChild) observer.observe(bottom.firstElementChild)
    window.addEventListener('resize', updateSize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  const syncScroll = (
    source: React.RefObject<HTMLDivElement>,
    target: React.RefObject<HTMLDivElement>
  ) => {
    if (source.current && target.current && target.current.scrollLeft !== source.current.scrollLeft) {
      target.current.scrollLeft = source.current.scrollLeft
    }
  }

  return (
    <div className="hidden md:block">
      {canScroll && (
        <div className="table-top-scroll sticky top-[4.25rem] z-20 mb-2 rounded-lg px-2 pt-1">
          <div className="text-[11px] text-deep-500 text-center leading-none mb-1">مرّر الجدول أفقياً</div>
          <div
            ref={topRef}
            onScroll={() => syncScroll(topRef, bottomRef)}
            className="h-4 overflow-x-auto overflow-y-hidden"
            aria-label="شريط التمرير الأفقي أعلى الجدول"
            tabIndex={0}
          >
            <div style={{ width: contentWidth, height: 1 }} />
          </div>
        </div>
      )}
      <div
        ref={bottomRef}
        onScroll={() => syncScroll(bottomRef, topRef)}
        className="overflow-x-auto"
      >
        {children}
      </div>
    </div>
  )
}
