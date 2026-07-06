"use client"

import { useRef } from "react"
import { ImageIcon, X } from "lucide-react"
import {
  CARD_IMAGE_ASPECT_LABEL,
  CARD_IMAGE_RECOMMENDED,
  CLASS_CARD_ASPECT_CLASS,
  PORTRAIT_CARD_IMAGE_HINT,
  WIDE_CARD_ASPECT_CLASS,
  normalizeCardImageUrl,
  type CompendiumCardImageCrop,
} from "@/lib/compendium/card-image"
import {
  pageOverlayPanelClass,
  pageOverlayPanelHintClass,
  pageOverlayPanelMetaClass,
  pageOverlayPanelTitleClass,
} from "@/lib/compendium/editor-field-styles"
import { MAX_PORTRAIT_FILE_BYTES } from "@/lib/portrait"
import { cn } from "@/lib/utils"

type CardImageFieldProps = {
  value: string | null
  onChange: (value: string | null) => void
  label?: string
  imageAspect?: "3/4" | "21/9"
  imageCrop?: CompendiumCardImageCrop
  /** Fills a narrow column (e.g. beside description). */
  layout?: "default" | "sidebar" | "paired"
  className?: string
}

export function CardImageField({
  value,
  onChange,
  label = "Card background graphic",
  imageAspect = "21/9",
  imageCrop = "center",
  layout = "default",
  className,
}: CardImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = normalizeCardImageUrl(value)
  const aspectClass = imageAspect === "21/9" ? WIDE_CARD_ASPECT_CLASS : CLASS_CARD_ASPECT_CLASS
  const previewImageClass =
    imageCrop === "top" ? "h-full w-full object-cover object-top" : "h-full w-full object-cover object-center"
  const previewWidthClass =
    layout === "sidebar" || layout === "paired" ? "w-full" : "w-full max-w-md"
  const previewSizeClass =
    layout === "paired"
      ? "relative flex-1 min-h-[10rem] w-full"
      : cn(previewWidthClass, aspectClass)
  const hintText =
    imageAspect === "3/4"
      ? `Shown on compendium cards and detail overlays. ${PORTRAIT_CARD_IMAGE_HINT}`
      : `Shown on compendium cards and detail overlays. ${CARD_IMAGE_ASPECT_LABEL} · ${CARD_IMAGE_RECOMMENDED}`

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) return
    if (file.size > MAX_PORTRAIT_FILE_BYTES) {
      alert(`Image must be under ${MAX_PORTRAIT_FILE_BYTES / (1024 * 1024)} MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = normalizeCardImageUrl(reader.result)
      onChange(result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      className={cn(
        pageOverlayPanelClass,
        "p-4 space-y-3",
        layout === "paired" && "h-full flex flex-col min-h-0",
        className,
      )}
    >
      <div className="shrink-0">
        <label className={cn("block", pageOverlayPanelTitleClass)}>{label}</label>
        <p className={pageOverlayPanelHintClass}>{hintText}</p>
      </div>

      {preview ? (
        <div className={cn("overflow-hidden rounded-lg border border-border", previewSizeClass)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className={previewImageClass} />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            title="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/90 text-foreground/75 hover:border-primary/50 hover:text-foreground transition-colors",
            previewSizeClass,
          )}
        >
          <ImageIcon className="h-8 w-8 opacity-60" />
          <span className="text-sm font-medium">Upload background graphic</span>
        </button>
      )}

      <div
        className={cn(
          "gap-2 shrink-0",
          layout === "sidebar" || layout === "paired" ? "flex flex-col" : "flex flex-wrap items-center",
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-primary hover:underline text-left"
        >
          {preview ? "Replace image" : "Choose file"}
        </button>
        <span className={pageOverlayPanelMetaClass}>or paste URL:</span>
        <input
          type="url"
          value={value?.startsWith("data:") ? "" : value ?? ""}
          onChange={(e) => onChange(normalizeCardImageUrl(e.target.value))}
          placeholder="https://…"
          className={cn(
            "px-3 py-1.5 bg-background/90 border border-border rounded-lg text-sm text-foreground",
            layout === "sidebar" || layout === "paired" ? "w-full" : "flex-1 min-w-[200px]",
          )}
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  )
}
