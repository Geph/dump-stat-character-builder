"use client"

import { useCallback, useEffect, useState } from "react"
import {
  APP_PRESENTATION_MODE_CHANGE_EVENT,
  DEFAULT_APP_PRESENTATION_MODE,
  getAppPresentationMode,
  setAppPresentationMode,
  type AppPresentationMode,
} from "@/lib/site-settings/app-presentation-mode"

export function useAppPresentationMode(): {
  mode: AppPresentationMode
  isCompactOnly: boolean
  setMode: (next: AppPresentationMode) => void
  ready: boolean
} {
  const [mode, setModeState] = useState<AppPresentationMode>(DEFAULT_APP_PRESENTATION_MODE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setModeState(getAppPresentationMode())
    setReady(true)
    const sync = () => setModeState(getAppPresentationMode())
    window.addEventListener(APP_PRESENTATION_MODE_CHANGE_EVENT, sync)
    return () => window.removeEventListener(APP_PRESENTATION_MODE_CHANGE_EVENT, sync)
  }, [])

  const setMode = useCallback((next: AppPresentationMode) => {
    setAppPresentationMode(next)
    setModeState(next)
  }, [])

  return {
    mode,
    isCompactOnly: mode === "compact-only",
    setMode,
    ready,
  }
}
