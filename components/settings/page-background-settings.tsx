"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImageIcon, Trash2 } from "lucide-react"
import { useAppTheme } from "@/components/providers/app-theme-provider"
import {
  formatPageBackgroundUploadHint,
  hasCustomPageBackground,
  PAGE_BG_CHANGE_EVENT,
  readPageBackgroundFile,
  resolvePageBackgroundUrl,
  setCustomPageBackground,
} from "@/lib/site-settings/page-background"
import { getThemePageBackgroundAsset } from "@/lib/site-settings/theme-page-backgrounds"
import { Button } from "@/components/ui/button"

export function PageBackgroundSettings({
  onStatus,
  disabled,
}: {
  onStatus: (message: string | null) => void
  disabled?: boolean
}) {
  const { theme } = useAppTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [usingCustom, setUsingCustom] = useState(false)
  const [busy, setBusy] = useState(false)

  const refreshPreview = useCallback(() => {
    setUsingCustom(hasCustomPageBackground())
    setPreview(resolvePageBackgroundUrl(theme))
  }, [theme])

  useEffect(() => {
    refreshPreview()
  }, [refreshPreview])

  useEffect(() => {
    const onChange = () => refreshPreview()
    window.addEventListener(PAGE_BG_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(PAGE_BG_CHANGE_EVENT, onChange)
  }, [refreshPreview])

  const handleFile = async (file: File) => {
    setBusy(true)
    onStatus(null)
    try {
      const dataUrl = await readPageBackgroundFile(file)
      setCustomPageBackground(dataUrl)
      setPreview(dataUrl)
      setUsingCustom(true)
      onStatus("Page background updated")
    } catch (e) {
      onStatus(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = () => {
    setCustomPageBackground(null)
    const themeDefault = getThemePageBackgroundAsset(theme)
    setPreview(themeDefault)
    setUsingCustom(false)
    onStatus(
      themeDefault ? "Using theme default page background" : "Using solid theme background",
    )
  }

  const themeHasDefault = getThemePageBackgroundAsset(theme) != null

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ""
        }}
      />
      <div>
        <p className="text-sm font-semibold text-foreground">Page background</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {formatPageBackgroundUploadHint()}. Shown behind the app on this browser only.
          {!themeHasDefault && !usingCustom
            ? " No default graphic is set for this theme yet."
            : null}
        </p>
      </div>
      {preview ? (
        <div
          className="mx-auto aspect-[2/3] w-full max-w-[8rem] rounded-xl border border-border bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${preview})` }}
          role="img"
          aria-label="Page background preview"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
          {usingCustom ? "Replace background" : "Upload background"}
        </Button>
        {usingCustom ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={disabled || busy}
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}
