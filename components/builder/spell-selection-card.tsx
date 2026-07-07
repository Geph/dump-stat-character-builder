"use client"

import { Check, Info } from "lucide-react"
import { motion } from "framer-motion"
import { GameIcon } from "@/components/game-icon-picker"
import { compendiumCardHeroImageClass } from "@/lib/compendium/card-image"
import { resolveSpellCardImageUrl } from "@/lib/compendium/enrich-srd-spells"
import {
  compendiumAccentColorStyles,
  type CompendiumThemeColorId,
} from "@/lib/compendium/theme-colors"
import { cn } from "@/lib/utils"
import type { Spell } from "@/lib/types"

type SpellPickHandlers = {
  selected: boolean
  selectable: boolean
  onToggle: () => void
  onDetails: () => void
}

type SpellSelectionCardProps = SpellPickHandlers & {
  spell: Spell
  accentColor?: CompendiumThemeColorId | null
}

/** Portrait tile — matches bundled spell card art (3:4). */
const SPELL_SELECTION_CARD_SHELL_CLASS = "aspect-[3/4] min-h-[240px] w-full"
const SPELL_SELECTION_CARD_GRADIENT_CLASS =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0.8)_20%,rgba(0,0,0,0)_35%,transparent_35%)]"

/** Visual spell card for builder — portrait art with a late bottom scrim; metadata in Details. */
export function SpellSelectionCard({
  spell,
  accentColor = null,
  selected,
  selectable,
  onToggle,
  onDetails,
}: SpellSelectionCardProps) {
  const accent = compendiumAccentColorStyles(accentColor)
  const disabled = !selectable && !selected
  const imageUrl = resolveSpellCardImageUrl(spell)

  return (
    <motion.div
      role="button"
      tabIndex={disabled ? undefined : 0}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-lg text-left transition-shadow",
        "border-2 shadow-lg",
        SPELL_SELECTION_CARD_SHELL_CLASS,
        selected
          ? "border-secondary ring-2 ring-secondary/40 shadow-secondary/20"
          : "border-primary/50 hover:border-primary/80 hover:shadow-xl",
        disabled && "pointer-events-none opacity-50",
      )}
      style={
        selected
          ? undefined
          : {
              boxShadow:
                "inset 0 0 0 1px rgba(212, 175, 55, 0.15), 0 8px 32px rgba(0,0,0,0.45)",
            }
      }
    >
      <div className="pointer-events-none absolute inset-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className={compendiumCardHeroImageClass("top")} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/80 via-card to-background" />
        )}
      </div>
      <div
        className={cn("pointer-events-none absolute inset-0", SPELL_SELECTION_CARD_GRADIENT_CLASS)}
      />
      {spell.icon && (
        <div className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/50 backdrop-blur-sm">
          <GameIcon name={spell.icon} className={cn("h-6 w-6", accent.imageCardIconText)} />
        </div>
      )}
      <div className="relative z-10 flex flex-1 flex-col justify-end p-3 pt-2">
        <h3 className="font-serif text-[0.84rem] sm:text-[0.94rem] font-black text-white leading-tight drop-shadow-md">
          {spell.name}
        </h3>
        <div className="mt-3 flex items-center justify-start gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDetails()
              }}
              className="rounded border border-white/40 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 hover:bg-white/10 transition-colors"
            >
              Details
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) onToggle()
              }}
              className={cn(
                "rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                selected
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : cn(
                      "bg-black/30",
                      accent.cardFooterBorder,
                      accent.cardFooterText,
                      accent.cardFooterSelectHover,
                    ),
              )}
            >
              {selected ? "Selected" : "Select"}
            </button>
        </div>
      </div>
    </motion.div>
  )
}

export function BuilderSpellCompactPick({
  spell,
  selected,
  selectable,
  onToggle,
  onDetails,
}: SpellPickHandlers & { spell: Spell }) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border transition-all",
        selected
          ? "border-secondary bg-secondary/10 cursor-pointer"
          : selectable
            ? "border-border bg-card hover:border-secondary/50 cursor-pointer"
            : "border-border bg-card opacity-50 cursor-not-allowed",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={!selectable}
        onChange={() => {
          if (selectable || selected) onToggle()
        }}
        className="sr-only"
      />
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? "border-secondary bg-secondary" : "border-muted-foreground",
        )}
      >
        {selected && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{spell.name}</p>
        <p className="text-xs text-muted-foreground">{spell.school}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDetails()
        }}
        className="shrink-0 p-0.5 text-muted-foreground hover:text-primary"
      >
        <Info className="h-3 w-3" />
      </button>
    </label>
  )
}
