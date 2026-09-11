"use client"

import { crToNumber, formatChallengeRating } from "@/lib/character/companion-form-options"
import type { CompanionFormGroup } from "@/lib/character/resolve-companions"

function selectedCrTotal(group: CompanionFormGroup): number {
  return group.selected.reduce((sum, name) => {
    const option = group.options.find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    return sum + (crToNumber(option?.cr) ?? 0)
  }, 0)
}

/**
 * Picker for selectable companion form groups: Wild Shape known Beasts
 * (multi-select up to the tier budget), Find Familiar forms (single pick),
 * and grant_creature choices (single or multi, optional combined CR cap).
 */
export function CompanionFormPicker({
  group,
  onChange,
  restContext = false,
}: {
  group: CompanionFormGroup
  onChange: (formNames: string[]) => void
  /** Rest overlay copy — the ritual happens when you finish the rest. */
  restContext?: boolean
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

  if (group.kind === "choice") {
    const title = group.pickerTitle?.trim() || group.featureName
    const maxKnown = group.maxKnown ?? 1
    const multi = maxKnown > 1
    const usedCr = selectedCrTotal(group)
    const remainingCr =
      group.maxCombinedCr != null ? Math.max(0, group.maxCombinedCr - usedCr) : null
    const heading = restContext ? title : `${title} — ${multi ? "Choose" : "Choose one"}`

    if (!multi) {
      return (
        <div className="bg-card rounded-xl border border-border p-3 space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">{heading}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {restContext
              ? "Choose a creature now. It appears on the Companions tab."
              : /^cohort$/i.test(group.featureName)
                ? "Initiate one Cohort. Only the chosen companion appears on this tab."
                : group.maxCombinedCr != null
                  ? `Choose one creature up to CR ${formatChallengeRating(group.maxCombinedCr)}.`
                  : "Choose the creature that appears on this tab."}
          </p>
          <select
            value={group.selected[0] ?? ""}
            onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
            className="w-full text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground"
          >
            <option value="">Choose a creature…</option>
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

    const countByName = new Map<string, number>()
    for (const name of group.selected) {
      const key = name.toLowerCase()
      countByName.set(key, (countByName.get(key) ?? 0) + 1)
    }
    const atCount = group.selected.length >= maxKnown

    const add = (name: string, optionCr: number | null) => {
      if (atCount) return
      if (remainingCr != null && optionCr != null && optionCr > remainingCr + 1e-6) return
      onChange([...group.selected, name])
    }

    const removeOne = (name: string) => {
      let idx = -1
      for (let i = group.selected.length - 1; i >= 0; i -= 1) {
        if (group.selected[i].toLowerCase() === name.toLowerCase()) {
          idx = i
          break
        }
      }
      if (idx < 0) return
      onChange(group.selected.filter((_, index) => index !== idx))
    }

    return (
      <div className="bg-card rounded-xl border border-border p-3 space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-muted-foreground">
          {heading}
          {` (${group.selected.length}/${maxKnown})`}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {restContext
            ? "Choose creatures now. They appear on the Companions tab."
            : "Choose which creatures appear on this tab."}{" "}
          You can pick the same creature more than once.
          {group.maxCombinedCr != null
            ? ` Combined CR up to ${formatChallengeRating(group.maxCombinedCr)}${
                remainingCr != null ? ` · ${formatChallengeRating(remainingCr)} remaining` : ""
              }.`
            : ""}
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
          {group.options.map((option) => {
            const count = countByName.get(option.name.toLowerCase()) ?? 0
            const optionCr = crToNumber(option.cr)
            const overCr = remainingCr != null && optionCr != null && optionCr > remainingCr + 1e-6
            const canAdd = !atCount && !overCr
            const active = count > 0
            return (
              <div
                key={option.name}
                className={`inline-flex items-stretch rounded-lg border text-[11px] font-semibold overflow-hidden ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-foreground border-border"
                }`}
              >
                {count > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeOne(option.name)}
                    aria-label={`Remove one ${option.name}`}
                    className="px-1.5 hover:bg-black/10"
                  >
                    −
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => add(option.name, optionCr)}
                  disabled={!canAdd}
                  className={`px-2 py-1 ${
                    canAdd ? "hover:bg-black/10" : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {option.name}
                  {option.cr ? <span className="font-normal opacity-70"> CR {option.cr}</span> : null}
                  {count > 0 ? <span className="font-normal opacity-80"> ×{count}</span> : null}
                </button>
              </div>
            )
          })}
        </div>
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
