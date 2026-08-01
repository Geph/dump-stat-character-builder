"use client"

import { cn } from "@/lib/utils"

type ProceedBlockerBannerProps = {
  blockers: string[]
  className?: string
  /** Defaults to continue wording; pass save-specific copy when used on Save. */
  heading?: string
}

export function ProceedBlockerBanner({
  blockers,
  className,
  heading = "Complete these to continue:",
}: ProceedBlockerBannerProps) {
  if (blockers.length === 0) return null

  return (
    <div role="status" className={cn("text-sm", className)}>
      <p className="font-semibold text-destructive mb-1.5">{heading}</p>
      <ul className="list-disc pl-5 space-y-1 text-foreground">
        {blockers.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  )
}
