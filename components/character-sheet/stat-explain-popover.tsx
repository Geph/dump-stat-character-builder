"use client"

import { useState } from "react"
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
}

export function StatExplainPopover({
  title,
  total,
  parts,
  contributions,
}: StatExplainPopoverProps) {
  const [open, setOpen] = useState(false)

  const lines: { label: string; amount: number; href?: string }[] = contributions?.length
    ? contributions.map((line) => ({
        label: line.label,
        amount: line.amount,
        href: line.href,
      }))
    : (parts ?? []).map((part) => ({ label: part.label, amount: part.value }))

  if (!lines.length) return null

  const computedTotal = contributions?.length ? sumContributions(contributions) : total

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        aria-label={`How ${title} is calculated`}
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open ? (
        <>
          <span className="fixed inset-0 z-[99]" aria-hidden onClick={() => setOpen(false)} />
          <span className="absolute right-0 top-9 z-[100] block w-56 rounded-lg border border-border bg-card p-2 text-left shadow-xl">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
            <span className="block space-y-0.5">
              {lines.map((line, index) => (
                <span
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
                    {formatSignedValue(line.amount)}
                  </span>
                </span>
              ))}
            </span>
            <span className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-1 text-xs font-bold">
              <span>Total</span>
              <span className="tabular-nums">{computedTotal}</span>
            </span>
          </span>
        </>
      ) : null}
    </span>
  )
}
