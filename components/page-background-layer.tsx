"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useAppTheme } from "@/components/providers/app-theme-provider"
import {
  PAGE_BG_ACTIVE_ATTR,
  PAGE_BG_CHANGE_EVENT,
  resolvePageBackgroundUrl,
} from "@/lib/site-settings/page-background"

/** Full-viewport decorative background behind app content. */
export function PageBackgroundLayer() {
  const { theme } = useAppTheme()
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const sync = () => setBackgroundUrl(resolvePageBackgroundUrl(theme))
    sync()
    window.addEventListener(PAGE_BG_CHANGE_EVENT, sync)
    return () => window.removeEventListener(PAGE_BG_CHANGE_EVENT, sync)
  }, [theme])

  useEffect(() => {
    if (!backgroundUrl) {
      document.documentElement.removeAttribute(PAGE_BG_ACTIVE_ATTR)
      return
    }
    document.documentElement.setAttribute(PAGE_BG_ACTIVE_ATTR, "active")
    return () => document.documentElement.removeAttribute(PAGE_BG_ACTIVE_ATTR)
  }, [backgroundUrl])

  if (!mounted || !backgroundUrl) return null

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 min-h-full bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: "100% auto",
          backgroundPosition: "top center",
        }}
      />
      <div className="absolute inset-0 bg-background/25" />
    </div>,
    document.body,
  )
}
