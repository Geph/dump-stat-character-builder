"use client"

import { useCallback, useEffect, useState } from "react"
import {
  WELCOME_SPLASH_CHANGE_EVENT,
  isWelcomeSplashSuppressed,
  setWelcomeSplashSuppressed,
} from "@/lib/site-settings/welcome-splash"

export function useWelcomeSplashSuppress(): {
  suppressed: boolean
  setSuppressed: (next: boolean) => void
  ready: boolean
} {
  const [suppressed, setSuppressedState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSuppressedState(isWelcomeSplashSuppressed())
    setReady(true)
    const sync = () => setSuppressedState(isWelcomeSplashSuppressed())
    window.addEventListener(WELCOME_SPLASH_CHANGE_EVENT, sync)
    return () => window.removeEventListener(WELCOME_SPLASH_CHANGE_EVENT, sync)
  }, [])

  const setSuppressed = useCallback((next: boolean) => {
    setWelcomeSplashSuppressed(next)
    setSuppressedState(next)
  }, [])

  return { suppressed, setSuppressed, ready }
}
