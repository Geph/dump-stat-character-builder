"use client"

import { useCallback, useEffect, useState } from "react"
import {
  MANUAL_SKILL_ABILITY_CHANGE_EVENT,
  isManualSkillAbilityEnabled,
  setManualSkillAbilityEnabled,
} from "@/lib/site-settings/manual-skill-ability"

export function useManualSkillAbility(): {
  enabled: boolean
  setEnabled: (next: boolean) => void
  ready: boolean
} {
  const [enabled, setEnabledState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setEnabledState(isManualSkillAbilityEnabled())
    setReady(true)
    const sync = () => setEnabledState(isManualSkillAbilityEnabled())
    window.addEventListener(MANUAL_SKILL_ABILITY_CHANGE_EVENT, sync)
    return () => window.removeEventListener(MANUAL_SKILL_ABILITY_CHANGE_EVENT, sync)
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    setManualSkillAbilityEnabled(next)
    setEnabledState(next)
  }, [])

  return { enabled, setEnabled, ready }
}
