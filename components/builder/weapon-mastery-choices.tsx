"use client"

import { useState } from "react"
import { Check, Info, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { WEAPON_MASTERY_DESCRIPTIONS } from "@/lib/compendium/weapon-mastery"
import { weaponIconSlug } from "@/lib/compendium/weapon-icons"
import { GameIcon } from "@/components/game-icon-picker"

type ChoiceOption = { name: string; description?: string }

type WeaponMasteryChoicesProps = {
  title: string
  hint?: string
  options: ChoiceOption[]
  maxCount: number
  selected: string[]
  onChange: (selected: string[]) => void
  unavailableOptions?: string[]
  layout?: "visual" | "compact"
}

/** Extract the mastery property name from an option description (e.g. "Topple — ..."). */
function masteryNameFromDescription(description?: string): string | null {
  if (!description) return null
  const [head] = description.split("—")
  const trimmed = head.trim()
  return trimmed || null
}

export function WeaponMasteryChoices({
  title,
  hint,
  options,
  maxCount,
  selected,
  onChange,
  unavailableOptions = [],
  layout = "compact",
}: WeaponMasteryChoicesProps) {
  const [showInfo, setShowInfo] = useState(false)
  const unavailable = new Set(unavailableOptions)

  const masteryByWeapon = new Map<string, string | null>(
    options.map((option) => [option.name, masteryNameFromDescription(option.description)]),
  )

  // Render exactly maxCount slots; map the compact `selected` array onto them in order.
  const slotValues: string[] = Array.from({ length: maxCount }, (_, i) => selected[i] ?? "")

  const setSlot = (index: number, value: string) => {
    const next = [...slotValues]
    next[index] = value
    onChange(next.filter((entry) => entry.length > 0))
  }

  const selectedSet = new Set(selected)
  const toggleWeapon = (name: string) => {
    if (selectedSet.has(name)) {
      onChange(selected.filter((entry) => entry !== name))
      return
    }
    if (unavailable.has(name) || selected.length >= maxCount) return
    onChange([...selected, name])
  }

  const masteriesPresent = Array.from(
    new Set(
      options
        .map((option) => masteryByWeapon.get(option.name))
        .filter((name): name is string => Boolean(name)),
    ),
  ).sort()

  return (
    <>
      <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-foreground">{title}</h3>
            <button
              type="button"
              aria-label="About weapon mastery properties"
              onClick={() => setShowInfo(true)}
              className="shrink-0 rounded-full border border-border bg-card p-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {selected.length}/{maxCount} selected
          </span>
        </div>
        {hint && <p className="text-xs text-muted-foreground mb-3">{hint}</p>}

        {layout === "visual" ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {options.map((option) => {
                const isSelected = selectedSet.has(option.name)
                const optionMastery = masteryByWeapon.get(option.name) ?? null
                const disabled =
                  !isSelected && (unavailable.has(option.name) || selected.length >= maxCount)
                const taken = unavailable.has(option.name)
                return (
                  <button
                    key={option.name}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleWeapon(option.name)}
                    title={taken ? "Already chosen elsewhere" : option.name}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : disabled
                          ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                          : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <GameIcon
                      name={weaponIconSlug(option.name)}
                      className="h-8 w-8 text-foreground"
                    />
                    <span className="text-xs font-semibold leading-tight text-foreground">
                      {option.name}
                    </span>
                    {optionMastery && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                        {optionMastery}
                      </span>
                    )}
                    {taken && (
                      <span className="text-[10px] text-muted-foreground">taken</span>
                    )}
                  </button>
                )
              })}
            </div>
            {selected.length > 0 && (
              <div className="mt-3 space-y-1">
                {selected.map((name) => {
                  const mastery = masteryByWeapon.get(name) ?? null
                  const rule = mastery ? WEAPON_MASTERY_DESCRIPTIONS[mastery] : null
                  if (!rule) return null
                  return (
                    <p key={name} className="text-xs text-muted-foreground leading-snug">
                      <span className="font-semibold text-foreground">{name} — {mastery}:</span>{" "}
                      {rule}
                    </p>
                  )
                })}
              </div>
            )}
          </>
        ) : (
        <div className="space-y-2">
          {slotValues.map((value, index) => {
            const chosenElsewhere = new Set(
              slotValues.filter((_, i) => i !== index).filter(Boolean),
            )
            const mastery = value ? masteryByWeapon.get(value) ?? null : null
            const masteryRule = mastery ? WEAPON_MASTERY_DESCRIPTIONS[mastery] : null
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                    {index + 1}.
                  </span>
                  <select
                    value={value}
                    onChange={(e) => setSlot(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">— Choose a weapon —</option>
                    {options.map((option) => {
                      const optionMastery = masteryByWeapon.get(option.name)
                      const disabled =
                        option.name !== value &&
                        (chosenElsewhere.has(option.name) || unavailable.has(option.name))
                      return (
                        <option key={option.name} value={option.name} disabled={disabled}>
                          {option.name}
                          {optionMastery ? ` (${optionMastery})` : ""}
                          {disabled ? " — taken" : ""}
                        </option>
                      )
                    })}
                  </select>
                </div>
                {masteryRule && (
                  <p className="pl-7 text-xs text-muted-foreground leading-snug">
                    <span className="font-semibold text-foreground">{mastery}:</span> {masteryRule}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        )}
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border-2 border-primary/50 bg-card p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                Weapon Mastery
              </p>
              <h4 className="font-serif text-xl font-black text-foreground pr-8">
                Mastery Properties
              </h4>
              <dl className="mt-3 space-y-3">
                {(masteriesPresent.length ? masteriesPresent : Object.keys(WEAPON_MASTERY_DESCRIPTIONS)).map(
                  (name) => (
                    <div key={name}>
                      <dt className="text-sm font-bold text-foreground">{name}</dt>
                      <dd className="text-sm text-muted-foreground leading-relaxed">
                        {WEAPON_MASTERY_DESCRIPTIONS[name] ?? "No description available."}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
