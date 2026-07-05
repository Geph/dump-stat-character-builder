"use client"

import { cn } from "@/lib/utils"

type ProceedBlockerBannerProps = {
  blockers: string[]
  className?: string
}

export function ProceedBlockerBanner({ blockers, className }: ProceedBlockerBannerProps) {
  if (blockers.length === 0) return null

  return (
    <div role="status" className={cn("text-sm", className)}>
      <p className="font-semibold text-destructive mb-1.5">Complete these to continue:</p>
      <ul className="list-disc pl-5 space-y-1 text-foreground">
        {blockers.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  )
}
