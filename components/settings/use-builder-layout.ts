"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BUILDER_LAYOUT_CHANGE_EVENT,
  DEFAULT_BUILDER_LAYOUT,
  getBuilderLayout,
  setBuilderLayout,
  type BuilderLayout,
} from "@/lib/site-settings/builder-layout"

/** Read/write the global builder layout preference with cross-component sync. */
export function useBuilderLayout(): {
  layout: BuilderLayout
  setLayout: (next: BuilderLayout) => void
  ready: boolean
} {
  const [layout, setLayoutState] = useState<BuilderLayout>(DEFAULT_BUILDER_LAYOUT)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLayoutState(getBuilderLayout())
    setReady(true)
    const sync = () => setLayoutState(getBuilderLayout())
    window.addEventListener(BUILDER_LAYOUT_CHANGE_EVENT, sync)
    return () => window.removeEventListener(BUILDER_LAYOUT_CHANGE_EVENT, sync)
  }, [])

  const setLayout = useCallback((next: BuilderLayout) => {
    setBuilderLayout(next)
    setLayoutState(next)
  }, [])

  return { layout, setLayout, ready }
}
