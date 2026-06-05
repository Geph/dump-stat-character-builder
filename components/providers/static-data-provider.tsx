"use client"

import { useEffect, useState } from "react"
import { isStaticDeploy } from "@/lib/config/deploy-mode"
import { ensureLocalSrdSeed } from "@/lib/data/local-seed"

/**
 * On first visit in static mode, seeds IndexedDB with bundled SRD content.
 */
export function StaticDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isStaticDeploy())

  useEffect(() => {
    if (!isStaticDeploy()) return
    let cancelled = false
    ;(async () => {
      try {
        await ensureLocalSrdSeed()
      } catch (e) {
        console.error("Local SRD seed failed:", e)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <p className="text-muted-foreground text-lg">Loading compendium data…</p>
      </div>
    )
  }

  return <>{children}</>
}
