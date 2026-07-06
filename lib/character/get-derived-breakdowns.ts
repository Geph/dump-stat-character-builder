import type { CharacterBuildInputs } from "@/lib/character/types"
import {
  computeDerivedCharacter,
  classesForHp,
  calculateBaseMaxHp,
} from "@/lib/character/compute-derived"
import {
  aggregateCharacteristics,
  applyHpCharacteristics,
  computeInitiative,
  type SpeedCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { resolveFixedValueAtLevel } from "@/lib/compendium/bonus-by-level"
import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import { collectEquipmentMagicCharacteristics } from "@/lib/compendium/equipment-magic-modifiers"
import { modifierLimitationsMet } from "@/lib/compendium/modifier-limitations"
import {
  ContributionRecorder,
  type DerivedStatBreakdowns,
  type StatContribution,
  type StatContributionSource,
} from "@/lib/character/stat-contributions"
import { getExhaustionDerivedEffects } from "@/lib/srd/exhaustion-effects"
import { resolveSpellcastingAbilityKey } from "@/lib/compendium/spell-slots"
import { readModifierSource } from "@/lib/character/tag-modifier-source"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"

function recordAggregatedModifierContributions(
  mods: ReturnType<typeof collectBuilderModifierRefIds>,
  recorder: ContributionRecorder,
  totalLevel: number,
): void {
  for (const mod of mods) {
    const source = readModifierSource(mod)
    if (!source) continue
    switch (mod.type) {
      case "hit_points":
        if (mod.mode === "flat") {
          recorder.addSimple("hp", source, mod.value)
        } else {
          recorder.addSimple(
            "hp",
            { ...source, label: `${source.label} (per level)` },
            mod.value * totalLevel,
          )
        }
        break
      case "ac":
        if (mod.mode === "flat_bonus") {
          recorder.addSimple("ac", source, mod.flatBonus ?? 0)
        }
        break
      case "initiative":
        if (mod.mode === "flat_bonus") {
          recorder.addSimple("initiative", source, mod.flatBonus ?? 0)
        }
        break
      default:
        break
    }
  }
}

function speciesBaseWalkSpeed(inputs: CharacterBuildInputs): number {
  const species = inputs.species
  if (typeof species?.speed === "number") return species.speed
  if (typeof species?.speed === "object" && species?.speed) {
    return (species.speed as { walking?: number }).walking ?? 30
  }
  return 30
}

function speedModKey(mod: SpeedCharacteristic): string {
  return mod.speedType === "custom" ? mod.customType?.toLowerCase() || "custom" : mod.speedType
}

function speedTypeLabel(type: string): string {
  if (type === "walk") return "Walk"
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function speedModsForType(mods: CharacteristicModifier[], type: string): SpeedCharacteristic[] {
  return mods.filter((mod): mod is SpeedCharacteristic => {
    if (mod.type !== "speed") return false
    return speedModKey(mod) === type
  })
}

function activeSpeedMods(
  mods: CharacteristicModifier[],
  ctx: Parameters<typeof modifierLimitationsMet>[1],
): SpeedCharacteristic[] {
  return mods.filter(
    (mod): mod is SpeedCharacteristic =>
      mod.type === "speed" && modifierLimitationsMet(mod, ctx),
  )
}

function recordSpeedBreakdown(
  inputs: CharacterBuildInputs,
  derived: ReturnType<typeof computeDerivedCharacter>,
  allMods: CharacteristicModifier[],
  aggregated: ReturnType<typeof aggregateCharacteristics>,
  recorder: ContributionRecorder,
): void {
  const limitationCtx = {
    activeConditions: inputs.activeConditions,
    activeSheetToggles: inputs.activeSheetToggles,
    equippedArmor: inputs.equippedArmorId
      ? inputs.equipment.find((item) => item.id === inputs.equippedArmorId) ?? null
      : null,
    equippedShield: inputs.equippedShieldId
      ? inputs.equipment.find((item) => item.id === inputs.equippedShieldId) ?? null
      : null,
  }
  const speedMods = activeSpeedMods(allMods, limitationCtx)
  const baseWalk = speciesBaseWalkSpeed(inputs)
  const speciesName = inputs.species?.name ?? "Species"
  const speedEntries =
    derived.speeds?.length ? derived.speeds : [{ type: "walk", label: "walk", feet: derived.speed }]
  const exhaustionFx = getExhaustionDerivedEffects(inputs.exhaustionLevel ?? 0)

  for (const entry of speedEntries) {
    const relatedMods = speedModsForType(speedMods, entry.type)
    const defaultSource: StatContributionSource = {
      sourceType: entry.type === "walk" ? "base" : "feature",
      source: entry.label,
      label: `${speedTypeLabel(entry.type)} speed`,
    }

    if (entry.type === "walk") {
      const walkMods = relatedMods.filter((mod) => mod.mode !== "equal_to_walk")
      if (walkMods.length === 0 && aggregated.speed.walk == null) {
        recorder.addSimple(
          "speed",
          {
            sourceType: "species",
            source: speciesName,
            label: `${speciesName} walk speed`,
            sourceId: inputs.species?.id,
          },
          entry.feet,
        )
        continue
      }

      recorder.addSimple(
        "speed",
        {
          sourceType: "species",
          source: speciesName,
          label: `${speciesName} base walk speed`,
          sourceId: inputs.species?.id,
        },
        baseWalk,
      )

      for (const mod of walkMods) {
        const source = readModifierSource(mod) ?? {
          sourceType: "feature" as const,
          source: mod.label ?? "Feature",
          label: mod.label ?? "Feature",
        }
        const value =
          mod.valueByLevel?.length
            ? resolveFixedValueAtLevel(mod.valueByLevel, derived.totalLevel, mod.value) ??
              mod.value
            : mod.value
        recorder.addSimple(
          "speed",
          {
            ...source,
            label: `${source.label} (${mod.mode === "set" ? "set walk" : "walk bonus"})`,
          },
          mod.mode === "set" ? value - baseWalk : value,
        )
      }
      continue
    }

    if (relatedMods.length === 0) {
      recorder.addSimple("speed", defaultSource, entry.feet)
      continue
    }

    for (const mod of relatedMods) {
      const source = readModifierSource(mod) ?? defaultSource
      const modValue =
        mod.valueByLevel?.length
          ? resolveFixedValueAtLevel(mod.valueByLevel, derived.totalLevel, mod.value) ??
            mod.value
          : mod.value
      const amount = mod.mode === "equal_to_walk" ? entry.feet : modValue
      const label =
        mod.mode === "equal_to_walk"
          ? `${source.label} (equals walk)`
          : `${source.label} (${speedTypeLabel(entry.type)})`
      recorder.addSimple("speed", { ...source, label }, amount)
    }
  }

  if (exhaustionFx.speedZero || exhaustionFx.speedMultiplier < 1) {
    const walkEntry = speedEntries.find((entry) => entry.type === "walk")
    if (walkEntry) {
      const beforeExhaustion =
        exhaustionFx.speedZero
          ? walkEntry.feet
          : Math.round(walkEntry.feet / exhaustionFx.speedMultiplier)
      recorder.addSimple(
        "speed",
        {
          sourceType: "base",
          source: "Exhaustion",
          label: `Exhaustion ${inputs.exhaustionLevel ?? 0}`,
        },
        walkEntry.feet - beforeExhaustion,
      )
    }
  }
}

/** Lazy breakdown export — totals always come from computeDerivedCharacter (same engine). */
export function getDerivedCharacterBreakdowns(inputs: CharacterBuildInputs): DerivedStatBreakdowns {
  const derived = computeDerivedCharacter(inputs)
  const recorder = new ContributionRecorder()

  for (const part of derived.acBreakdown) {
    recorder.add("ac", {
      sourceType: "base",
      source: part.label,
      label: part.label,
      amount: part.value,
    })
  }

  const builderMods = collectBuilderModifierRefIds({
    catalog: inputs.modifierCatalog,
    species: inputs.species ?? undefined,
    speciesTraitPicks: inputs.speciesTraitPicks,
    background: inputs.background,
    feats: inputs.feats,
    selectedFeatIds: inputs.selectedFeatIds,
    grantedFeatIds: inputs.grantedFeatIds,
    featSelectionEntries: inputs.featSelectionEntries,
    featChoicePicks: inputs.featChoicePicks,
    modifierPlayerPicks: inputs.modifierPlayerPicks,
    classLevels: inputs.classLevels,
    classes: inputs.classes,
    subclasses: inputs.subclasses,
    subclassByClassId: inputs.subclassByClassId,
    featureChoicePicks: inputs.featureChoicePicks,
    customAbilities: inputs.customAbilities,
  })
  const equipmentMods = collectEquipmentMagicCharacteristics({
    equipment: inputs.equipment,
    equippedArmorId: inputs.equippedArmorId,
    equippedShieldId: inputs.equippedShieldId,
    equippedWeaponId: inputs.equippedWeaponId,
    equippedOffHandWeaponId: inputs.equippedOffHandWeaponId ?? null,
    attunedItemIds: inputs.attunedItemIds ?? [],
    modifierCatalog: inputs.modifierCatalog,
  })
  const allMods = [...builderMods, ...equipmentMods]
  recordAggregatedModifierContributions(allMods, recorder, derived.totalLevel)

  const aggregated = aggregateCharacteristics(allMods, {
    activeSheetToggles: inputs.activeSheetToggles,
    activeConditions: inputs.activeConditions,
    equippedArmor: inputs.equippedArmorId
      ? inputs.equipment.find((item) => item.id === inputs.equippedArmorId) ?? null
      : null,
    equippedShield: inputs.equippedShieldId
      ? inputs.equipment.find((item) => item.id === inputs.equippedShieldId) ?? null
      : null,
    currentHp: inputs.currentHp,
    characterLevel: derived.totalLevel,
  })

  const conMod = derived.abilityMods.constitution
  for (const { cls, level } of classesForHp(inputs)) {
    const hitDie = cls.hit_die ?? 8
    let isFirst = true
    for (let i = 0; i < level; i++) {
      const roll = isFirst ? hitDie : Math.floor(hitDie / 2) + 1
      recorder.addSimple(
        "hp",
        {
          sourceType: "class",
          source: cls.name,
          label: `${cls.name} level ${isFirst ? "1" : "2+"} hit die`,
          sourceId: cls.id,
        },
        roll + conMod,
      )
      isFirst = false
    }
  }

  const maxHpBase = applyHpCharacteristics(
    calculateBaseMaxHp(inputs, conMod),
    aggregated,
    derived.totalLevel,
  )
  const exhaustionFx = getExhaustionDerivedEffects(inputs.exhaustionLevel ?? 0)
  if (exhaustionFx.hpMaxMultiplier < 1) {
    recorder.addSimple(
      "hp",
      {
        sourceType: "base",
        source: "Exhaustion",
        label: `Exhaustion ${inputs.exhaustionLevel ?? 0} HP max`,
      },
      derived.maxHp - maxHpBase,
    )
  }

  recorder.addSimple(
    "initiative",
    {
      sourceType: "ability",
      source: "Dexterity",
      label: "Dexterity",
    },
    derived.abilityMods.dexterity,
  )
  const initFromFeatures =
    computeInitiative(
      derived.abilityMods.dexterity,
      aggregated,
      derived.abilityMods,
      derived.proficiencyBonus,
    ) -
    derived.abilityMods.dexterity -
    (aggregated.initiativeIncludeProficiency ? derived.proficiencyBonus : 0)
  if (initFromFeatures !== 0) {
    recorder.addSimple(
      "initiative",
      {
        sourceType: "feature",
        source: "Features",
        label: "Feature bonus",
      },
      initFromFeatures,
    )
  }
  if (aggregated.initiativeIncludeProficiency) {
    recorder.addSimple(
      "initiative",
      {
        sourceType: "class",
        source: "Proficiency",
        label: "Proficiency",
      },
      derived.proficiencyBonus,
    )
  }

  recordSpeedBreakdown(inputs, derived, allMods, aggregated, recorder)

  for (const skill of derived.skills) {
    const key = `skill:${skill.name}` as const
    recorder.addSimple(
      key,
      {
        sourceType: "ability",
        source: skill.ability,
        label: skill.ability.charAt(0).toUpperCase() + skill.ability.slice(1),
      },
      derived.abilityMods[skill.ability],
    )
    if (skill.proficient) {
      recorder.addSimple(
        key,
        {
          sourceType: "feature",
          source: "Proficiency",
          label: skill.expertise ? "Expertise" : "Proficiency",
        },
        derived.proficiencyBonus * (skill.expertise ? 2 : 1),
      )
    }
  }

  for (const save of derived.saves) {
    const key = `save:${save.ability}` as const
    recorder.addSimple(
      key,
      {
        sourceType: "ability",
        source: save.ability,
        label: save.ability.charAt(0).toUpperCase() + save.ability.slice(1),
      },
      derived.abilityMods[save.ability],
    )
    if (save.proficient) {
      recorder.addSimple(
        key,
        {
          sourceType: "class",
          source: "Class save",
          label: "Proficiency",
        },
        derived.proficiencyBonus,
      )
    }
  }

  const perceptionLines = derived.skills.find((skill) => skill.name === "Perception")
  if (perceptionLines) {
    recorder.add("passivePerception", {
      sourceType: "base",
      source: "Base",
      label: "Base 10",
      amount: 10,
    })
    for (const line of recorder.snapshot()[`skill:Perception`] ?? []) {
      recorder.add("passivePerception", line)
    }
  }

  const spellClass = inputs.classes.find((cls) => cls.spellcasting)
  const abilityKey = resolveSpellcastingAbilityKey(spellClass?.spellcasting?.ability ?? null)
  if (abilityKey && spellClass) {
    recorder.add("spellSaveDc", { sourceType: "base", source: "Base", label: "Base", amount: 8 })
    recorder.add("spellSaveDc", {
      sourceType: "class",
      source: "Proficiency",
      label: "Proficiency",
      amount: derived.proficiencyBonus,
    })
    recorder.add("spellSaveDc", {
      sourceType: "ability",
      source: abilityKey,
      label: abilityKey.charAt(0).toUpperCase() + abilityKey.slice(1),
      amount: derived.abilityMods[abilityKey],
    })
  }

  if (derived.equippedWeaponAttack) {
    for (const part of derived.equippedWeaponAttack.attackBreakdown) {
      recorder.add("weaponAttack", {
        sourceType: part.label === "Proficiency" ? "class" : "ability",
        source: part.label,
        label: part.label,
        amount: part.value,
      })
    }
    const modifierBonus =
      derived.equippedWeaponAttack.attackBonus -
      derived.equippedWeaponAttack.attackBreakdown.reduce((sum, part) => sum + part.value, 0)
    if (modifierBonus !== 0) {
      recorder.add("weaponAttack", {
        sourceType: "feature",
        source: "Features",
        label: "Feature bonuses",
        amount: modifierBonus,
      })
    }
  }

  return recorder.snapshot()
}

export function breakdownLines(
  breakdowns: DerivedStatBreakdowns,
  key: string,
): StatContribution[] {
  return breakdowns[key as keyof DerivedStatBreakdowns] ?? []
}
