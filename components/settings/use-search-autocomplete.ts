"use client"

import { useCallback, useEffect, useState } from "react"
import {
  SEARCH_AUTOCOMPLETE_CHANGE_EVENT,
  isSearchAutocompleteEnabled,
  setSearchAutocompleteEnabled,
} from "@/lib/site-settings/search-autocomplete"

export function useSearchAutocomplete(): {
  enabled: boolean
  setEnabled: (next: boolean) => void
  ready: boolean
} {
  const [enabled, setEnabledState] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setEnabledState(isSearchAutocompleteEnabled())
    sync()
    setReady(true)
    window.addEventListener(SEARCH_AUTOCOMPLETE_CHANGE_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(SEARCH_AUTOCOMPLETE_CHANGE_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    setSearchAutocompleteEnabled(next)
    setEnabledState(next)
  }, [])

  return { enabled, setEnabled, ready }
}

