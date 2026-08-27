"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Info, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import { hasWeaponProperty } from "@/lib/compendium/combat-stats"
import { buildWeaponMasteryDescriptionsLookup } from "@/lib/compendium/weapon-mastery"
import { weaponIconSlug } from "@/lib/compendium/weapon-icons"
import { GameIcon } from "@/components/game-icon-picker"
import type { Equipment } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  /** Catalog-backed mastery property rules (falls back to SRD defaults when omitted). */
  masteryDescriptions?: Record<string, string>
  /** Live compendium weapons used by visual category/property filters. */
  equipmentCatalog?: Equipment[]
}

type WeaponFilter =
  | "all"
  | "simple"
  | "martial"
  | "melee"
  | "ranged"
  | "finesse"
  | "heavy"
  | "reach"

const PROPERTY_FILTERS = new Set<WeaponFilter>(["finesse", "heavy", "reach"])

const SEED_WEAPONS = equipmentSeed as Equipment[]

const WEAPON_FILTER_OPTIONS: { id: WeaponFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "simple", label: "Simple" },
  { id: "martial", label: "Martial" },
  { id: "melee", label: "Melee" },
  { id: "ranged", label: "Ranged" },
  { id: "finesse", label: "Finesse" },
  { id: "heavy", label: "Heavy" },
  { id: "reach", label: "Reach" },
]

function masteryNameFromDescription(description?: string): string | null {
  if (!description) return null
  const [head] = description.split("—")
  const trimmed = head.trim()
  return trimmed || null
}

function weaponByName(name: string, equipmentCatalog: Equipment[]): Equipment | undefined {
  const needle = name.trim().toLowerCase()
  return (
    equipmentCatalog.find((weapon) => weapon.name.trim().toLowerCase() === needle) ??
    SEED_WEAPONS.find((weapon) => weapon.name.trim().toLowerCase() === needle)
  )
}

function matchesWeaponFilter(
  name: string,
  filter: WeaponFilter,
  equipmentCatalog: Equipment[],
): boolean {
  if (filter === "all") return true
  const weapon = weaponByName(name, equipmentCatalog)
  if (PROPERTY_FILTERS.has(filter)) {
    return weapon ? hasWeaponProperty(weapon, filter) : false
  }
  return (weapon?.subcategory ?? "").toLowerCase().includes(filter)
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
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
  masteryDescriptions,
  equipmentCatalog = [],
}: WeaponMasteryChoicesProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("all")
  const unavailable = new Set(unavailableOptions)
  const masteryRules = masteryDescriptions ?? buildWeaponMasteryDescriptionsLookup()

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const masteryByWeapon = new Map<string, string | null>(
    options.map((option) => [option.name, masteryNameFromDescription(option.description)]),
  )

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

  const filteredOptions = useMemo(() => {
    return options.filter((option) => {
      if (selected.includes(option.name)) return true
      return matchesWeaponFilter(option.name, weaponFilter, equipmentCatalog)
    })
  }, [options, weaponFilter, selected, equipmentCatalog])

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
            <div className="mb-3 flex flex-wrap justify-end gap-1.5" role="group" aria-label="Weapon filter">
              {WEAPON_FILTER_OPTIONS.map(({ id, label }) => (
                <FilterChip
                  key={id}
                  label={label}
                  active={weaponFilter === id}
                  onClick={() => setWeaponFilter(id)}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {filteredOptions.map((option) => {
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
            {filteredOptions.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No weapons match these filters.
              </p>
            ) : null}
            {selected.length > 0 && (
              <div className="mt-3 space-y-1">
                {selected.map((name) => {
                  const mastery = masteryByWeapon.get(name) ?? null
                  const rule = mastery ? masteryRules[mastery] ?? null : null
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {slotValues.map((value, index) => {
            const chosenElsewhere = new Set(
              slotValues.filter((_, i) => i !== index).filter(Boolean),
            )
            return (
              <div key={index} className="flex items-center gap-2">
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
            )
          })}
        </div>
        )}
      </div>

      {portalReady
        ? createPortal(
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
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
                      {(masteriesPresent.length ? masteriesPresent : Object.keys(masteryRules)).map(
                        (name) => (
                          <div key={name}>
                            <dt className="text-sm font-bold text-foreground">{name}</dt>
                            <dd className="text-sm text-muted-foreground leading-relaxed">
                              {masteryRules[name] ?? "No description available."}
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}
