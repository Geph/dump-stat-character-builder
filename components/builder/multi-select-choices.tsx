"use client"

import { useState } from "react"
import { Info, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getSkillDescription } from "@/lib/compendium/skill-descriptions"
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
  allowCustom = false,
  customPlaceholder = "Add a custom entry...",
}: MultiSelectChoicesProps) {
  const unavailable = new Set(unavailableOptions)
  const [skillInfo, setSkillInfo] = useState<string | null>(null)
  const [customDraft, setCustomDraft] = useState("")

  // Selected entries that aren't in the option list are custom additions; show them too.
  const optionNames = new Set(options.map((option) => option.name))
  const displayOptions: ChoiceOption[] = [
    ...options,
    ...selected.filter((name) => !optionNames.has(name)).map((name) => ({ name })),
  ]

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((entry) => entry !== name))
      return
    }
    if (unavailable.has(name) || selected.length >= maxCount) return
    onChange([...selected, name])
  }

  const addCustom = () => {
    const trimmed = customDraft.trim()
    if (!trimmed || selected.includes(trimmed) || selected.length >= maxCount) return
    onChange([...selected, trimmed])
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {displayOptions.map((option) => {
            const isSelected = selected.includes(option.name)
            const isTakenElsewhere = !isSelected && unavailable.has(option.name)
            const isDisabled = isTakenElsewhere || (!isSelected && selected.length >= maxCount)
            const skillDescription = showSkillInfo ? getSkillDescription(option.name) : null
            return (
              <div key={option.name} className="flex items-stretch gap-1">
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggle(option.name)}
                  className={`flex-1 p-2 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? accentClass
                      : isDisabled
                        ? "border-border bg-card opacity-50 cursor-not-allowed"
                        : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-sm text-foreground">{option.name}</p>
                  {isTakenElsewhere && (
                    <p className="text-xs text-muted-foreground mt-0.5">Already chosen</p>
                  )}
                  {option.description && (
                    <ClampedRichText
                      html={option.description}
                      lines={2}
                      className="text-xs mt-0.5"
                    />
                  )}
                </button>
                {showSkillInfo && skillDescription && (
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
        {skillInfo && (
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
