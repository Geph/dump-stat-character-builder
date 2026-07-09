"use client"

import { useCallback, useEffect, useState } from "react"
import {
  GM_DASHBOARD_NAV_CHANGE_EVENT,
  isGmDashboardNavEnabled,
  setGmDashboardNavEnabled,
} from "@/lib/site-settings/gm-dashboard"

export function useGmDashboardNav(): {
  enabled: boolean
  setEnabled: (next: boolean) => void
  ready: boolean
} {
  const [enabled, setEnabledState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setEnabledState(isGmDashboardNavEnabled())
    setReady(true)
    const sync = () => setEnabledState(isGmDashboardNavEnabled())
    window.addEventListener(GM_DASHBOARD_NAV_CHANGE_EVENT, sync)
    return () => window.removeEventListener(GM_DASHBOARD_NAV_CHANGE_EVENT, sync)
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    setGmDashboardNavEnabled(next)
    setEnabledState(next)
  }, [])

  return { enabled, setEnabled, ready }
}
