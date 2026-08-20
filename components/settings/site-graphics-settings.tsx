"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImageIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatHeroBackgroundUploadHint,
  getCustomHeroBackground,
  HERO_BG_CHANGE_EVENT,
  readHeroBackgroundFile,
  setCustomHeroBackground,
} from "@/lib/site-settings/hero-background"
import {
  formatLibraryBackgroundUploadHint,
  getCustomLibraryBackground,
  LIBRARY_BG_CHANGE_EVENT,
  readLibraryBackgroundFile,
  setCustomLibraryBackground,
} from "@/lib/site-settings/library-background"
import {
  formatPageBackgroundUploadHint,
  getCustomPageBackground,
  PAGE_BG_CHANGE_EVENT,
  readPageBackgroundFile,
  setCustomPageBackground,
} from "@/lib/site-settings/page-background"

type SlotId = "background" | "hero" | "library"

export function SiteGraphicsSettings({
  onStatus,
  disabled,
}: {
  onStatus: (message: string | null) => void
  disabled?: boolean
}) {
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const [busySlot, setBusySlot] = useState<SlotId | null>(null)
  const [hasBackground, setHasBackground] = useState(false)
  const [hasHero, setHasHero] = useState(false)
  const [hasLibrary, setHasLibrary] = useState(false)

  const refresh = useCallback(() => {
    setHasBackground(Boolean(getCustomPageBackground()))
    setHasHero(Boolean(getCustomHeroBackground()))
    setHasLibrary(Boolean(getCustomLibraryBackground()))
  }, [])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener(PAGE_BG_CHANGE_EVENT, onChange)
    window.addEventListener(HERO_BG_CHANGE_EVENT, onChange)
    window.addEventListener(LIBRARY_BG_CHANGE_EVENT, onChange)
    return () => {
      window.removeEventListener(PAGE_BG_CHANGE_EVENT, onChange)
      window.removeEventListener(HERO_BG_CHANGE_EVENT, onChange)
      window.removeEventListener(LIBRARY_BG_CHANGE_EVENT, onChange)
    }
  }, [refresh])

  const runUpload = async (slot: SlotId, file: File) => {
    setBusySlot(slot)
    onStatus(null)
    try {
      if (slot === "background") {
        setCustomPageBackground(await readPageBackgroundFile(file))
        onStatus("Page background updated")
      } else if (slot === "hero") {
        setCustomHeroBackground(await readHeroBackgroundFile(file))
        onStatus("Home page hero graphic updated")
      } else {
        setCustomLibraryBackground(await readLibraryBackgroundFile(file))
        onStatus("Home page library graphic updated")
      }
      refresh()
    } catch (e) {
      onStatus(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusySlot(null)
    }
  }

  const busy = busySlot != null

  return (
    <div className="space-y-3">
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void runUpload("background", file)
          e.target.value = ""
        }}
      />
      <input
        ref={heroInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void runUpload("hero", file)
          e.target.value = ""
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void runUpload("library", file)
          e.target.value = ""
        }}
      />
      <div>
        <p className="text-sm font-semibold text-foreground">Site graphics</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Uploads override bundled defaults on this browser only. Files are stored locally, so keep
          them small.
        </p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground leading-relaxed">
          <li>
            <span className="font-medium text-foreground">Background.</span>{" "}
            {formatPageBackgroundUploadHint()}. Shown behind the app.
          </li>
          <li>
            <span className="font-medium text-foreground">Hero graphic.</span>{" "}
            {formatHeroBackgroundUploadHint()}. Home page banner.
          </li>
          <li>
            <span className="font-medium text-foreground">Library graphic.</span>{" "}
            {formatLibraryBackgroundUploadHint()}. Home page Library Stats section.
          </li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || busy}
          onClick={() => backgroundInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
          {hasBackground ? "Replace background" : "Upload background"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || busy}
          onClick={() => heroInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
          {hasHero ? "Replace hero graphic" : "Upload hero graphic"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || busy}
          onClick={() => libraryInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
          {hasLibrary ? "Replace library graphic" : "Upload library graphic"}
        </Button>
        {hasBackground ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={disabled || busy}
            onClick={() => {
              setCustomPageBackground(null)
              onStatus("Using theme default page background")
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remove background
          </Button>
        ) : null}
        {hasHero ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={disabled || busy}
            onClick={() => {
              setCustomHeroBackground(null)
              onStatus("Using default hero images")
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remove hero
          </Button>
        ) : null}
        {hasLibrary ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={disabled || busy}
            onClick={() => {
              setCustomLibraryBackground(null)
              onStatus("Using default library graphic")
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remove library
          </Button>
        ) : null}
      </div>
    </div>
  )
}
