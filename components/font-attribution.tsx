"use client"

import {
  CC_BY_SA_4_LEGALCODE_URL,
  CC_BY_SA_4_URL,
  CC_BY_SA_SECTION_5_DISCLAIMER,
  SOLBERA_BUNDLED_FAMILIES,
  SOLBERA_FONTS_ORIGINAL_URL,
  SOLBERA_FONTS_PAGE_URL,
  SOLBERA_FONTS_SOURCE_URL,
} from "@/lib/fonts/solbera-attribution"
import { cn } from "@/lib/utils"

type FontAttributionProps = {
  className?: string
  compact?: boolean
}

const linkClass = "text-primary hover:underline"

export function FontAttribution({ className, compact = false }: FontAttributionProps) {
  if (compact) {
    return (
      <p className={cn("text-muted-foreground", className)}>
        Fonts:{" "}
        <a href={SOLBERA_FONTS_PAGE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Solbera&apos;s D&amp;D Fonts
        </a>{" "}
        (
        <a href={CC_BY_SA_4_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          CC BY-SA 4.0
        </a>
        ).
      </p>
    )
  }

  return (
    <div className={cn("space-y-1 text-xs leading-snug text-muted-foreground", className)}>
      <p>
        Display type uses{" "}
        <a href={SOLBERA_FONTS_PAGE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Solbera&apos;s D&amp;D Fonts
        </a>{" "}
        by Solbera, with fixes and remakes by Ryrok, Ners, and LUCASTUCIOUS. Licensed under the{" "}
        <a href={CC_BY_SA_4_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Creative Commons Attribution-ShareAlike 4.0 International License
        </a>{" "}
        (
        <a href={CC_BY_SA_4_LEGALCODE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          legal code
        </a>
        ). Source:{" "}
        <a href={SOLBERA_FONTS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          jonathonf/solbera-dnd-fonts
        </a>
        ; original release{" "}
        <a href={SOLBERA_FONTS_ORIGINAL_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          on Reddit
        </a>
        .
      </p>
      <p>
        Bundled families: {SOLBERA_BUNDLED_FAMILIES.join(", ")}. Filenames were changed to kebab-case for
        self-hosting; the font outlines are otherwise unmodified. These files are{" "}
        <strong className="font-medium text-foreground/80">not</strong> covered by Dump Stat&apos;s MIT
        license. If you redistribute the fonts (including adapted copies), keep them under CC BY-SA 4.0.
      </p>
      <p className="text-[11px] sm:text-xs">{CC_BY_SA_SECTION_5_DISCLAIMER}</p>
    </div>
  )
}
