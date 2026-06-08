"use client"

import {
  COMPENDIUM_THEME_COLORS,
  compendiumThemeColorSwatchClass,
  type CompendiumThemeColorId,
} from "@/lib/compendium/theme-colors"

type CompendiumThemeColorPickerProps = {
  value: CompendiumThemeColorId | null
  onChange: (value: CompendiumThemeColorId | null) => void
  compact?: boolean
}

export function CompendiumThemeColorPicker({
  value,
  onChange,
  compact = false,
}: CompendiumThemeColorPickerProps) {
  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-1.5"}>
      <span className={`font-semibold text-foreground ${compact ? "text-xs" : "text-sm"}`}>
        Color
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          title="Default (primary)"
          aria-label="Default theme color"
          onClick={() => onChange(null)}
          className={[
            "rounded-full border-2 shrink-0 transition-all hover:scale-110",
            compact ? "w-5 h-5" : "w-6 h-6",
            value === null
              ? "border-primary ring-2 ring-primary/40 ring-offset-1 ring-offset-card"
              : "border-border bg-muted",
          ].join(" ")}
        />
        {COMPENDIUM_THEME_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={value === color.id}
            onClick={() => onChange(color.id)}
            className={[
              compendiumThemeColorSwatchClass(color.id, value === color.id),
              compact ? "!w-5 !h-5" : "",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  )
}
