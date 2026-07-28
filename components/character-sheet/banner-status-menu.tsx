"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { SHEET_BANNER_BUTTON } from "@/lib/character/sheet-status-colors"
import { cn } from "@/lib/utils"

type BannerStatusMenuProps = {
  children: ReactNode | ((close: () => void) => ReactNode)
  className?: string
  /** When true, shows an active accent (e.g. inspiration / rage on). */
  active?: boolean
}

/** Compact chevron-only menu for Rest / Inspiration / Rage on the smallest phones. */
export function BannerStatusMenu({ children, className, active = false }: BannerStatusMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => setOpen(false)
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [open])

  const openMenu = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const panelWidth = 240
    const left = Math.min(
      Math.max(8, rect.right - panelWidth),
      window.innerWidth - panelWidth - 8,
    )
    setPos({ top: rect.bottom + 6, left })
    setOpen(true)
  }

  const content = typeof children === "function" ? children(close) : children

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Status and rest options"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Status and rest"
        onClick={() => {
          if (open) {
            setOpen(false)
            return
          }
          openMenu()
        }}
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
          active ? SHEET_BANNER_BUTTON.toggleActive : SHEET_BANNER_BUTTON.icon,
          "text-muted-foreground",
          className,
        )}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && pos ? (
        <>
          <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="fixed z-[100] flex w-60 flex-col gap-1.5 rounded-lg border border-border bg-card p-2 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            {content}
          </div>
        </>
      ) : null}
    </>
  )
}
