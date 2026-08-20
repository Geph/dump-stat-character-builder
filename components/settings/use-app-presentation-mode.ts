"use client"

import { useCallback, useEffect, useState } from "react"
import {
  APP_PRESENTATION_MODE_CHANGE_EVENT,
  DEFAULT_APP_PRESENTATION_MODE,
  getAppPresentationMode,
  setAppPresentationMode,
  type AppPresentationMode,
} from "@/lib/site-settings/app-presentation-mode"
import {
  DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT,
  areDefaultMidjourneyGraphicsDisabled,
} from "@/lib/site-settings/default-midjourney-graphics"

export function useAppPresentationMode(): {
  mode: AppPresentationMode
  isCompactOnly: boolean
  hideDefaultMidjourneyGraphics: boolean
  setMode: (next: AppPresentationMode) => void
  ready: boolean
} {
  const [mode, setModeState] = useState<AppPresentationMode>(DEFAULT_APP_PRESENTATION_MODE)
  const [hideDefaultMidjourneyGraphics, setHideDefaultMidjourneyGraphics] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => {
      setModeState(getAppPresentationMode())
      setHideDefaultMidjourneyGraphics(areDefaultMidjourneyGraphicsDisabled())
    }
    sync()
    setReady(true)
    window.addEventListener(APP_PRESENTATION_MODE_CHANGE_EVENT, sync)
    window.addEventListener(DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener(APP_PRESENTATION_MODE_CHANGE_EVENT, sync)
      window.removeEventListener(DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT, sync)
    }
  }, [])

  const setMode = useCallback((next: AppPresentationMode) => {
    setAppPresentationMode(next)
    setModeState(next)
  }, [])

  return {
    mode,
    isCompactOnly: mode === "compact-only",
    hideDefaultMidjourneyGraphics,
    setMode,
    ready,
  }
}
