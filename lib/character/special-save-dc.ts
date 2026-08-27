import { resolveSubclassUnlockLevel } from "@/lib/builder/choices"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { CharacterBuildInputs, DerivedSpecialSaveDc } from "@/lib/character/types"
import type { DndClass, Feature } from "@/lib/types"

const ABILITY_WORD: Record<string, AbilityScoreKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
}

function parseAbilityWord(word: string): AbilityScoreKey | null {
  return ABILITY_WORD[word.trim().toLowerCase()] ?? null
}

function titleCase(key: AbilityScoreKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

const NAMED_SAVE_DC =
  /\b(Technique|Psionic|Maneuver)(?:\s+ability)?\s+save\s+DC\s*=\s*8\s*\+\s*your\s+proficiency\s+bonus\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier/i

const MANEUVER_PROSE_DC =
  /(?:maneuver requires a saving throw|maneuver save dc)[^.]*?\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/i

const STRONG_ATTACKS_MANEUVER =
  /add your Strength,?\s+instead of Dexterity,?\s+to your Maneuver save DC/i

function unlockedFeaturesForClass(
  inputs: CharacterBuildInputs,
  classId: string,
  level: number,
): Feature[] {
  const cls = inputs.classes.find((row) => row.id === classId)
  const features: Feature[] = (cls?.features ?? []).filter((feature) => feature.level <= level)
  const subclassId = inputs.subclassByClassId[classId]
  if (subclassId && level >= resolveSubclassUnlockLevel(cls)) {
    const subclass = inputs.subclasses.find((row) => row.id === subclassId)
    features.push(...(subclass?.features ?? []).filter((feature) => feature.level <= level))
  }
  return features
}

function detectSaveDcFromFeatures(features: Feature[]): {
  label: string
  ability: AbilityScoreKey
} | null {
  for (const feature of features) {
    const haystack = stripHtml(`${feature.name ?? ""} ${feature.description ?? ""}`)
    const named = haystack.match(NAMED_SAVE_DC)
    if (named) {
      const ability = parseAbilityWord(named[2] ?? "")
      if (ability) {
        const kind = named[1].toLowerCase()
        const label =
          kind === "psionic"
            ? "Psionic save DC"
            : kind === "maneuver"
              ? "Maneuver save DC"
              : "Technique save DC"
        return { label, ability }
      }
    }
    const prose = haystack.match(MANEUVER_PROSE_DC)
    if (prose) {
      const ability = parseAbilityWord(prose[1] ?? "")
      if (ability) return { label: "Maneuver save DC", ability }
    }
  }
  return null
}

function characterHasStrongAttacksManeuverDc(
  inputs: CharacterBuildInputs,
  classId: string,
  level: number,
): boolean {
  return unlockedFeaturesForClass(inputs, classId, level).some((feature) => {
    const haystack = stripHtml(`${feature.name ?? ""} ${feature.description ?? ""}`)
    return (
      STRONG_ATTACKS_MANEUVER.test(haystack) ||
      (/^heavy gunner$/i.test(feature.name ?? "") && /strong attacks/i.test(haystack))
    )
  })
}

function classSpecialAbility(cls: DndClass): { label: string; ability: AbilityScoreKey } | null {
  const stored = cls.special_ability
  if (!stored?.save_dc_ability) return null
  const ability = parseAbilityWord(stored.save_dc_ability)
  if (!ability) return null
  return {
    label: stored.label?.trim() || "Class save DC",
    ability,
  }
}

export function collectSpecialSaveDcs(
  inputs: CharacterBuildInputs,
  abilityMods: Record<AbilityScoreKey, number>,
  proficiencyBonus: number,
): DerivedSpecialSaveDc[] {
  const entries: DerivedSpecialSaveDc[] = []
  for (const row of inputs.classLevels) {
    const cls = inputs.classes.find((entry) => entry.id === row.classId)
    if (!cls) continue
    const fromClass = classSpecialAbility(cls)
    const fromFeatures = detectSaveDcFromFeatures(
      unlockedFeaturesForClass(inputs, row.classId, row.level),
    )
    const detected = fromClass ?? fromFeatures
    if (!detected) continue

    let ability = detected.ability
    if (
      /maneuver/i.test(detected.label) &&
      characterHasStrongAttacksManeuverDc(inputs, row.classId, row.level)
    ) {
      ability = abilityMods.strength >= abilityMods[detected.ability] ? "strength" : detected.ability
    }

    entries.push({
      classId: cls.id,
      className: cls.name,
      label: detected.label,
      ability,
      abilityLabel: titleCase(ability),
      abilityMod: abilityMods[ability],
      dc: 8 + proficiencyBonus + abilityMods[ability],
    })
  }
  return entries
}
