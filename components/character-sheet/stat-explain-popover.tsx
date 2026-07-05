"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Info } from "lucide-react"
import type { StatContribution } from "@/lib/character/stat-contributions"
import { sumContributions } from "@/lib/character/stat-contributions"
import type { StatBreakdownPart } from "@/lib/character/types"

function formatSignedValue(value: number) {
  return value >= 0 ? `+${value}` : `${value}`
}

type StatExplainPopoverProps = {
  title: string
  total: number
  parts?: StatBreakdownPart[]
  contributions?: StatContribution[]
  /** When false, lines are independent final values (e.g. walk vs fly speed), not additive parts. */
  summable?: boolean
}

export function StatExplainPopover({
  title,
  total,
  parts,
  contributions,
  summable = true,
}: StatExplainPopoverProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const lines: { label: string; amount: number; href?: string }[] = contributions?.length
    ? contributions.map((line) => ({
        label: line.label,
        amount: line.amount,
        href: line.href,
      }))
    : (parts ?? []).map((part) => ({ label: part.label, amount: part.value }))

  const openPopover = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const panelWidth = 224
    const left = Math.min(
      Math.max(8, rect.right - panelWidth),
      window.innerWidth - panelWidth - 8,
    )
    setPos({ top: rect.bottom + 6, left })
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [open])

  if (!lines.length) return null

  const computedTotal = summable
    ? contributions?.length
      ? sumContributions(contributions)
      : total
    : total

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          if (open) {
            setOpen(false)
            return
          }
          openPopover()
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shrink-0"
        aria-label={`How ${title} is calculated`}
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && pos ? (
        <>
          <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="fixed z-[100] w-56 rounded-lg border border-border bg-card p-2 text-left shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <div className="space-y-0.5">
              {lines.map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  {line.href ? (
                    <a href={line.href} className="text-muted-foreground hover:text-primary truncate">
                      {line.label}
                    </a>
                  ) : (
                    <span className="text-muted-foreground truncate">{line.label}</span>
                  )}
                  <span className="font-medium tabular-nums shrink-0">
                    {summable ? formatSignedValue(line.amount) : `${line.amount} ft`}
                  </span>
                </div>
              ))}
            </div>
            {summable ? (
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-1 text-xs font-bold">
                <span>Total</span>
                <span className="tabular-nums">{computedTotal}</span>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  )
}
