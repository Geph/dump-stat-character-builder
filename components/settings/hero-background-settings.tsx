"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImageIcon, Trash2 } from "lucide-react"
import {
  formatHeroBackgroundUploadHint,
  getCustomHeroBackground,
  readHeroBackgroundFile,
  setCustomHeroBackground,
} from "@/lib/site-settings/hero-background"
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

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
    <>
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
      <DropdownMenuSeparator />
      <DropdownMenuLabel>General</DropdownMenuLabel>
      <div className="px-2 pb-2 space-y-2">
        <p className="text-xs font-semibold text-foreground">Home page background</p>
        <p className="text-xs text-muted-foreground leading-snug">
          {formatHeroBackgroundUploadHint()}. One image replaces the random default hero art on this
          browser only.
        </p>
        {preview && (
          <div
            className="h-16 w-full rounded-lg border border-border bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${preview})` }}
            role="img"
            aria-label="Custom hero background preview"
          />
        )}
      </div>
      <DropdownMenuItem
        className="gap-2 cursor-pointer"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon className="w-4 h-4" />
        {preview ? "Replace home background" : "Upload home background"}
      </DropdownMenuItem>
      {preview && (
        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          disabled={disabled || busy}
          onClick={handleRemove}
        >
          <Trash2 className="w-4 h-4" />
          Remove custom background
        </DropdownMenuItem>
      )}
    </>
  )
}
