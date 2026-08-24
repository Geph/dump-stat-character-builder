"use client"

import { MultiSelectChoices } from "@/components/builder/multi-select-choices"
import { WeaponMasteryChoices } from "@/components/builder/weapon-mastery-choices"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import type { ClassAbilityFeatureEntry } from "@/lib/builder/class-ability-step"
import { featureChoiceKey, getTakenSkills, type SkillPickSource } from "@/lib/builder/choices"
import { choicePoolHint } from "@/lib/builder/choice-pool-noun"
import { featureChoiceHintFromDescription } from "@/lib/builder/feature-choice-hint"
import { validateKnackSelectionChange } from "@/lib/builder/knack-choices"
import { validateUpgradeSelectionChange } from "@/lib/builder/upgrade-choices"
import type { FeatureChoiceCountBonusCharacteristic, FeatureChoiceOptionGrantCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import { withChosenOptionChrome } from "@/lib/character/chosen-option-label"
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
  knownLanguages?: string[]
  proficientTools?: string[]
  skillPickerLayout: "visual" | "compact" | "default"
  compactPickerLayout: "compact" | "default"
  customSkillIconByName?: Record<string, string>
  weaponMasteryDescriptions?: Record<string, string>
  cardViewMode?: "dense" | "cinematic"
  featureChoiceCountBonuses?: FeatureChoiceCountBonusCharacteristic[]
  featureChoiceOptionGrants?: FeatureChoiceOptionGrantCharacteristic[]
  onFeatureChoiceChange: (key: string, selected: string[]) => void
  onClearModifierPicks: (sourceKey: string) => void
}

function choiceHint(
  feature: Feature,
  choiceCount: number,
): { hint?: string; hintDetails?: string } {
  if (isWeaponMasteryFeature(feature)) {
    return {
      hint: `Choose ${choiceCount} weapon type${choiceCount === 1 ? "" : "s"}${
        feature.choices?.swappableOnRest ? " (swap one on a Long Rest)" : ""
      }.`,
    }
  }
  if (feature.choices?.optionsSource === "class_knacks") {
    return { hint: choicePoolHint(feature, choiceCount) }
  }
  if (feature.choices?.optionsSource === "class_upgrades") {
    return {
      hint: `Choose ${choiceCount} Upgrade${choiceCount === 1 ? "" : "s"}${
        feature.choices?.swappableOnRest ? " (exchange on level-up per feature rules)" : ""
      }.`,
    }
  }
  if (feature.choices?.optionsSource === "class_bomb_formulas") {
    return {
      hint: `Choose ${choiceCount} Bomb Formula${choiceCount === 1 ? "" : "s"}${
        feature.choices?.swappableOnRest ? " (replace on a Long Rest)" : ""
      }.`,
    }
  }
  if (feature.choices?.optionsSource === "class_discoveries") {
    return {
      hint: `Choose ${choiceCount} Discovery${choiceCount === 1 ? "" : "ies"}${
        feature.choices?.swappableOnLevelUp ? " (replace one when you gain an Alchemist level)" : ""
      }.`,
    }
  }
  if (feature.choices?.optionsSource === "known_discipline_talents") {
    return {
      hint: `Choose ${choiceCount} psionic talent${choiceCount === 1 ? "" : "s"} from your known disciplines and General Psionic Talents (level gates apply).`,
    }
  }
  if (feature.choices?.optionsSource === "class_disciplines") {
    return {
      hint: `Choose ${choiceCount} psionic discipline${choiceCount === 1 ? "" : "s"}. Disciplines granted by your subclass appear selected.`,
    }
  }
  if (feature.choices?.optionsSource === "class_talents") {
    return {
      hint: `Choose ${choiceCount} general talent${choiceCount === 1 ? "" : "s"} available at your level.`,
    }
  }
  const fromDescription = featureChoiceHintFromDescription(feature.description)
  if (fromDescription) {
    return {
      hint: fromDescription.preview,
      ...(fromDescription.showDetails ? { hintDetails: fromDescription.details } : {}),
    }
  }
  return { hint: feature.choices?.category }
}

