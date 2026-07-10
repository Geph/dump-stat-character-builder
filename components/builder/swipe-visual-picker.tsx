"use client"

import { Children, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getCinematicPickerItemClass } from "@/lib/builder/picker-pagination"

type SwipeVisualPickerProps = {
  children: ReactNode
  className?: string
  /** Phone-only horizontal swipe carousel with hint and entry animation. */
  enabled?: boolean
}

const SWIPE_EDGE_FADE_LEFT_CLASS =
  "pointer-events-none absolute inset-y-0 left-0 z-[2] w-10 max-sm:block sm:hidden bg-gradient-to-r from-card from-15% via-card/55 to-transparent"

const SWIPE_EDGE_FADE_RIGHT_CLASS =
  "pointer-events-none absolute inset-y-0 right-0 z-[2] w-10 max-sm:block sm:hidden bg-gradient-to-l from-card from-15% via-card/55 to-transparent"

export function SwipeVisualPicker({ children, className, enabled = false }: SwipeVisualPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 4
      setCanScrollLeft(overflow && el.scrollLeft > 8)
      setCanScrollRight(overflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
    }

    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [enabled, children])

  useEffect(() => {
    if (!enabled) return
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollLeft > 12) setShowHint(false)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [enabled])

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  const swipeItemClass = getCinematicPickerItemClass()

  const animatedChildren = Children.map(children, (child, index) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.35), ease: "easeOut" }}
      className={swipeItemClass}
    >
      {child}
    </motion.div>
  ))

  return (
    <div className="relative max-sm:overflow-hidden max-sm:pt-7">
      {showHint && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center max-sm:flex sm:hidden">
          <motion.div
            animate={{ x: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="flex items-center gap-1 rounded-full border border-border/70 bg-background/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Swipe to browse
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </motion.div>
        </div>
      )}

      <div className="relative max-sm:overflow-hidden">
        {canScrollLeft && <div className={SWIPE_EDGE_FADE_LEFT_CLASS} aria-hidden />}
        {canScrollRight && <div className={SWIPE_EDGE_FADE_RIGHT_CLASS} aria-hidden />}

        <div ref={scrollRef} className={cn(className, "max-sm:min-w-0")}>
          {animatedChildren}
        </div>
      </div>
    </div>
  )
}
