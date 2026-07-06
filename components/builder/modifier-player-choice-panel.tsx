"use client"

import { useEffect, useState } from "react"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { ToolGroupedChoices } from "@/components/builder/tool-grouped-choices"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { useFeatSpellGrantPickerPageSize, useIsSmPickerScreen } from "@/hooks/use-picker-page-size"
import { paginateList } from "@/lib/builder/picker-pagination"
import {
  modifierPlayerChoiceSlotsForSource,
  optionsForExpertiseSlot,
  optionsForProficiencyGrantSlot,
  spellOptionsForModifierSlot,
  type ModifierPlayerChoiceKind,
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
  /** When set, only render slots whose kind is in this list. */
  kinds?: ModifierPlayerChoiceKind[]
  /** When set, exclude slots with these kinds. */
  excludeKinds?: ModifierPlayerChoiceKind[]
  /** Skills/tools already chosen elsewhere in the build, hidden from skill choices here. */
  unavailableOptions?: string[]
  /** Compact builder layout: denser grid, no skill info buttons. */
  choiceLayout?: "default" | "compact"
  /** Visual builder layout for skill pickers (icons + info buttons). */
  skillPickerLayout?: "default" | "compact" | "visual"
  /** Custom skill name → game-icons slug. */
  skillIconByName?: Record<string, string>
  /** Skills the character is already proficient in (for Expertise pickers). */
  proficientSkills?: string[]
  /** Tools the character is already proficient in (for Expertise skill-or-tool pickers). */
  proficientTools?: string[]
  /** Skills that already have Expertise from earlier features. */
  existingExpertiseSkills?: string[]
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
  const [page, setPage] = useState(0)
  const isSmScreen = useIsSmPickerScreen()
  const mobilePageSize = useFeatSpellGrantPickerPageSize()

  useEffect(() => {
    setPage(0)
  }, [filter, listClass, slot.slotKey])

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
  const pageSize = isSmScreen ? Math.max(filtered.length, 1) : mobilePageSize
  const { items: visibleSpells, pageCount, safePage } = paginateList(filtered, page, pageSize)

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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-sm:max-h-none sm:max-h-48 sm:overflow-y-auto">
            {visibleSpells.map((spell) => {
              const isSelected = selectedIds.includes(spell.id)
              const isDisabled = !isSelected && selectedIds.length >= slot.maxCount
              return (
                <button
                  key={spell.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggle(spell.id)}
                  className={`p-2 rounded-lg border-2 text-left transition-all max-sm:min-h-[3.25rem] max-sm:p-3 ${
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
          <PickerGridPagination
            page={safePage}
            pageCount={pageCount}
            onPrevious={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            previousLabel="Previous spells"
            nextLabel="More spells"
            className="max-sm:mt-3"
          />
        </>
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
  kinds,
  excludeKinds,
  unavailableOptions = [],
  choiceLayout = "default",
  skillPickerLayout = "compact",
  skillIconByName = {},
  proficientSkills = [],
  proficientTools = [],
  existingExpertiseSkills = [],
}: ModifierPlayerChoicePanelProps) {
  const relevant = modifierPlayerChoiceSlotsForSource(slots, sourceKey).filter((slot) => {
    if (kinds?.length && !kinds.includes(slot.kind)) return false
    if (excludeKinds?.includes(slot.kind)) return false
    return true
  })
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

        const isSkillKind = slot.kind === "skill" || slot.kind === "skill_or_tool"
        const useToolGroups =
          slot.kind === "tool" &&
          (slot.toolChoicePool === "artisans" ||
            slot.toolChoicePool === "musical" ||
            slot.toolChoicePool === "gaming")
        const currentSelection = picks[slot.slotKey] ?? []
        const displayOptions = slot.grantsExpertise
          ? optionsForExpertiseSlot(slot, {
              proficientSkills,
              proficientTools,
              existingExpertiseSkills,
              currentSelection,
            })
          : isSkillKind
            ? optionsForProficiencyGrantSlot(slot, {
                proficientSkills,
                proficientTools,
                currentSelection,
              })
            : (slot.options ?? [])
        const expertiseHint =
          slot.kind === "skill_or_tool" && slot.grantsExpertise
            ? `Choose ${slot.maxCount} total (proficient skills or tools only)`
            : slot.grantsExpertise
              ? `Choose ${slot.maxCount} (Expertise — pick skills you're proficient in)`
              : `Choose ${slot.maxCount}`
        if (useToolGroups) {
          return (
            <div key={slot.slotKey} className="mt-4 p-4 bg-muted/40 rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm text-foreground">{slot.label}</h3>
                <span className="text-xs text-muted-foreground">
                  {currentSelection.length}/{slot.maxCount} selected
                </span>
              </div>
              <ToolGroupedChoices
                options={displayOptions}
                toolChoicePool={slot.toolChoicePool}
                maxCount={slot.maxCount}
                selected={currentSelection}
                onChange={(selected) => onChange(slot.slotKey, selected)}
                accentClass={accentClass}
                unavailableOptions={unavailableOptions}
                compact={choiceLayout === "compact"}
              />
            </div>
          )
        }

        return (
          <MultiSelectChoices
            key={slot.slotKey}
            title={slot.label}
            hint={
              slot.kind === "skill_or_tool" && !slot.grantsExpertise
                ? `Choose ${slot.maxCount} total (any mix of skills and tools)`
                : expertiseHint
            }
            options={displayOptions}
            maxCount={slot.maxCount}
            selected={currentSelection}
            onChange={(selected) => onChange(slot.slotKey, selected)}
            accentClass={accentClass}
            showSkillInfo={isSkillKind}
            layout={isSkillKind ? skillPickerLayout : choiceLayout}
            skillIconByName={isSkillKind ? skillIconByName : undefined}
            unavailableOptions={isSkillKind && !slot.grantsExpertise ? unavailableOptions : []}
            allowCustom={slot.allowCustom ?? false}
            customPlaceholder={slot.kind === "language" ? "Add a custom language..." : undefined}
          />
        )
      })}
    </div>
  )
}