function namesMatchLoose(a: string, b: string): boolean {
  const left = a.trim().toLowerCase().replace(/\s+/g, " ")
  const right = b.trim().toLowerCase().replace(/\s+/g, " ")
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
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
  knownLanguages = [],
  proficientTools = [],
  skillPickerLayout,
  compactPickerLayout,
  customSkillIconByName,
  weaponMasteryDescriptions,
  cardViewMode = "cinematic",
  featureChoiceCountBonuses,
  featureChoiceOptionGrants,
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
          classIds: [classId],
          classLevel,
          equipmentCatalog: equipment,
          classWeaponProficiencies: entry.weaponProficiencies ?? null,
          knownSpellNames,
          subclassName: subclassName ?? null,
          grantedCustomAbilityNames,
          optionGrants: featureChoiceOptionGrants,
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
        const isDisciplinePool = feature.choices?.optionsSource === "class_disciplines"
        const { hint, hintDetails } = choiceHint(feature, choiceCount)
        const lockedOptions = isDisciplinePool
          ? (grantedCustomAbilityNames ?? []).filter((grant) =>
              customAbilities.some((ability) => {
                const isDiscipline =
                  ability.ability_role === "discipline" ||
                  /\bdiscipline\b/i.test(ability.name)
                return isDiscipline && namesMatchLoose(ability.name, grant)
              }),
            )
          : []
        const optionsWithLocked = [...choiceOptions]
        for (const grant of lockedOptions) {
          if (optionsWithLocked.some((option) => namesMatchLoose(option.name, grant))) continue
          const ability = customAbilities.find((row) => namesMatchLoose(row.name, grant))
          optionsWithLocked.push({
            name: ability?.name ?? grant,
            description: ability?.description ?? "",
            prerequisite: ability?.prerequisites ?? null,
          })
        }
        const sourceLabel =
          entry.source === "subclass" && subclassName
            ? `${className} (${subclassName})`
            : className
        const proficiencyCategory = `${feature.choices?.category ?? ""} ${feature.name}`
        const unavailableOptions = [
          ...(/\bskill/i.test(proficiencyCategory)
            ? getTakenSkills(skillPickSources, `feature:${key}`)
            : []),
          ...(/\b(language|tongue)\b/i.test(proficiencyCategory) ? knownLanguages : []),
          ...(/\b(tool|instrument|artisan|musical)\b/i.test(proficiencyCategory)
            ? proficientTools
            : []),
        ]

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
                title={withChosenOptionChrome(feature.name, featureChoicePicks[key] ?? [])}
                hint={hint}
                options={choiceOptions}
                maxCount={choiceCount}
                selected={featureChoicePicks[key] ?? []}
                unavailableOptions={unavailableOptions}
                onChange={handleChange}
                layout={cardViewMode === "cinematic" ? "visual" : "compact"}
                masteryDescriptions={weaponMasteryDescriptions}
              />
            ) : (
              <MultiSelectChoices
                title={withChosenOptionChrome(feature.name, featureChoicePicks[key] ?? [])}
                hint={hint}
                hintDetails={hintDetails}
                options={optionsWithLocked}
                maxCount={choiceCount}
                selected={featureChoicePicks[key] ?? []}
                lockedOptions={lockedOptions}
                lockedLabel="Granted by subclass"
                unavailableOptions={unavailableOptions}
                showSkillInfo={feature.choices!.category.toLowerCase().includes("skill")}
                showOptionInfo={!feature.choices!.category.toLowerCase().includes("skill")}
                layout={
                  feature.choices!.category.toLowerCase().includes("skill")
                    ? skillPickerLayout
                    : /tool/i.test(`${feature.choices!.category} ${feature.name}`) &&
                        cardViewMode === "cinematic"
                      ? "visual"
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
