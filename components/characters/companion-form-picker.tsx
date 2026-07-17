"use client"

import type { CompanionFormGroup } from "@/lib/character/resolve-companions"

/**
 * Picker for selectable companion form groups: Wild Shape known Beasts
 * (multi-select up to the tier budget) and Find Familiar forms (single pick).
 */
export function CompanionFormPicker({
  group,
  onChange,
}: {
  group: CompanionFormGroup
  onChange: (formNames: string[]) => void
}) {
  if (group.kind === "familiar") {
    const selected = group.selected[0] ?? ""
    return (
      <div className="bg-card rounded-xl border border-border p-3 space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-muted-foreground">
          {group.featureName} — Familiar Form
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Choose the animal form your familiar takes. It keeps that form&apos;s stat block but is a
          Celestial, Fey, or Fiend (your choice).
        </p>
        <select
          value={selected}
          onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
          className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground"
        >
          <option value="">Generic familiar (no form chosen)</option>
          {group.options.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name}
              {option.cr ? ` (CR ${option.cr})` : ""}
            </option>
          ))}
        </select>
      </div>
    )
  }

  const selectedSet = new Set(group.selected.map((name) => name.toLowerCase()))
  const atBudget = group.maxKnown != null && group.selected.length >= group.maxKnown

  const toggle = (name: string) => {
    const key = name.toLowerCase()
    if (selectedSet.has(key)) {
      onChange(group.selected.filter((entry) => entry.toLowerCase() !== key))
    } else if (!atBudget) {
      onChange([...group.selected, name])
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-1.5">
      <p className="text-[10px] uppercase font-bold text-muted-foreground">
        {group.featureName} — Known Beast Forms
        {group.maxKnown != null ? ` (${group.selected.length}/${group.maxKnown})` : ""}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Eligible Beasts from your compendium, capped by your {group.className} level. After a Long
        Rest you can swap one known form for another.
      </p>
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
        {group.options.map((option) => {
          const active = selectedSet.has(option.name.toLowerCase())
          const disabled = !active && atBudget
          return (
            <button
              key={option.name}
              type="button"
              onClick={() => toggle(option.name)}
              disabled={disabled}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : disabled
                    ? "bg-muted text-muted-foreground/50 border-border cursor-not-allowed"
                    : "bg-muted text-foreground border-border hover:border-primary"
              }`}
            >
              {option.name}
              {option.cr ? <span className="font-normal opacity-70"> CR {option.cr}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
