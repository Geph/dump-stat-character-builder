"use client"

import type { Dispatch, SetStateAction } from "react"
import { CatalogFeatMultiPicker } from "@/components/builder/catalog-feat-multi-picker"
import { ClassAbilityFeatureChoices } from "@/components/builder/class-ability-feature-choices"
import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { ModifierPlayerChoicePanel } from "@/components/builder/modifier-player-choice-panel"
import type { CatalogFeatPickGroup } from "@/lib/builder/catalog-feat-pick-groups"
import {
  distributeCatalogFeatPicksToSlots,
  readCatalogFeatPicksFromSlots,
} from "@/lib/builder/catalog-feat-pick-groups"
import { catalogFeatPickOptions } from "@/lib/builder/catalog-feat-options"
import type { ClassAbilityFeatureEntry } from "@/lib/builder/class-ability-step"
import type { FeatPickSlot } from "@/lib/builder/class-feat-features"
import { featureChoiceKey, type SkillPickSource } from "@/lib/builder/choices"
import {
  clearModifierPicksForSource,
  setModifierPlayerPickValue,
  type ModifierPlayerChoiceSlot,
} from "@/lib/builder/modifier-player-choices"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { isFeatEligibleForCategories } from "@/lib/builder/feat-selection"
import { filterPreferredSourceReplacements } from "@/lib/compendium/prefer-same-source"
import { featChoicePickKey } from "@/lib/builder/feat-choices"
import { GameIcon } from "@/components/game-icon-picker"
import { Info } from "lucide-react"
import type { FeatureChoiceCountBonusCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { CustomAbility, Equipment, Feat, Spell } from "@/lib/types"
import {
  abilitySpecializationChoice,
  abilitySpecializationChoiceKey,
} from "@/lib/import/parse-alternate-effects-table"

type ClassAbilitiesStepProps = {
  pageFloatingHintClass: string
  abilityFeatures: ClassAbilityFeatureEntry[]
  featureChoicePicks: Record<string, string[]>
  setFeatureChoicePicks: Dispatch<SetStateAction<Record<string, string[]>>>
  setFeatChoicePicks: Dispatch<SetStateAction<Record<string, string[]>>>
  setModifierPlayerPicks: Dispatch<SetStateAction<Record<string, string[]>>>
  customAbilities: CustomAbility[]
  equipment: Equipment[]
  knownSpellNames: string[]
  grantedCustomAbilityNames?: string[]
  featChoicePicks?: Record<string, string[]>
  featureChoiceCountBonuses?: FeatureChoiceCountBonusCharacteristic[]
  compactPickerLayout: "default" | "compact"
  skillPickerLayout: "default" | "compact" | "visual"
  cardViewMode: "dense" | "cinematic"
  weaponMasteryDescriptions: Record<string, string>
  skillPickSources: SkillPickSource[]
  customSkillIconByName?: Record<string, string>
  modifierPlayerChoiceSlots: ModifierPlayerChoiceSlot[]
  modifierPlayerPicks: Record<string, string[]>
  spells: Spell[]
  modifierExpertisePickerProps: {
    choiceLayout?: "default" | "compact"
    skillPickerLayout?: "default" | "compact" | "visual"
    skillIconByName?: Record<string, string>
    proficientSkills?: string[]
    proficientTools?: string[]
    existingExpertiseSkills?: string[]
  }
  classCatalogFeatGroups: CatalogFeatPickGroup[]
  classAbilityRegularFeatSlots: FeatPickSlot[]
  feats: Feat[]
  featsLoadError: string | null
  hasCatalogFeatPickOptions: boolean
  totalLevel: number
  classIds: string[]
  ownedFeatIds: string[]
  speciesId: string | null
  backgroundId: string | null
  preferredFeatSources: string[]
  onShowFeatDetails: (feat: Feat) => void
  selectedClassAbilityFeatCount: number
  requiredClassAbilityFeatSlots: number
  skillPickSourcesTaken: string[]
}

export function ClassAbilitiesStepPanel(props: ClassAbilitiesStepProps) {
  const {
    pageFloatingHintClass,
    abilityFeatures,
    featureChoicePicks,
    setFeatureChoicePicks,
    setFeatChoicePicks,
    setModifierPlayerPicks,
    customAbilities,
    equipment,
    knownSpellNames,
    grantedCustomAbilityNames,
    featChoicePicks,
    featureChoiceCountBonuses,
    compactPickerLayout,
    skillPickerLayout,
    cardViewMode,
    weaponMasteryDescriptions,
    skillPickSources,
    customSkillIconByName,
    modifierPlayerChoiceSlots,
    modifierPlayerPicks,
    spells,
    modifierExpertisePickerProps,
    classCatalogFeatGroups,
    classAbilityRegularFeatSlots,
    feats,
    featsLoadError,
    hasCatalogFeatPickOptions,
    totalLevel,
    classIds,
    ownedFeatIds,
    speciesId,
    backgroundId,
    preferredFeatSources,
    onShowFeatDetails,
    selectedClassAbilityFeatCount,
    requiredClassAbilityFeatSlots,
    skillPickSourcesTaken,
  } = props

  const pickedDisciplineNames = new Set(
    Object.entries(featureChoicePicks)
      .filter(([key]) => /discipline/i.test(key))
      .flatMap(([, picks]) => picks.map((name) => name.trim().toLowerCase())),
  )
  const specializationAbilities = customAbilities.filter((ability) => {
    const specialization = abilitySpecializationChoice(ability)
    if (!specialization?.options?.length) return false
    const name = ability.name.trim().toLowerCase()
    return [...pickedDisciplineNames].some(
      (pick) => name.includes(pick) || pick.includes(name),
    )
  })

  const groupedByClass = new Map<string, ClassAbilityFeatureEntry[]>()
  for (const entry of abilityFeatures) {
    const list = groupedByClass.get(entry.classId) ?? []
    list.push(entry)
    groupedByClass.set(entry.classId, list)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-foreground mb-2">Class Abilities</h2>
        <p className={`${pageFloatingHintClass} mb-3`}>
          Pick class-specific ability pools — Metamagic, Eldritch Invocations, Fighting Styles,
          disciplines, talents, knacks, exploits, and similar options.
        </p>
      </div>

      {[...groupedByClass.entries()].map(([classId, entries]) => {
        const className = entries[0]?.className ?? "Class"
        return (
          <div key={classId} className="space-y-3 border-t border-border pt-4">
            <h3 className="text-lg font-bold text-foreground">{className}</h3>
            <ClassAbilityFeatureChoices
              entries={entries}
              customAbilities={customAbilities}
              featureChoicePicks={featureChoicePicks}
              equipment={equipment}
              knownSpellNames={knownSpellNames}
              grantedCustomAbilityNames={grantedCustomAbilityNames}
              additionalChoicePicks={featChoicePicks}
              skillPickSources={skillPickSources}
              skillPickerLayout={skillPickerLayout}
              compactPickerLayout={compactPickerLayout}
              customSkillIconByName={customSkillIconByName}
              weaponMasteryDescriptions={weaponMasteryDescriptions}
              cardViewMode={cardViewMode}
              featureChoiceCountBonuses={featureChoiceCountBonuses}
              onFeatureChoiceChange={(key, selected) =>
                setFeatureChoicePicks((prev) => ({ ...prev, [key]: selected }))
              }
              onClearModifierPicks={(sourceKey) =>
                setModifierPlayerPicks((prev) => clearModifierPicksForSource(prev, sourceKey))
              }
            />
            {entries.map((entry) => {
              const key = featureChoiceKey(entry.classId, entry.feature.name, entry.feature.level)
              return (
                <ModifierPlayerChoicePanel
                  key={`${key}:mods`}
                  sourceKey={key}
                  sourceLabel={`${entry.className}: ${entry.feature.name}`}
                  slots={modifierPlayerChoiceSlots}
                  picks={modifierPlayerPicks}
                  spells={spells}
                  excludeKinds={["spell"]}
                  unavailableOptions={skillPickSourcesTaken}
                  {...modifierExpertisePickerProps}
                  onChange={(slotKey, selected) => {
                    const slot = modifierPlayerChoiceSlots.find((s) => s.slotKey === slotKey)
                    if (!slot) return
                    setModifierPlayerPicks((prev) =>
                      setModifierPlayerPickValue(
                        prev,
                        slot,
                        modifierPlayerChoiceSlots,
                        selected,
                      ),
                    )
                  }}
                />
              )
            })}
          </div>
        )
      })}

      {specializationAbilities.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-6">
          <h3 className="text-lg font-bold text-foreground">Discipline Specializations</h3>
          <p className={`${pageFloatingHintClass} text-xs mb-2`}>
            Optional one-time specializations (e.g. Psychokinesis Cryokinetic). Selecting one
            replaces that discipline&apos;s default Alternate Effects spell list.
          </p>
          {specializationAbilities.map((ability) => {
            const specialization = abilitySpecializationChoice(ability)!
            const key = abilitySpecializationChoiceKey(ability.id)
            return (
              <MultiSelectChoices
                key={key}
                title={`${ability.name}: ${specialization.category}`}
                hint={`Choose up to ${specialization.count} (optional — leave empty for the default Alternate Effects list).`}
                options={specialization.options.map((option) => ({
                  name: option.name,
                  description: option.description,
                }))}
                maxCount={specialization.count}
                selected={featureChoicePicks[key] ?? []}
                onChange={(selected) =>
                  setFeatureChoicePicks((prev) => ({
                    ...prev,
                    [key]: selected,
                  }))
                }
              />
            )
          })}
        </div>
      ) : null}

      {(classCatalogFeatGroups.length > 0 || classAbilityRegularFeatSlots.length > 0) && (
        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">Granted class abilities</h3>
              <p className="text-xs text-muted-foreground">
                Metamagic, Eldritch Invocations, Fighting Styles, and similar grants.
              </p>
            </div>
            {requiredClassAbilityFeatSlots > 0 ? (
              <span className="text-xs font-bold text-muted-foreground">
                {selectedClassAbilityFeatCount}/{requiredClassAbilityFeatSlots}
              </span>
            ) : null}
          </div>

          {featsLoadError && (
            <p className="text-xs text-destructive">
              Could not load feats from the database ({featsLoadError}).
            </p>
          )}
          {!featsLoadError && feats.length === 0 && !hasCatalogFeatPickOptions && (
            <p className={`${pageFloatingHintClass} text-xs`}>
              No feats in your compendium yet. Seed SRD content from Settings or add feats in the
              Compendium.
            </p>
          )}

          {classCatalogFeatGroups.map((group) => {
            const catalogOptions = catalogFeatPickOptions(group.featCategories, customAbilities)
            const selectedPickIds = readCatalogFeatPicksFromSlots(group.slots, featureChoicePicks)
            return (
              <CatalogFeatMultiPicker
                key={group.groupKey}
                className="mt-3"
                classPrefix={group.className || undefined}
                label={group.label}
                options={catalogOptions}
                maxCount={group.slots.length}
                selectedPickIds={selectedPickIds}
                customAbilities={customAbilities}
                cardViewMode={cardViewMode}
                onChange={(nextPickIds) => {
                  const slotPicks = distributeCatalogFeatPicksToSlots(group.slots, nextPickIds)
                  setFeatureChoicePicks((prev) => ({ ...prev, ...slotPicks }))
                  setFeatChoicePicks((prev) => {
                    const next = { ...prev }
                    for (const slot of group.slots) {
                      delete next[featChoicePickKey(slot.key)]
                    }
                    return next
                  })
                  setModifierPlayerPicks((prev) => {
                    let next = prev
                    for (const slot of group.slots) {
                      next = clearModifierPicksForSource(next, featChoicePickKey(slot.key))
                    }
                    return next
                  })
                }}
              />
            )
          })}

          {classAbilityRegularFeatSlots.map((slot) => {
            const pickedId = featureChoicePicks[slot.key]?.[0] ?? null
            const picked = feats.find((f) => f.id === pickedId) ?? null
            const featContext = {
              totalLevel,
              classIds,
              feats,
              ownedFeatIds,
              speciesId,
              backgroundId,
              currentSlotFeatId: pickedId,
              preferredSources: preferredFeatSources,
            }
            const eligibleFeats = filterPreferredSourceReplacements(
              feats.filter((feat) =>
                isFeatEligibleForCategories(
                  feat,
                  slot.featCategories,
                  slot.milestoneLevel,
                  featContext,
                ),
              ),
              preferredFeatSources,
            ).sort((a, b) => a.name.localeCompare(b.name))

            const selectPick = (nextId: string | null) => {
              const choiceKey = featChoicePickKey(slot.key)
              setFeatureChoicePicks((prev) => ({
                ...prev,
                [slot.key]: nextId ? [nextId] : [],
              }))
              setFeatChoicePicks((prev) => {
                if (!nextId) {
                  const next = { ...prev }
                  delete next[choiceKey]
                  return next
                }
                if (prev[choiceKey] && pickedId === nextId) return prev
                const next = { ...prev }
                delete next[choiceKey]
                return next
              })
              setModifierPlayerPicks((prev) => clearModifierPicksForSource(prev, choiceKey))
            }

            return (
              <div key={slot.key} className="mt-3">
                <p className="text-xs font-bold text-primary uppercase mb-2">
                  {slot.className ? `${slot.className}: ` : ""}
                  {slot.label}
                </p>
                <div
                  className={`grid grid-cols-1 ${
                    cardViewMode === "cinematic"
                      ? "sm:grid-cols-2 gap-2"
                      : "sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
                  }`}
                >
                  {eligibleFeats.map((feat) => {
                    const isSelected = feat.id === pickedId
                    return (
                      <div key={feat.id} className="flex items-stretch gap-1">
                        <button
                          type="button"
                          onClick={() => selectPick(isSelected ? null : feat.id)}
                          className={`rounded-lg border-2 text-left transition-all flex-1 ${
                            cardViewMode === "cinematic" ? "p-3" : "px-2.5 py-1.5"
                          } ${
                            isSelected
                              ? "border-secondary bg-secondary/10"
                              : "border-border bg-card hover:border-secondary/50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {cardViewMode === "cinematic" && (
                              <GameIcon
                                name={getCompendiumItemIcon(
                                  "feats",
                                  feat as unknown as Record<string, unknown>,
                                )}
                                className="mt-0.5 h-7 w-7 shrink-0 text-secondary"
                              />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`font-semibold text-foreground ${
                                  cardViewMode === "cinematic" ? "text-sm" : "text-xs"
                                }`}
                              >
                                {feat.name}
                              </p>
                            </div>
                          </div>
                        </button>
                        {cardViewMode === "cinematic" && feat.description?.trim() ? (
                          <button
                            type="button"
                            aria-label={`About ${feat.name}`}
                            onClick={() => onShowFeatDetails(feat)}
                            className="shrink-0 self-center rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
                {picked ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: <span className="font-semibold text-foreground">{picked.name}</span>
                  </p>
                ) : null}
              </div>
            )
          })}

          {selectedClassAbilityFeatCount !== requiredClassAbilityFeatSlots &&
          requiredClassAbilityFeatSlots > 0 ? (
            <p className="text-xs text-destructive mt-3">
              Select {requiredClassAbilityFeatSlots - selectedClassAbilityFeatCount} more abilit
              {requiredClassAbilityFeatSlots - selectedClassAbilityFeatCount === 1 ? "y" : "ies"} to
              continue.
            </p>
          ) : null}
        </div>
      )}

      {abilityFeatures.length === 0 &&
      classCatalogFeatGroups.length === 0 &&
      classAbilityRegularFeatSlots.length === 0 &&
      specializationAbilities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No class ability pools for your current classes and levels.
        </p>
      ) : null}
    </div>
  )
}
