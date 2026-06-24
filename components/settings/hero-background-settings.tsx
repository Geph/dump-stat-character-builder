"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImageIcon, Trash2 } from "lucide-react"
import {
  formatHeroBackgroundUploadHint,
  getCustomHeroBackground,
  readHeroBackgroundFile,
  setCustomHeroBackground,
} from "@/lib/site-settings/hero-background"
import { Button } from "@/components/ui/button"

export function HeroBackgroundSettings({
  onStatus,
  disabled,
}: {
  onStatus: (message: string | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refreshPreview = useCallback(() => {
    setPreview(getCustomHeroBackground())
  }, [])

  useEffect(() => {
    refreshPreview()
  }, [refreshPreview])

  const handleFile = async (file: File) => {
    setBusy(true)
    onStatus(null)
    try {
      const dataUrl = await readHeroBackgroundFile(file)
      setCustomHeroBackground(dataUrl)
      setPreview(dataUrl)
      onStatus("Home page background updated")
    } catch (e) {
      onStatus(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = () => {
    setCustomHeroBackground(null)
    setPreview(null)
    onStatus("Using default hero images")
  }

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
        <p className="text-sm font-semibold text-foreground">Home page background</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {formatHeroBackgroundUploadHint()}. One image replaces the random default hero art on this
          browser only.
        </p>
      </div>
      {preview ? (
        <div
          className="h-24 w-full rounded-xl border border-border bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${preview})` }}
          role="img"
          aria-label="Custom hero background preview"
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
          {preview ? "Replace background" : "Upload background"}
        </Button>
        {preview ? (
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
