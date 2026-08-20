"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT,
  areDefaultMidjourneyGraphicsDisabled,
  setDefaultMidjourneyGraphicsDisabled,
} from "@/lib/site-settings/default-midjourney-graphics"

export function useDefaultMidjourneyGraphics(): {
  disabled: boolean
  setDisabled: (next: boolean) => void
  ready: boolean
} {
  const [disabled, setDisabledState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setDisabledState(areDefaultMidjourneyGraphicsDisabled())
    sync()
    setReady(true)
    window.addEventListener(DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const setDisabled = useCallback((next: boolean) => {
    setDefaultMidjourneyGraphicsDisabled(next)
    setDisabledState(next)
  }, [])

  return { disabled, setDisabled, ready }
}
