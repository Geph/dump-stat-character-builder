"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Info, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GameIcon } from "@/components/game-icon-picker"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { getSkillDescription } from "@/lib/compendium/skill-descriptions"
import { skillIconSlug } from "@/lib/compendium/skill-icons"

type ChoiceOption = {
  name: string
  description?: string
  prerequisite?: string | null
  /** e.g. discipline name or "General Talent" for pooled psionic talents */
  sourceLabel?: string | null
}

type MultiSelectChoicesProps = {
  title: string
  hint?: string
  options: ChoiceOption[]
  maxCount: number
  selected: string[]
  onChange: (selected: string[]) => void
  accentClass?: string
  unavailableOptions?: string[]
  /**
   * Options that appear selected and cannot be toggled (e.g. subclass-granted
   * disciplines). They do not count toward maxCount.
   */
  lockedOptions?: string[]
  /** Label shown under locked options (default: "Granted"). */
  lockedLabel?: string
  /** When true, show an info button for D&D skill options. */
  showSkillInfo?: boolean
  /**
   * When true, show an info button for options that have a description
   * (opens an overlay instead of clamping text onto the card).
   */
  showOptionInfo?: boolean
  /** Compact builder layout: denser grid, no skill info buttons. */
  layout?: "default" | "compact" | "visual"
  /** Custom skill name → game-icons slug (from compendium custom abilities). */
  skillIconByName?: Record<string, string>
  /** When true, let the player add custom free-text entries (e.g. user-defined languages). */
  allowCustom?: boolean
  /** Placeholder for the custom-entry input. */
  customPlaceholder?: string
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

const GENERAL_TALENT_LABEL = "General Talent"

/** Group labeled options under headers; disciplines A–Z, General Talent last. */
function groupOptionsBySource(options: ChoiceOption[]): { label: string | null; options: ChoiceOption[] }[] {
  const hasSourceLabels = options.some((option) => option.sourceLabel?.trim())
  if (!hasSourceLabels) {
    return [{ label: null, options }]
  }

  const byLabel = new Map<string, ChoiceOption[]>()
  for (const option of options) {
    const label = option.sourceLabel?.trim() || GENERAL_TALENT_LABEL
    const list = byLabel.get(label) ?? []
    list.push(option)
    byLabel.set(label, list)
  }

  const labels = [...byLabel.keys()].sort((a, b) => {
    if (a === GENERAL_TALENT_LABEL) return 1
    if (b === GENERAL_TALENT_LABEL) return -1
    return a.localeCompare(b)
  })

  return labels.map((label) => ({
    label,
    options: (byLabel.get(label) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
  }))
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
  lockedOptions = [],
  lockedLabel = "Granted",
  showSkillInfo = false,
  showOptionInfo = false,
  layout = "default",
  allowCustom = false,
  customPlaceholder = "Add a custom entry...",
  skillIconByName = {},
}: MultiSelectChoicesProps) {
  const unavailable = new Set(unavailableOptions)
  const lockedKeys = new Set(lockedOptions.map(normalizeKey).filter(Boolean))
  const isLockedName = (name: string) => lockedKeys.has(normalizeKey(name))
  const compact = layout === "compact"
  const visual = layout === "visual"
  const showSkillInfoButtons = showSkillInfo && !compact
  const showInfoButtons = showOptionInfo || showSkillInfoButtons
  const showSkillIcons = visual && showSkillInfo
  const [infoOption, setInfoOption] = useState<ChoiceOption | null>(null)
  const [customDraft, setCustomDraft] = useState("")
  const pendingScrollY = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (pendingScrollY.current == null) return
    window.scrollTo(0, pendingScrollY.current)
    pendingScrollY.current = null
  })

  const emitChange = (next: string[]) => {
    pendingScrollY.current = window.scrollY
    onChange(next.filter((name) => !isLockedName(name)))
  }

  // Selected entries that aren't in the option list are custom additions; show them too.
  // Locked grants also appear even when absent from the option catalog.
  const optionNames = new Set(options.map((option) => option.name))
  const displayOptions: ChoiceOption[] = [
    ...options,
    ...lockedOptions
      .filter((name) => !optionNames.has(name))
      .map((name) => ({ name })),
    ...selected
      .filter((name) => !optionNames.has(name) && !isLockedName(name))
      .map((name) => ({ name })),
  ]

  const optionGroups = groupOptionsBySource(displayOptions)

  const freeSelected = selected.filter((name) => !isLockedName(name))

  const toggle = (name: string) => {
    if (isLockedName(name)) return
    if (freeSelected.includes(name)) {
      emitChange(freeSelected.filter((entry) => entry !== name))
      return
    }
    if (unavailable.has(name) || freeSelected.length >= maxCount) return
    emitChange([...freeSelected, name])
  }

  const addCustom = () => {
    const trimmed = customDraft.trim()
    if (!trimmed || freeSelected.includes(trimmed) || freeSelected.length >= maxCount) return
    emitChange([...freeSelected, trimmed])
    setCustomDraft("")
  }

  const infoDescription =
    infoOption == null
      ? null
      : infoOption.description?.trim() ||
        (showSkillInfoButtons ? getSkillDescription(infoOption.name) : null)

  const gridClass = compact
    ? "grid grid-cols-1 sm:grid-cols-3 gap-1.5"
    : "grid grid-cols-1 sm:grid-cols-3 gap-2"

  const renderOption = (option: ChoiceOption) => {
    const locked = isLockedName(option.name)
    const isSelected = locked || freeSelected.includes(option.name)
    const isTakenElsewhere = !isSelected && unavailable.has(option.name)
    const isDisabled =
      locked || isTakenElsewhere || (!isSelected && freeSelected.length >= maxCount)
    const skillDescription = showSkillInfoButtons ? getSkillDescription(option.name) : null
    const hasOptionDescription = Boolean(option.description?.trim())
    const canShowInfo = showInfoButtons && (hasOptionDescription || Boolean(skillDescription))
    const iconSlug = showSkillIcons ? skillIconSlug(option.name, skillIconByName) : null
    const prereq = option.prerequisite?.trim() || null

    return (
      <div
        key={option.name}
        className={compact && !canShowInfo ? undefined : "flex items-stretch gap-1"}
      >
        <button
          type="button"
          disabled={isDisabled && !isSelected}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggle(option.name)}
          className={`${compact ? "w-full px-2.5 py-1.5" : visual ? "flex-1 p-2.5" : "flex-1 p-2"} rounded-lg border-2 text-left transition-all ${
            isSelected
              ? accentClass
              : isTakenElsewhere || (!isSelected && freeSelected.length >= maxCount)
                ? "border-border bg-card opacity-50 cursor-not-allowed"
                : "border-border bg-card hover:border-primary/40"
          } ${locked ? "cursor-default" : ""}`}
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
          {prereq ? (
            <p className={`text-muted-foreground mt-0.5 ${compact ? "text-[11px]" : "text-xs"}`}>
              Prereq: {prereq}
            </p>
          ) : null}
          {locked ? (
            <p className={`text-muted-foreground mt-0.5 ${compact ? "text-[11px]" : "text-xs"}`}>
              {lockedLabel}
            </p>
          ) : null}
          {isTakenElsewhere && (
            <p className={`text-muted-foreground mt-0.5 ${compact ? "text-[11px]" : "text-xs"}`}>
              Already chosen
            </p>
          )}
        </button>
        {canShowInfo ? (
          <button
            type="button"
            aria-label={`About ${option.name}`}
            onClick={() => setInfoOption(option)}
            className={`shrink-0 self-center rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors ${
              compact ? "p-1.5" : "p-2"
            }`}
          >
            <Info className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-bold text-sm text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {freeSelected.length}/{maxCount} selected
          </span>
        </div>
        {hint && <p className="text-xs text-muted-foreground mb-3">{hint}</p>}
        {displayOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-3">
            No choices available yet. Import the related custom abilities (for example Psion
            disciplines and talents) into the compendium, then return here.
          </p>
        ) : null}
        {optionGroups.length === 1 && optionGroups[0]?.label == null ? (
          <div className={gridClass}>{displayOptions.map(renderOption)}</div>
        ) : (
          <div className="space-y-4">
            {optionGroups.map((group) => (
              <div key={group.label ?? "ungrouped"}>
                {group.label ? (
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                    {group.label}
                  </p>
                ) : null}
                <div className={gridClass}>{group.options.map(renderOption)}</div>
              </div>
            ))}
          </div>
        )}
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
              disabled={freeSelected.length >= maxCount}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customDraft.trim() || freeSelected.length >= maxCount}
              className="px-3 py-2 rounded-lg border-2 border-border bg-card text-sm font-semibold hover:border-primary/40 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {infoOption && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setInfoOption(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative max-h-[80vh] max-w-lg w-full overflow-y-auto rounded-xl border-2 border-primary/50 bg-card p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setInfoOption(null)}
                className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                {showSkillInfoButtons && getSkillDescription(infoOption.name) && !infoOption.description?.trim()
                  ? "Skill"
                  : "Details"}
              </p>
              <h4 className="font-serif text-xl font-black text-foreground pr-8">
                {infoOption.name}
              </h4>
              {infoOption.sourceLabel?.trim() ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {infoOption.sourceLabel.trim()}
                </p>
              ) : null}
              {infoOption.prerequisite?.trim() ? (
                <p className={`${infoOption.sourceLabel?.trim() ? "mt-1" : "mt-2"} text-xs text-muted-foreground`}>
                  Prerequisite: {infoOption.prerequisite}
                </p>
              ) : null}
              <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {infoDescription?.trim() ? (
                  <RichTextContent html={infoDescription} />
                ) : (
                  <p>No description available.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
