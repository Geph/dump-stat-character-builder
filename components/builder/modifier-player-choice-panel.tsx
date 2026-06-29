"use client"

import { useState } from "react"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import {
  modifierPlayerChoiceSlotsForSource,
  spellOptionsForModifierSlot,
  type ModifierPlayerChoiceSlot,
} from "@/lib/builder/modifier-player-choices"
import type { Spell } from "@/lib/types"

type ModifierPlayerChoicePanelProps = {
  sourceKey: string
  sourceLabel: string
  slots: ModifierPlayerChoiceSlot[]
  picks: Record<string, string[]>
  onChange: (slotKey: string, selected: string[]) => void
  spells: Spell[]
  accentClass?: string
}

function SpellGrantPicker({
  slot,
  spells,
  picks,
  onChange,
  accentClass,
}: {
  slot: ModifierPlayerChoiceSlot
  spells: Spell[]
  picks: Record<string, string[]>
  onChange: (slotKey: string, selected: string[]) => void
  accentClass: string
}) {
  const listClass = slot.spellListSlotKey ? picks[slot.spellListSlotKey]?.[0] : null
  const availableSpells = spellOptionsForModifierSlot(slot, spells, picks)
  const selectedIds = picks[slot.slotKey] ?? []
  const [filter, setFilter] = useState("")

  if (slot.requiresSpellListPick && !listClass) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
        Choose a spell list above before selecting spells.
      </div>
    )
  }

  const filtered = availableSpells.filter((spell) =>
    spell.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const toggle = (spellId: string) => {
    if (selectedIds.includes(spellId)) {
      onChange(
        slot.slotKey,
        selectedIds.filter((id) => id !== spellId),
      )
      return
    }
    if (selectedIds.length >= slot.maxCount) return
    onChange(slot.slotKey, [...selectedIds, spellId])
  }

  return (
    <div className="p-4 bg-muted/40 rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-bold text-sm text-foreground">{slot.label}</h3>
        <span className="text-xs text-muted-foreground">
          {selectedIds.length}/{slot.maxCount} selected
        </span>
      </div>
      {listClass && (
        <p className="text-xs text-muted-foreground mb-3">
          {listClass} list · {slot.spellLevel === 0 ? "Cantrips" : `Level ${slot.spellLevel}`}
        </p>
      )}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter spells..."
        className="w-full mb-3 px-3 py-2 bg-background border border-border rounded-lg text-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">No spells match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {filtered.map((spell) => {
            const isSelected = selectedIds.includes(spell.id)
            const isDisabled = !isSelected && selectedIds.length >= slot.maxCount
            return (
              <button
                key={spell.id}
                type="button"
                disabled={isDisabled}
                onClick={() => toggle(spell.id)}
                className={`p-2 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? accentClass
                    : isDisabled
                      ? "border-border bg-card opacity-50 cursor-not-allowed"
                      : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="font-semibold text-sm text-foreground">{spell.name}</p>
                {spell.school && (
                  <p className="text-xs text-muted-foreground mt-0.5">{spell.school}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ModifierPlayerChoicePanel({
  sourceKey,
  sourceLabel,
  slots,
  picks,
  onChange,
  spells,
  accentClass = "border-primary bg-primary/10",
}: ModifierPlayerChoicePanelProps) {
  const relevant = modifierPlayerChoiceSlotsForSource(slots, sourceKey)
  if (relevant.length === 0) return null

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {sourceLabel} choices
      </p>
      {relevant.map((slot) => {
        if (slot.kind === "spell") {
          return (
            <SpellGrantPicker
              key={slot.slotKey}
              slot={slot}
              spells={spells}
              picks={picks}
              onChange={onChange}
              accentClass={accentClass}
            />
          )
        }

        return (
          <MultiSelectChoices
            key={slot.slotKey}
            title={slot.label}
            hint={
              slot.kind === "skill_or_tool"
                ? `Choose ${slot.maxCount} total (any mix of skills and tools)`
                : `Choose ${slot.maxCount}`
            }
            options={slot.options ?? []}
            maxCount={slot.maxCount}
            selected={picks[slot.slotKey] ?? []}
            onChange={(selected) => onChange(slot.slotKey, selected)}
            accentClass={accentClass}
            showSkillInfo={slot.kind === "skill" || slot.kind === "skill_or_tool"}
            allowCustom={slot.allowCustom ?? false}
            customPlaceholder={slot.kind === "language" ? "Add a custom language..." : undefined}
          />
        )
      })}
    </div>
  )
}
