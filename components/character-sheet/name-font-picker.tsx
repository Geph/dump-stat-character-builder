"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { getNameFont, NAME_FONTS, type NameFontId } from "@/lib/character/name-fonts"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type NameFontPickerProps = {
  name: string
  selectedId: NameFontId
  onSelect: (id: NameFontId) => void
  onBanner?: boolean
}

export function NameFontPicker({
  name,
  selectedId,
  onSelect,
  onBanner = false,
}: NameFontPickerProps) {
  const previewName = name.trim() || "Character Name"
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change name font"
          title="Change name font"
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-background hover:text-foreground",
            onBanner && "bg-background/85 text-foreground/80",
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[80] w-56 border-border bg-card p-1.5 shadow-lg"
        sideOffset={6}
      >
        <p className="px-1.5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Name font
        </p>
        <div className="grid gap-1">
          {NAME_FONTS.map((font) => {
            const selected = font.id === selectedId
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => {
                  onSelect(font.id)
                  setOpen(false)
                }}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:border-border hover:bg-muted/60",
                )}
              >
                <span
                  className="block truncate text-lg font-bold leading-tight text-foreground"
                  style={nameFontStyle(font.id)}
                >
                  {previewName}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {font.label}
                  <span className="text-muted-foreground/80"> · {font.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function nameFontStyle(id: NameFontId): {
  fontFamily: string
  letterSpacing: string
  fontWeight?: number
} {
  const font = getNameFont(id)
  return {
    fontFamily: font.cssFamily,
    letterSpacing: font.letterSpacing,
    ...(font.fontWeight ? { fontWeight: font.fontWeight } : {}),
  }
}
