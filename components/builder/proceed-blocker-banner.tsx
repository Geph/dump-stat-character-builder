"use client"

import { ArrowRight } from "lucide-react"
import type { BuilderBlocker } from "@/lib/builder/proceed-blockers"
import { cn } from "@/lib/utils"

type ProceedBlockerBannerProps = {
  blockers: Array<string | BuilderBlocker>
  className?: string
  /** Defaults to continue wording; pass save-specific copy when used on Save. */
  heading?: string
  onJump?: (blocker: BuilderBlocker) => void
}

function toBlocker(entry: string | BuilderBlocker, index: number): BuilderBlocker {
  if (typeof entry === "string") return { message: entry, stepId: 0 }
  return entry
}

export function ProceedBlockerBanner({
  blockers,
  className,
  heading = "Complete these to continue:",
  onJump,
}: ProceedBlockerBannerProps) {
  if (blockers.length === 0) return null

  return (
    <div role="status" className={cn("text-sm", className)}>
      <p className="font-semibold text-destructive mb-1.5">{heading}</p>
      <ul className="space-y-1 text-foreground">
        {blockers.map((entry, index) => {
          const blocker = toBlocker(entry, index)
          const canJump = Boolean(onJump && (blocker.stepId || blocker.targetId))
          return (
            <li key={`${blocker.message}-${index}`} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <span className="min-w-0 flex-1">{blocker.message}</span>
              {canJump ? (
                <button
                  type="button"
                  onClick={() => onJump?.(blocker)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/30 px-2 py-0.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                >
                  Jump
                  <ArrowRight className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
