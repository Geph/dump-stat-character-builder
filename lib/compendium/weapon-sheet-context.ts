import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import {
  aggregateCharacteristics,
  type AttackRollModifiersCharacteristic,
  type BonusDamageRidersCharacteristic,
  type CharacteristicModifier,
  type DamageRollModifiersCharacteristic,
  type RollModifierEntry,
} from "@/lib/compendium/characteristic-modifiers"
import { collectEquipmentMagicCharacteristics } from "@/lib/compendium/equipment-magic-modifiers"
import {
  getWeaponMastery,
  getWeaponPropertyTags,
  isWeaponProficient,
} from "@/lib/compendium/combat-stats"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import { formatRollBonusSummary } from "@/lib/compendium/roll-bonus-config"
import { migrateFeatureOptionPickers } from "@/lib/compendium/feature-option-choice-migration"
import { SUBCLASS_LEVEL } from "@/lib/builder/choices"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { Equipment, Feature } from "@/lib/types"

export type WeaponSheetAppliedModifier = {
  name: string
  description: string
}

export type WeaponSheetContext = {
  masteryName: string | null
  masteryDescription: string | null
  masteryActive: boolean
  appliedModifiers: WeaponSheetAppliedModifier[]
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

function weaponMatchesModifierTarget(
  subcategory: string,
  properties: string[],
  target: string,
): boolean {
  if (!target || target === "all") return true
  const sub = subcategory.toLowerCase()
  const props = properties.join(" ").toLowerCase()

  switch (target) {
    case "melee":
      return sub.includes("melee")
    case "ranged":
      return sub.includes("ranged")
    case "simple_melee":
      return sub.includes("simple") && sub.includes("melee")
    case "simple_ranged":
      return sub.includes("simple") && sub.includes("ranged")
    case "martial_melee":
      return sub.includes("martial") && sub.includes("melee")
    case "martial_ranged":
      return sub.includes("martial") && sub.includes("ranged")
    case "one_handed_melee":
      return sub.includes("melee") && !props.includes("two-handed") && !props.includes("two handed")
    default:
      return sub.includes(target) || props.includes(target)
  }
}

function resolveModifierTarget(entry: RollModifierEntry): string {
  return entry.target === "custom" ? (entry.customTarget?.toLowerCase() ?? "") : entry.target
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

function entryMatchesWeapon(
  weapon: Equipment,
  properties: string[],
  entry: RollModifierEntry,
): boolean {
  return weaponMatchesModifierTarget(
    weapon.subcategory ?? "",
    properties,
    resolveModifierTarget(entry),
  )
}

function describeAttackEntry(entry: RollModifierEntry): string {
  const parts: string[] = []
  if (entry.bonus) parts.push(`${formatSigned(entry.bonus)} to attack rolls`)
  if (entry.criticalHitMinimum && entry.criticalHitMinimum < 20) {
    parts.push(`Critical hit on ${entry.criticalHitMinimum}–20`)
  }
  if (entry.ignoreHalfCover) parts.push("Ignores half cover on ranged attacks")
  if (entry.grantAbilityModifierWhenMissing) {
    parts.push("Adds ability modifier to damage when it would not apply")
  }
  if (entry.bonusDiceWhenModifierIncluded) {
    parts.push(`Extra damage: ${entry.bonusDiceWhenModifierIncluded}`)
  }
  return parts.join(". ")
}

function collectAppliedModifiers(
  weapon: Equipment,
  mods: CharacteristicModifier[],
): WeaponSheetAppliedModifier[] {
  const properties = getWeaponPropertyTags(weapon)
  const applied: WeaponSheetAppliedModifier[] = []

  for (const mod of mods) {
    if (mod.type === "attack_roll_modifiers") {
      const attackMod = mod as AttackRollModifiersCharacteristic
      for (const entry of attackMod.entries ?? []) {
        if (!entryMatchesWeapon(weapon, properties, entry)) continue
        const description = describeAttackEntry(entry)
        if (!description && !attackMod.advantageVsTargetAfterMiss && !attackMod.weaponMasteryOverrides?.length) {
          continue
        }
        const extra: string[] = []
        if (description) extra.push(description)
        if (attackMod.advantageVsTargetAfterMiss) {
          extra.push("After missing, gain Advantage on your next attack against that target")
        }
        if (attackMod.weaponMasteryOverrides?.length) {
          extra.push(`Can swap mastery to: ${attackMod.weaponMasteryOverrides.join(", ")}`)
        }
        applied.push({
          name: mod.label ?? "Attack modifier",
          description: extra.join(". "),
        })
        break
      }
    }

    if (mod.type === "damage_roll_modifiers") {
      const damageMod = mod as DamageRollModifiersCharacteristic
      for (const entry of damageMod.entries ?? []) {
        if (!entryMatchesWeapon(weapon, properties, entry)) continue
        const description = describeAttackEntry(entry)
        if (!description) continue
        applied.push({
          name: mod.label ?? "Damage modifier",
          description,
        })
        break
      }
    }

    if (mod.type === "bonus_damage_riders") {
      const riderMod = mod as BonusDamageRidersCharacteristic
      const appliesTo = riderMod.appliesTo?.toLowerCase() ?? "all"
      if (
        appliesTo !== "all" &&
        !weaponMatchesModifierTarget(weapon.subcategory ?? "", properties, appliesTo)
      ) {
        continue
      }
      if (riderMod.automaticBonus) {
        applied.push({
          name: mod.label ?? "On-hit rider",
          description: formatRollBonusSummary(riderMod.automaticBonus) || "Bonus damage on hit",
        })
      } else if (riderMod.riders?.length) {
        applied.push({
          name: mod.label ?? "On-hit options",
          description: riderMod.riders.map((rider) => rider.name).join(", "),
        })
      }
    }
  }

  return applied
}

function collectWeaponMasteryPicks(inputs: CharacterBuildInputs): string[] {
  const picks = new Set<string>()
  for (const values of Object.values(inputs.modifierPlayerPicks ?? {})) {
    for (const value of values) picks.add(value)
  }
  for (const values of Object.values(inputs.featureChoicePicks ?? {})) {
    for (const value of values) picks.add(value)
  }
  return [...picks]
}

function pickMatchesWeapon(pick: string, weapon: Equipment): boolean {
  const needle = normalizeToken(pick)
  if (!needle) return false
  if (normalizeToken(weapon.name) === needle) return true
  if (weapon.subcategory && normalizeToken(weapon.subcategory).includes(needle)) return true
  if (needle.includes(normalizeToken(weapon.name))) return true
  return false
}

function featureGrantsWeaponMastery(feature: Feature): boolean {
  const migrated = migrateFeatureOptionPickers(feature)
  return migrated.choices?.resourceKey === "weapon_mastery"
}

function characterHasWeaponMasteryFeature(inputs: CharacterBuildInputs): boolean {
  for (const entry of inputs.classLevels) {
    const cls = inputs.classes.find((c) => c.id === entry.classId)
    if (cls?.features?.some((feature) => feature.level <= entry.level && featureGrantsWeaponMastery(feature))) {
      return true
    }
    const subclassId = inputs.subclassByClassId[entry.classId]
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
      const subclass = inputs.subclasses.find((s) => s.id === subclassId)
      if (
        subclass?.features?.some(
          (feature) => feature.level <= entry.level && featureGrantsWeaponMastery(feature),
        )
      ) {
        return true
      }
    }
  }
  return false
}

export function buildWeaponSheetContext(
  weapon: Equipment,
  inputs: CharacterBuildInputs,
  weaponProficiencies: string[],
): WeaponSheetContext {
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

  const equipmentMagicMods = collectEquipmentMagicCharacteristics({
    equipment: inputs.equipment,
    equippedArmorId: inputs.equippedArmorId,
    equippedShieldId: inputs.equippedShieldId,
    equippedWeaponId: inputs.equippedWeaponId,
    attunedItemIds: inputs.attunedItemIds ?? [],
    modifierCatalog: inputs.modifierCatalog,
  })

  const allMods = [...builderMods, ...equipmentMagicMods]
  aggregateCharacteristics(allMods)

  const masteryName = getWeaponMastery(weapon)
  const masteryDescription = masteryName ? describeWeaponMastery(masteryName) : null
  const hasMasteryFeature = characterHasWeaponMasteryFeature(inputs)
  const proficient = isWeaponProficient(weapon, weaponProficiencies)
  const masteryPicks = collectWeaponMasteryPicks(inputs)
  const masteryActive =
    Boolean(masteryName) &&
    hasMasteryFeature &&
    proficient &&
    (masteryPicks.length === 0 || masteryPicks.some((pick) => pickMatchesWeapon(pick, weapon)))

  return {
    masteryName,
    masteryDescription,
    masteryActive,
    appliedModifiers: collectAppliedModifiers(weapon, allMods),
  }
}
