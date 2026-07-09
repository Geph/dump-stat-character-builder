"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useAppTheme } from "@/components/providers/app-theme-provider"
import {
  PAGE_BG_ACTIVE_ATTR,
  PAGE_BG_CHANGE_EVENT,
  resolvePageBackgroundUrl,
} from "@/lib/site-settings/page-background"
import {
  APP_PRESENTATION_MODE_CHANGE_EVENT,
  areDecorativeBackgroundImagesEnabled,
} from "@/lib/site-settings/app-presentation-mode"

/** Full-viewport decorative background behind app content. */
export function PageBackgroundLayer() {
  const { theme } = useAppTheme()
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [decorativeImagesEnabled, setDecorativeImagesEnabled] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const syncPresentation = () => setDecorativeImagesEnabled(areDecorativeBackgroundImagesEnabled())
    syncPresentation()
    window.addEventListener(APP_PRESENTATION_MODE_CHANGE_EVENT, syncPresentation)
    return () => window.removeEventListener(APP_PRESENTATION_MODE_CHANGE_EVENT, syncPresentation)
  }, [])

  useEffect(() => {
    if (!decorativeImagesEnabled) {
      setBackgroundUrl(null)
      return
    }
    const sync = () => setBackgroundUrl(resolvePageBackgroundUrl(theme))
    sync()
    window.addEventListener(PAGE_BG_CHANGE_EVENT, sync)
    return () => window.removeEventListener(PAGE_BG_CHANGE_EVENT, sync)
  }, [theme, decorativeImagesEnabled])

  useEffect(() => {
    if (!backgroundUrl) {
      document.documentElement.removeAttribute(PAGE_BG_ACTIVE_ATTR)
      return
    }
    document.documentElement.setAttribute(PAGE_BG_ACTIVE_ATTR, "active")
    return () => document.documentElement.removeAttribute(PAGE_BG_ACTIVE_ATTR)
  }, [backgroundUrl])

  if (!mounted) return null

  if (!decorativeImagesEnabled) {
    return createPortal(
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-card-lighter via-background to-card"
      />,
      document.body,
    )
  }

  if (!backgroundUrl) return null

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-no-repeat bg-top max-sm:bg-cover max-sm:bg-center sm:bg-[length:100%_auto]"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
        }}
      />
      <div className="absolute inset-0 bg-background/25" />
    </div>,
    document.body,
  )
}
