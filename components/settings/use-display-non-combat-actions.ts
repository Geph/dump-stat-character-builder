"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DISPLAY_NON_COMBAT_ACTIONS_CHANGE_EVENT,
  isDisplayNonCombatActionsEnabled,
  setDisplayNonCombatActionsEnabled,
} from "@/lib/site-settings/display-non-combat-actions"

export function useDisplayNonCombatActions(): {
  enabled: boolean
  setEnabled: (next: boolean) => void
  ready: boolean
} {
  const [enabled, setEnabledState] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setEnabledState(isDisplayNonCombatActionsEnabled())
    sync()
    setReady(true)
    window.addEventListener(DISPLAY_NON_COMBAT_ACTIONS_CHANGE_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(DISPLAY_NON_COMBAT_ACTIONS_CHANGE_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    setDisplayNonCombatActionsEnabled(next)
    setEnabledState(next)
  }, [])

  return { enabled, setEnabled, ready }
}
