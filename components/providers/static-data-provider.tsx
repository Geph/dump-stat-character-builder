"use client"

import { useCallback, useEffect, useState } from "react"
import { ensureLocalAvailableCardArtLoaded } from "@/lib/compendium/available-card-art"
import { isStaticDeploy } from "@/lib/config/deploy-mode"
import { ensureLocalSrdSeed } from "@/lib/data/local-seed"
import { pageHeaderSubtitleClass } from "@/lib/compendium/editor-field-styles"

const SEED_TIMEOUT_MS = 45_000

/**
 * Loads local-only card-art availability, then (in static mode) seeds IndexedDB.
 * Manifest must load before seed so PHB/setting portraits assign only when present.
 */
export function StaticDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [seedAttempt, setSeedAttempt] = useState(0)

  const runSeed = useCallback(async (signal: AbortSignal) => {
    const timeoutId = window.setTimeout(() => {
      if (signal.aborted) return
      setSeedError("Compendium seed is taking longer than expected. You can retry or continue anyway.")
      setReady(true)
    }, SEED_TIMEOUT_MS)

    try {
      await ensureLocalAvailableCardArtLoaded()
      if (signal.aborted) return
      await ensureLocalSrdSeed()
      if (!signal.aborted) setSeedError(null)
    } catch (e) {
      console.error("Local SRD seed failed:", e)
      if (!signal.aborted) {
        setSeedError(e instanceof Error ? e.message : "Failed to load compendium data.")
      }
    } finally {
      window.clearTimeout(timeoutId)
      if (!signal.aborted) setReady(true)
    }
  }, [])

  useEffect(() => {
    setReady(false)
    setSeedError(null)
    const controller = new AbortController()

    if (isStaticDeploy()) {
      void runSeed(controller.signal)
      return () => controller.abort()
    }

    void ensureLocalAvailableCardArtLoaded().finally(() => {
      if (!controller.signal.aborted) setReady(true)
    })
    return () => controller.abort()
  }, [seedAttempt, runSeed])

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <p className={pageHeaderSubtitleClass}>Loading compendium data…</p>
      </div>
    )
  }

  return (
    <>
      {seedError && isStaticDeploy() && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-foreground">
          <span>{seedError}</span>{" "}
          <button
            type="button"
            onClick={() => setSeedAttempt((n) => n + 1)}
            className="underline font-semibold text-primary"
          >
            Retry seed
          </button>
        </div>
      )}
      {children}
    </>
  )
}
