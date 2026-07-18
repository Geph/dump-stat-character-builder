"use client"

import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { WeaponMasteryChoices } from "@/components/builder/weapon-mastery-choices"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import type { ClassAbilityFeatureEntry } from "@/lib/builder/class-ability-step"
import { featureChoiceKey, getTakenSkills, type SkillPickSource } from "@/lib/builder/choices"
import { validateKnackSelectionChange } from "@/lib/builder/knack-choices"
import { validateUpgradeSelectionChange } from "@/lib/builder/upgrade-choices"
import type { FeatureChoiceCountBonusCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import type { CustomAbility, Equipment, Feature } from "@/lib/types"

type Props = {
  entries: ClassAbilityFeatureEntry[]
  customAbilities: CustomAbility[]
  featureChoicePicks: Record<string, string[]>
  equipment: Equipment[]
  knownSpellNames: string[]
  grantedCustomAbilityNames?: string[]
  /** Extra picks (e.g. feat discipline picks) merged into known-discipline resolution. */
  additionalChoicePicks?: Record<string, string[]>
  skillPickSources: SkillPickSource[]
  skillPickerLayout: "visual" | "compact" | "default"
  compactPickerLayout: "compact" | "default"
  customSkillIconByName?: Record<string, string>
  weaponMasteryDescriptions?: Record<string, string>
  cardViewMode?: "dense" | "cinematic"
  featureChoiceCountBonuses?: FeatureChoiceCountBonusCharacteristic[]
  onFeatureChoiceChange: (key: string, selected: string[]) => void
  onClearModifierPicks: (sourceKey: string) => void
}

function choiceHint(feature: Feature, choiceCount: number): string | undefined {
  if (isWeaponMasteryFeature(feature)) {
    return `Choose ${choiceCount} weapon type${choiceCount === 1 ? "" : "s"}${
      feature.choices?.swappableOnRest ? " (swap one on a Long Rest)" : ""
    }.`
  }
  if (feature.choices?.optionsSource === "class_knacks") {
    return `Choose ${choiceCount} ${
      /trick|exploit|maneuver/i.test(feature.choices?.category ?? feature.name)
        ? feature.choices?.category ?? "option"
        : "Knack"
    }${choiceCount === 1 ? "" : "s"}${
      feature.choices?.swappableOnRest ? " (replace one when you level up)" : ""
    }.`
  }
  if (feature.choices?.optionsSource === "class_upgrades") {
    return `Choose ${choiceCount} Upgrade${choiceCount === 1 ? "" : "s"}${
      feature.choices?.swappableOnRest ? " (exchange on level-up per feature rules)" : ""
    }.`
  }
  if (feature.choices?.optionsSource === "known_discipline_talents") {
    return `Choose ${choiceCount} psionic talent${choiceCount === 1 ? "" : "s"} from your known disciplines.`
  }
  if (feature.choices?.optionsSource === "class_disciplines") {
    return `Choose ${choiceCount} psionic discipline${choiceCount === 1 ? "" : "s"}.`
  }
  if (feature.choices?.optionsSource === "class_talents") {
    return `Choose ${choiceCount} general talent${choiceCount === 1 ? "" : "s"} available at your level.`
  }
  return feature.choices?.category
}

export function ClassAbilityFeatureChoices({
  entries,
  customAbilities,
  featureChoicePicks,
  equipment,
  knownSpellNames,
  grantedCustomAbilityNames,
  additionalChoicePicks,
  skillPickSources,
  skillPickerLayout,
  compactPickerLayout,
  customSkillIconByName,
  weaponMasteryDescriptions,
  cardViewMode = "cinematic",
  featureChoiceCountBonuses,
  onFeatureChoiceChange,
  onClearModifierPicks,
}: Props) {
  if (!entries.length) return null

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const { feature, classId, className, classLevel, subclassName } = entry
        const key = featureChoiceKey(classId, feature.name, feature.level)
        const choiceOptions = resolveFeatureChoiceOptions(feature, {
          customAbilities,
          featureChoicePicks: { ...featureChoicePicks, ...(additionalChoicePicks ?? {}) },
          classNames: [className],
          classLevel,
          equipmentCatalog: equipment,
          knownSpellNames,
          subclassName: subclassName ?? null,
          grantedCustomAbilityNames,
        })
        const choiceCount = resolveFeatureChoiceCount(
          feature.choices!,
          classLevel,
          className,
          undefined,
          {
            featureName: feature.name,
            bonuses: featureChoiceCountBonuses,
          },
        )
        const isWeaponMastery = isWeaponMasteryFeature(feature)
        const isKnackPool = feature.choices?.optionsSource === "class_knacks"
        const isUpgradePool = feature.choices?.optionsSource === "class_upgrades"
        const hint = choiceHint(feature, choiceCount)
        const sourceLabel =
          entry.source === "subclass" && subclassName
            ? `${className} (${subclassName})`
            : className

        const handleChange = (selected: string[]) => {
          if (isKnackPool) {
            const previous = featureChoicePicks[key] ?? []
            const validation = validateKnackSelectionChange({
              previous,
              next: selected,
              customAbilities,
              classLevel,
              knownSpellNames,
              subclassName: subclassName ?? null,
            })
            if (!validation.ok) {
              window.alert(validation.message)
              return
            }
          }
          if (isUpgradePool) {
            const validation = validateUpgradeSelectionChange({
              next: selected,
              customAbilities,
              classLevel,
            })
            if (!validation.ok) {
              window.alert(validation.message)
              return
            }
          }
          onFeatureChoiceChange(key, selected)
          onClearModifierPicks(key)
        }

        return (
          <div key={key} className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {sourceLabel} · Level {feature.level}
            </p>
            {isWeaponMastery ? (
              <WeaponMasteryChoices
                title={feature.name}
                hint={hint}
                options={choiceOptions}
                maxCount={choiceCount}
                selected={featureChoicePicks[key] ?? []}
                unavailableOptions={[...getTakenSkills(skillPickSources, `feature:${key}`)]}
                onChange={handleChange}
                layout={cardViewMode === "cinematic" ? "visual" : "compact"}
                masteryDescriptions={weaponMasteryDescriptions}
              />
            ) : (
              <MultiSelectChoices
                title={feature.name}
                hint={hint}
                options={choiceOptions}
                maxCount={choiceCount}
                selected={featureChoicePicks[key] ?? []}
                unavailableOptions={[...getTakenSkills(skillPickSources, `feature:${key}`)]}
                showSkillInfo={feature.choices!.category.toLowerCase().includes("skill")}
                layout={
                  feature.choices!.category.toLowerCase().includes("skill")
                    ? skillPickerLayout
                    : compactPickerLayout
                }
                skillIconByName={
                  feature.choices!.category.toLowerCase().includes("skill")
                    ? customSkillIconByName
                    : undefined
                }
                onChange={handleChange}
                accentClass="border-accent bg-accent/10"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
