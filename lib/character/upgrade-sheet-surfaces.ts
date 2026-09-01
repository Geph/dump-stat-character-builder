import { firstSentenceFromText } from "@/lib/builder/feature-choice-hint"
import { isPickGatedCustomAbility } from "@/lib/builder/picked-custom-abilities"
import { readLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type {
  CharacteristicModifier,
  ResourceAbilityMenuCharacteristic,
  WeaponAbilityScope,
  WeaponSheetBadgeCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import type { CustomAbility, Feature } from "@/lib/types"

export type UpgradeSheetSurface = "action" | "save" | "weapon" | "speed" | "passive"

const SAVE_TEXT_RE =
  /\bsav(?:e|ing throws?)\b|\bfail(?:ed|s)?\b.{0,48}\b(?:dex(?:terity)?|cha(?:risma)?|check|save)/i
const WEAPON_TEXT_RE =
  /\b(?:ranged|melee|weapon|unarmed)\b.{0,40}\b(?:attack|damage)\b|\b(?:attack|damage)\b.{0,40}\b(?:ranged|melee|weapon|unarmed)\b|\bweapon attacks?\b|\branged (?:weapon )?attacks?\b|\bone-handed melee\b/i
const SPEED_TEXT_RE =
  /\b(?:walking )?speed\b|\bdifficult terrain\b|\bopportunity attacks?\b|\bdoesn['’]t provoke\b/i
const ACTION_ECONOMY_RE =
  /\b(?:as a |as an )?(?:bonus action|reaction)\b|\b(?:as an |as a )?action\b(?!\s+of)/i

function normalizeHaystack(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export function linkedModifiersForCustomAbility(ability: CustomAbility) {
  return readLinkedModifiers(ability as unknown as Record<string, unknown>)
}

export function flattenCustomAbilityCharacteristics(
  ability: CustomAbility,
): CharacteristicModifier[] {
  return linkedModifiersForCustomAbility(ability).flatMap(
    (instance) => instance.characteristics ?? [],
  )
}

export function customAbilityAsFeature(ability: CustomAbility): Feature {
  return {
    name: ability.name,
    description: ability.description ?? null,
    level: ability.level_requirement ?? 1,
    linkedModifiers: linkedModifiersForCustomAbility(ability),
  } as Feature
}

export function characteristicHaystack(mod: CharacteristicModifier): string {
  const parts = [mod.label ?? "", "description" in mod ? String(mod.description ?? "") : ""]
  if (mod.type === "resource_ability_menu") {
    for (const option of mod.options ?? []) {
      parts.push(option.name, option.description ?? "")
    }
  }
  return normalizeHaystack(parts.join(" "))
}

export function customAbilityHaystack(ability: CustomAbility): string {
  const parts = [
    ability.name,
    ability.description ?? "",
    ability.execution ?? "",
    ability.casting_time ?? "",
  ]
  for (const mod of flattenCustomAbilityCharacteristics(ability)) {
    parts.push(characteristicHaystack(mod))
  }
  return normalizeHaystack(parts.join(" "))
}

export function resourceMenuLooksLikeSave(
  mod: ResourceAbilityMenuCharacteristic,
): boolean {
  if ((mod.appliesOnRollKinds ?? []).includes("save")) return true
  return SAVE_TEXT_RE.test(characteristicHaystack(mod))
}

export function resourceMenuLooksLikeWeapon(
  mod: ResourceAbilityMenuCharacteristic,
): boolean {
  if ((mod.appliesOnRollKinds ?? []).includes("attack")) return true
  return WEAPON_TEXT_RE.test(characteristicHaystack(mod))
}

export function weaponScopeFromHaystack(haystack: string): WeaponAbilityScope {
  const text = haystack.toLowerCase()
  if (/\branged\b/.test(text) && !/\bmelee\b/.test(text)) return "ranged"
  if (/\bmelee\b/.test(text) && !/\branged\b/.test(text)) return "melee"
  return "all"
}

export function weaponBadgeFromResourceMenu(
  mod: ResourceAbilityMenuCharacteristic,
): WeaponSheetBadgeCharacteristic | null {
  if (!resourceMenuLooksLikeWeapon(mod)) return null
  const haystack = characteristicHaystack(mod)
  const option = mod.options?.[0]
  return {
    id: `${mod.id}_weapon_badge`,
    type: "weapon_sheet_badge",
    label: mod.label?.trim() || option?.name || "Weapon rider",
    description:
      option?.description?.trim() ||
      mod.label?.trim() ||
      "Add this bonus when the matching weapon attack is made.",
    appliesTo: weaponScopeFromHaystack(haystack),
    includeUnarmed: /\bunarmed\b/i.test(haystack),
    limitations: mod.limitations,
  }
}

function hasAuthoredActionEconomy(ability: CustomAbility): boolean {
  const timing = `${ability.casting_time ?? ""} ${ability.execution ?? ""}`
  if (ACTION_ECONOMY_RE.test(timing)) return true
  for (const instance of linkedModifiersForCustomAbility(ability)) {
    const activation = instance.activation
    if (activation?.action || activation?.bonusAction || activation?.reaction) return true
  }
  return ACTION_ECONOMY_RE.test(customAbilityHaystack(ability))
}

function hasSaveSurface(ability: CustomAbility): boolean {
  for (const mod of flattenCustomAbilityCharacteristics(ability)) {
    if (mod.type === "resource_ability_menu" && resourceMenuLooksLikeSave(mod)) return true
    if (mod.type === "failed_roll_trigger" && mod.rollKind === "save") return true
    if (mod.type === "saving_throw_trigger") return true
  }
  return SAVE_TEXT_RE.test(customAbilityHaystack(ability))
}

function hasWeaponSurface(ability: CustomAbility): boolean {
  for (const mod of flattenCustomAbilityCharacteristics(ability)) {
    if (mod.type === "weapon_sheet_badge" || mod.type === "weapon_ability_override") return true
    if (mod.type === "resource_ability_menu" && resourceMenuLooksLikeWeapon(mod)) return true
    if (mod.type === "failed_roll_trigger" && mod.rollKind === "attack") return true
  }
  return WEAPON_TEXT_RE.test(customAbilityHaystack(ability))
}

function hasSpeedSurface(ability: CustomAbility): boolean {
  for (const mod of flattenCustomAbilityCharacteristics(ability)) {
    if (mod.type === "speed" || mod.type === "movement_effects") return true
  }
  return SPEED_TEXT_RE.test(customAbilityHaystack(ability))
}

/**
 * Pick the Combat chrome a chosen upgrade belongs on. Action-economy rows stay
 * cards; save / weapon / speed riders go to those boxes; everything else is Passive.
 */
export function classifyPickedUpgradeSurface(ability: CustomAbility): UpgradeSheetSurface {
  if (hasAuthoredActionEconomy(ability)) return "action"
  if (hasSaveSurface(ability)) return "save"
  if (hasWeaponSurface(ability)) return "weapon"
  if (hasSpeedSurface(ability)) return "speed"
  return "passive"
}

export function speedOverlayNoteFromAbility(ability: CustomAbility): string | null {
  if (classifyPickedUpgradeSurface(ability) !== "speed") return null
  for (const mod of flattenCustomAbilityCharacteristics(ability)) {
    const label = mod.label?.trim()
    if ((mod.type === "movement_effects" || mod.type === "speed") && label) return label
  }
  const sentence = firstSentenceFromText(ability.description ?? "")
  if (sentence) return `${ability.name}: ${sentence}`
  return ability.name
}

export function collectSpeedOverlayNotes(abilities: CustomAbility[]): string[] {
  const notes: string[] = []
  const seen = new Set<string>()
  for (const ability of abilities) {
    const note = speedOverlayNoteFromAbility(ability)
    if (!note) continue
    const key = note.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    notes.push(note)
  }
  return notes
}

export type SpeedOverlaySource = {
  moveWithoutOpportunityAttacks?: boolean
  ignoreDifficultTerrain?: boolean
  overlayNotes?: string[]
}

/** Notes for every Speed box (Abilities sidebar + Combat tile). */
export function mergeSpeedOverlayNotes(
  movementEffects: SpeedOverlaySource | null | undefined,
  abilities: CustomAbility[],
): string[] {
  const candidates = [
    movementEffects?.moveWithoutOpportunityAttacks
      ? "Movement doesn't provoke Opportunity Attacks"
      : null,
    movementEffects?.ignoreDifficultTerrain ? "Ignore Difficult Terrain" : null,
    ...(movementEffects?.overlayNotes ?? []),
    ...collectSpeedOverlayNotes(abilities),
  ]
  const notes: string[] = []
  const seen = new Set<string>()
  for (const note of candidates) {
    if (!note) continue
    const key = note.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    notes.push(note)
  }
  return notes
}

export function collectUpgradeSurfaceNames(
  abilities: CustomAbility[],
  surfaces: UpgradeSheetSurface[],
): string[] {
  const wanted = new Set(surfaces)
  return abilities
    .filter((ability) => wanted.has(classifyPickedUpgradeSurface(ability)))
    .map((ability) => ability.name)
}

export function shouldEmitUpgradePassiveReminder(ability: CustomAbility): boolean {
  if (classifyPickedUpgradeSurface(ability) !== "passive") return false
  return isPickGatedCustomAbility(ability)
}

export function passiveReminderTrigger(ability: CustomAbility): string {
  const haystack = customAbilityHaystack(ability)
  if (/\bwhile dancing\b/i.test(haystack)) return "While Dancing"
  const sentence = firstSentenceFromText(ability.description ?? "")
  if (/\bwhen\b/i.test(sentence)) return sentence.replace(/\.$/, "")
  return "Always on"
}
