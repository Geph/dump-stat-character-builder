"use client"

type ProceedBlockerBannerProps = {
  blockers: string[]
}

export function ProceedBlockerBanner({ blockers }: ProceedBlockerBannerProps) {
  if (blockers.length === 0) return null

  return (
    <div
      role="status"
      className="w-full rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
    >
      <p className="font-semibold text-destructive mb-1.5">Complete these to continue:</p>
      <ul className="list-disc pl-5 space-y-1 text-foreground">
        {blockers.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}
