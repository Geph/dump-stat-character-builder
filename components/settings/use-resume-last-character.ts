"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RESUME_LAST_CHARACTER_CHANGE_EVENT,
  isResumeLastCharacterEnabled,
  setResumeLastCharacterEnabled,
} from "@/lib/site-settings/resume-last-character"

export function useResumeLastCharacter(): {
  enabled: boolean
  setEnabled: (next: boolean) => void
  ready: boolean
} {
  const [enabled, setEnabledState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setEnabledState(isResumeLastCharacterEnabled())
    setReady(true)
    const sync = () => setEnabledState(isResumeLastCharacterEnabled())
    window.addEventListener(RESUME_LAST_CHARACTER_CHANGE_EVENT, sync)
    return () => window.removeEventListener(RESUME_LAST_CHARACTER_CHANGE_EVENT, sync)
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    setResumeLastCharacterEnabled(next)
    setEnabledState(next)
  }, [])

  return { enabled, setEnabled, ready }
}
