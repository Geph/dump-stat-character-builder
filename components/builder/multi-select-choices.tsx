"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Info, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GameIcon } from "@/components/game-icon-picker"
import { getSkillDescription } from "@/lib/compendium/skill-descriptions"
import { skillIconSlug } from "@/lib/compendium/skill-icons"
import { ClampedRichText } from "@/components/character-sheet/expandable-description"

type ChoiceOption = { name: string; description?: string }

type MultiSelectChoicesProps = {
  title: string
  hint?: string
  options: ChoiceOption[]
  maxCount: number
  selected: string[]
  onChange: (selected: string[]) => void
  accentClass?: string
  unavailableOptions?: string[]
  /** When true, show an info button for D&D skill options. */
  showSkillInfo?: boolean
  /** Compact builder layout: denser grid, no skill info buttons. */
  layout?: "default" | "compact" | "visual"
  /** Custom skill name → game-icons slug (from compendium custom abilities). */
  skillIconByName?: Record<string, string>
  /** When true, let the player add custom free-text entries (e.g. user-defined languages). */
  allowCustom?: boolean
  /** Placeholder for the custom-entry input. */
  customPlaceholder?: string
}

export function MultiSelectChoices({
  title,
  hint,
  options,
  maxCount,
  selected,
  onChange,
  accentClass = "border-primary bg-primary/10",
  unavailableOptions = [],
  showSkillInfo = false,
  layout = "default",
  allowCustom = false,
  customPlaceholder = "Add a custom entry...",
  skillIconByName = {},
}: MultiSelectChoicesProps) {
  const unavailable = new Set(unavailableOptions)
  const compact = layout === "compact"
  const visual = layout === "visual"
  const showInfoButtons = showSkillInfo && !compact
  const showSkillIcons = visual && showSkillInfo
  const [skillInfo, setSkillInfo] = useState<string | null>(null)
  const [customDraft, setCustomDraft] = useState("")
  const pendingScrollY = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (pendingScrollY.current == null) return
    window.scrollTo(0, pendingScrollY.current)
    pendingScrollY.current = null
  })

  const emitChange = (next: string[]) => {
    pendingScrollY.current = window.scrollY
    onChange(next)
  }

  // Selected entries that aren't in the option list are custom additions; show them too.
  const optionNames = new Set(options.map((option) => option.name))
  const displayOptions: ChoiceOption[] = [
    ...options,
    ...selected.filter((name) => !optionNames.has(name)).map((name) => ({ name })),
  ]

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      emitChange(selected.filter((entry) => entry !== name))
      return
    }
    if (unavailable.has(name) || selected.length >= maxCount) return
    emitChange([...selected, name])
  }

  const addCustom = () => {
    const trimmed = customDraft.trim()
    if (!trimmed || selected.includes(trimmed) || selected.length >= maxCount) return
    emitChange([...selected, trimmed])
    setCustomDraft("")
  }

  const activeSkillDescription = skillInfo ? getSkillDescription(skillInfo) : null

  return (
    <>
      <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-bold text-sm text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {selected.length}/{maxCount} selected
          </span>
        </div>
        {hint && <p className="text-xs text-muted-foreground mb-3">{hint}</p>}
        <div
          className={
            compact
              ? "grid grid-cols-1 sm:grid-cols-3 gap-1.5"
              : "grid grid-cols-1 sm:grid-cols-3 gap-2"
          }
        >
          {displayOptions.map((option) => {
            const isSelected = selected.includes(option.name)
            const isTakenElsewhere = !isSelected && unavailable.has(option.name)
            const isDisabled = isTakenElsewhere || (!isSelected && selected.length >= maxCount)
            const skillDescription = showInfoButtons ? getSkillDescription(option.name) : null
            const iconSlug = showSkillIcons ? skillIconSlug(option.name, skillIconByName) : null
            return (
              <div key={option.name} className={compact ? undefined : "flex items-stretch gap-1"}>
                <button
                  type="button"
                  disabled={isDisabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggle(option.name)}
                  className={`${compact ? "w-full px-2.5 py-1.5" : visual ? "flex-1 p-2.5" : "flex-1 p-2"} rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? accentClass
                      : isDisabled
                        ? "border-border bg-card opacity-50 cursor-not-allowed"
                        : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className={iconSlug ? "flex items-center gap-2 min-w-0" : undefined}>
                    {iconSlug ? (
                      <GameIcon
                        name={iconSlug}
                        className={`shrink-0 text-muted-foreground ${visual ? "h-5 w-5" : "h-4 w-4"}`}
                      />
                    ) : null}
                    <p
                      className={`font-semibold text-foreground min-w-0 ${compact ? "text-xs" : "text-sm"}`}
                    >
                      {option.name}
                    </p>
                  </div>
                  {isTakenElsewhere && (
                    <p className={`text-muted-foreground mt-0.5 ${compact ? "text-[11px]" : "text-xs"}`}>
                      Already chosen
                    </p>
                  )}
                  {option.description && (
                    <ClampedRichText
                      html={option.description}
                      lines={2}
                      className="text-xs mt-0.5"
                    />
                  )}
                </button>
                {showInfoButtons && skillDescription && (
                  <button
                    type="button"
                    aria-label={`About ${option.name}`}
                    onClick={() => setSkillInfo(option.name)}
                    className="shrink-0 self-center rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {allowCustom && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addCustom()
                }
              }}
              placeholder={customPlaceholder}
              disabled={selected.length >= maxCount}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customDraft.trim() || selected.length >= maxCount}
              className="px-3 py-2 rounded-lg border-2 border-border bg-card text-sm font-semibold hover:border-primary/40 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showInfoButtons && skillInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSkillInfo(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative max-w-md w-full rounded-xl border-2 border-primary/50 bg-card p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSkillInfo(null)}
                className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Skill</p>
              <h4 className="font-serif text-xl font-black text-foreground pr-8">{skillInfo}</h4>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {activeSkillDescription ?? "No description available."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
