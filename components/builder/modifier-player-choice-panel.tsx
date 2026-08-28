"use client"

import { useEffect, useMemo, useState } from "react"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { ToolGroupedChoices } from "@/components/builder/tool-grouped-choices"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { useFeatSpellGrantPickerPageSize } from "@/hooks/use-picker-page-size"
import { paginateList } from "@/lib/builder/picker-pagination"
import { filterSpellsBySchool, uniqueSpellSchools } from "@/lib/builder/spell-grant-filters"
import { builderChoiceTargetId } from "@/lib/builder/proceed-blockers"
import {
  filterMagicInitiateAbilitySlotOptions,
  filterMagicInitiateSpellListSlotOptions,
  isMagicInitiateSourceLabel,
  normalizeMagicInitiateSpellList,
  takenMagicInitiateSpellLists,
  unavailableMagicInitiateAbilityNames,
  unavailableMagicInitiateSpellListNames,
} from "@/lib/builder/magic-initiate"
import {
  modifierPlayerChoiceSlotsForSource,
  optionsForExpertiseSlot,
  optionsForProficiencyGrantSlot,
  spellOptionsForModifierSlot,
  type ModifierPlayerChoiceKind,
  type ModifierPlayerChoiceSlot,
} from "@/lib/builder/modifier-player-choices"
import type { Spell } from "@/lib/types"
import { SearchBox } from "@/components/search/search-box"
import { rankSearchResults, searchItems } from "@/lib/search/ranked-search"
import { spellAliasLookupKeys } from "@/lib/compendium/spell-name-aliases"
import { cn } from "@/lib/utils"

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
  /** Languages the character already knows (hidden from language pickers). */
  knownLanguages?: string[]
  /** Skills that already have Expertise from earlier features. */
  existingExpertiseSkills?: string[]
  /**
   * When false, skill / skill-or-tool pickers omit the per-option info buttons
   * (level-up uses this; the character builder keeps the default).
   */
  showSkillInfo?: boolean
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
  const [schoolFilter, setSchoolFilter] = useState("all")
  const [page, setPage] = useState(0)
  const pageSize = useFeatSpellGrantPickerPageSize()

  const schoolOptions = useMemo(() => uniqueSpellSchools(availableSpells), [availableSpells])

  useEffect(() => {
    setPage(0)
  }, [filter, schoolFilter, listClass, slot.slotKey, pageSize])

  useEffect(() => {
    if (schoolFilter !== "all" && !schoolOptions.includes(schoolFilter)) {
      setSchoolFilter("all")
    }
  }, [schoolFilter, schoolOptions])

  if (slot.requiresSpellListPick && !listClass) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
        Choose a spell list above before selecting spells.
      </div>
    )
  }

  const schoolScoped = filterSpellsBySchool(availableSpells, schoolFilter)
  const filtered = searchItems(schoolScoped, filter, {
    name: (spell) => spell.name,
    aliases: (spell) => spellAliasLookupKeys(spell.name),
    fields: [
      { name: "school", value: (spell) => spell.school, weight: 1.3 },
      { name: "classes", value: (spell) => spell.classes, weight: 1.1 },
    ],
  })
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

  const filterSelectClass =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
  const filterLabelClass =
    "text-[10px] font-bold uppercase tracking-wide text-muted-foreground"

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
          {listClass} list ·{" "}
          {slot.spellLevel === 0
            ? "Cantrips"
            : slot.spellLevelIsMax
              ? `Up to level ${slot.spellLevel}`
              : `Level ${slot.spellLevel}`}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox
          value={filter}
          onChange={setFilter}
          suggestions={rankSearchResults(schoolScoped, filter, {
            name: (spell) => spell.name,
            aliases: (spell) => spellAliasLookupKeys(spell.name),
            fields: [{ name: "school", value: (spell) => spell.school, weight: 1.3 }],
            limit: 8,
          }).map((match) => ({
            id: match.item.id,
            label: match.item.name,
            detail: `${match.item.level === 0 ? "Cantrip" : `Level ${match.item.level}`} · ${match.item.school}`,
            item: match.item,
            matchKind: match.kind,
          }))}
          onSelect={(suggestion) => setFilter(suggestion.label)}
          scope={`modifier-spells:${slot.slotKey}`}
          placeholder="Filter spells…"
          ariaLabel={`Search ${slot.label} spells`}
          className="min-w-[10rem] flex-1 basis-[10rem]"
          inputClassName="border text-sm"
        />
        {schoolOptions.length > 1 ? (
          <div className="flex shrink-0 items-center gap-2">
            <label className={filterLabelClass} htmlFor={`spell-school-${slot.slotKey}`}>
              School
            </label>
            <select
              id={`spell-school-${slot.slotKey}`}
              value={schoolFilter}
              onChange={(event) => setSchoolFilter(event.target.value)}
              className={cn(filterSelectClass, "max-w-[12rem]")}
              aria-label={`Filter ${slot.label} spells by school`}
            >
              <option value="all">All schools</option>
              {schoolOptions.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">No spells match this filter.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
  knownLanguages = [],
  existingExpertiseSkills = [],
  showSkillInfo = true,
}: ModifierPlayerChoicePanelProps) {
  const relevant = modifierPlayerChoiceSlotsForSource(slots, sourceKey)
    .filter((slot) => {
      if (kinds?.length && !kinds.includes(slot.kind)) return false
      if (excludeKinds?.includes(slot.kind)) return false
      return true
    })
    .map((slot) => filterMagicInitiateSpellListSlotOptions(slot, slots, picks))
    .map((slot) => filterMagicInitiateAbilitySlotOptions(slot, slots, picks))

  useEffect(() => {
    for (const slot of relevant) {
      if (slot.kind !== "spell_list_class") continue
      if (!isMagicInitiateSourceLabel(slot.sourceLabel)) continue
      const selected = picks[slot.slotKey] ?? []
      if (!selected.length) continue
      const taken = takenMagicInitiateSpellLists(slots, picks, slot.slotKey)
      const next = selected.filter((name) => {
        const list = normalizeMagicInitiateSpellList(name)
        return list ? !taken.has(list.toLowerCase()) : true
      })
      if (next.length !== selected.length) onChange(slot.slotKey, next)
    }
  }, [relevant, picks, onChange, slots])

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

        const miSpellListUnavailable =
          slot.kind === "spell_list_class" && isMagicInitiateSourceLabel(slot.sourceLabel)
            ? unavailableMagicInitiateSpellListNames(slots, picks, slot.slotKey)
            : []
        const miAbilityUnavailable =
          slot.kind === "spellcasting_ability" && isMagicInitiateSourceLabel(slot.sourceLabel)
            ? unavailableMagicInitiateAbilityNames(slots, picks, slot.slotKey)
            : []

        if (
          slot.kind === "spell_list_class" &&
          isMagicInitiateSourceLabel(slot.sourceLabel) &&
          (slot.options?.length ?? 0) > 0 &&
          miSpellListUnavailable.length >= (slot.options?.length ?? 0) &&
          !(picks[slot.slotKey]?.length)
        ) {
          return (
            <p
              key={slot.slotKey}
              className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
            >
              No spell lists left for another Magic Initiate — each take needs a different class
              list (Cleric, Druid, or Wizard).
            </p>
          )
        }

        const isSkillKind = slot.kind === "skill" || slot.kind === "skill_or_tool"
        const isToolKind = slot.kind === "tool" || slot.kind === "skill_or_tool"
        const useToolGroups =
          slot.kind === "tool" &&
          (slot.toolChoicePool === "artisans" ||
            slot.toolChoicePool === "musical" ||
            slot.toolChoicePool === "gaming")
        const currentSelection = picks[slot.slotKey] ?? []
        const isLanguageKind = slot.kind === "language"
        const displayOptions = slot.grantsExpertise
          ? optionsForExpertiseSlot(slot, {
              proficientSkills,
              proficientTools,
              existingExpertiseSkills,
              currentSelection,
            })
          : isSkillKind || isToolKind || isLanguageKind
            ? optionsForProficiencyGrantSlot(slot, {
                proficientSkills,
                proficientTools,
                knownLanguages,
                currentSelection,
              })
            : (slot.options ?? [])
        const expertiseHint =
          slot.kind === "skill_or_tool" && slot.grantsExpertise
            ? `Choose ${slot.maxCount} total (proficient skills or tools only)`
            : slot.grantsExpertise
              ? `Choose ${slot.maxCount} (Expertise — pick skills you're proficient in)`
              : `Choose ${slot.maxCount}`
        const toolLayout =
          skillPickerLayout === "visual" ? "visual" : choiceLayout === "compact" ? "compact" : "default"
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
                layout={toolLayout}
              />
            </div>
          )
        }

        return (
          <MultiSelectChoices
            key={slot.slotKey}
            id={builderChoiceTargetId(slot.sourceLabel, slot.label)}
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
            showSkillInfo={showSkillInfo && isSkillKind}
            showOptionInfo={isToolKind && !isSkillKind}
            layout={
              isSkillKind
                ? skillPickerLayout
                : isToolKind
                  ? toolLayout
                  : choiceLayout
            }
            skillIconByName={isSkillKind ? skillIconByName : undefined}
            unavailableOptions={
              slot.grantsExpertise
                ? []
                : isSkillKind
                  ? unavailableOptions
                  : isLanguageKind
                    ? knownLanguages
                    : [
                        ...miSpellListUnavailable,
                        ...miAbilityUnavailable,
                      ]
            }
            allowCustom={slot.allowCustom ?? false}
            customPlaceholder={
              isLanguageKind
                ? "Add a custom language..."
                : slot.kind === "equipment"
                  ? "Name another linked item..."
                  : undefined
            }
          />
        )
      })}
    </div>
  )
}
