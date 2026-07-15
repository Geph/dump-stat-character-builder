"use client"

import { useRef, useState, useEffect } from "react"
import {
  COMPENDIUM_THEME_COLORS,
  compendiumThemeColorSwatchClass,
  type CompendiumThemeColorId,
} from "@/lib/compendium/theme-colors"
import { Palette } from "lucide-react"
import { cn } from "@/lib/utils"

type CompendiumThemeColorPickerProps = {
  value: CompendiumThemeColorId | null
  onChange: (value: CompendiumThemeColorId | null) => void
  compact?: boolean
}

const SWATCH_BG: Record<CompendiumThemeColorId, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  lime: "bg-lime",
  lemon: "bg-lemon",
  orange: "bg-orange",
  magenta: "bg-magenta",
  cyan: "bg-cyan",
  sky: "bg-sky",
  violet: "bg-violet",
}

export function CompendiumThemeColorPicker({
  value,
  onChange,
}: CompendiumThemeColorPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-colors",
          open ? "border-primary bg-muted" : "border-border hover:border-primary/60 hover:bg-muted/60",
        )}
        title="Accent color"
        aria-label="Choose accent color"
        aria-expanded={open}
      >
        {value ? (
          <span className={cn("w-5 h-5 rounded-full", SWATCH_BG[value])} />
        ) : (
          <Palette className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open ? (
        <div className="absolute left-0 top-full mt-1.5 z-50 rounded-xl border-2 border-border bg-card shadow-lg p-2.5 min-w-[172px]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2 px-0.5">
            Accent color
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            <button
              type="button"
              title="Default (primary)"
              aria-label="Default theme color"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={cn(
                "w-6 h-6 rounded-full border-2 shrink-0 transition-all hover:scale-110",
                value === null
                  ? "border-primary ring-2 ring-primary/40 ring-offset-1 ring-offset-card"
                  : "border-border bg-muted",
              )}
            />
            {COMPENDIUM_THEME_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                title={color.label}
                aria-label={color.label}
                aria-pressed={value === color.id}
                onClick={() => {
                  onChange(color.id)
                  setOpen(false)
                }}
                className={compendiumThemeColorSwatchClass(color.id, value === color.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
