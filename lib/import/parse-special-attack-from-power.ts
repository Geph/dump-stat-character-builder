/**
 * Parse Kibbles-style psionic power bodies into special_attack characteristics.
 * Powers suppress phrase detection, so this runs in ability enrichment instead.
 */
import type {
  SpecialAttackCharacteristic,
  SpecialAttackDieType,
} from "@/lib/compendium/characteristic-modifiers"
import { SPECIAL_ATTACK_DIE_TYPES } from "@/lib/compendium/characteristic-modifiers"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureActivation } from "@/lib/types"

const DAMAGE_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
] as const

const ABILITY_WORDS = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
] as const

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function parseDamageTypes(fragment: string): string[] {
  const lower = fragment.toLowerCase()
  return DAMAGE_TYPES.filter((type) => new RegExp(`\\b${type}\\b`, "i").test(lower)).map(titleCase)
}

function parseDie(fragment: string): { count: number; dieType: SpecialAttackDieType } | null {
  const match = fragment.match(/(\d+)\s*d\s*(4|6|8|10|12)\b/i)
  if (!match) return null
  const dieType = `d${match[2]}` as SpecialAttackDieType
  if (!SPECIAL_ATTACK_DIE_TYPES.includes(dieType)) return null
  return { count: parseInt(match[1], 10) || 1, dieType }
}

function parseRangeFeet(
  plain: string,
  explicitRange?: string | null,
): number | null {
  const fromHeader = explicitRange?.match(/(\d+)\s*(?:feet|foot|ft\.?)/i)
  if (fromHeader) return parseInt(fromHeader[1], 10)
  if (explicitRange && /\bself\b/i.test(explicitRange)) return null
  const within = plain.match(/\bwithin\s+(\d+)\s*(?:feet|foot|ft\.?)\b/i)
  if (within) return parseInt(within[1], 10)
  const travel = plain.match(/\b(?:travelling|travel|up to)\s+(\d+)\s*(?:feet|foot|ft\.?)\b/i)
  if (travel) return parseInt(travel[1], 10)
  return null
}

function parseSaveAbility(plain: string): string | null {
  for (const ability of ABILITY_WORDS) {
    if (new RegExp(`\\b${ability}\\s+saving\\s+throws?\\b`, "i").test(plain)) {
      return ability
    }
  }
  return null
}

function parseSpellAttackProfile(plain: string): "melee" | "ranged" | null {
  if (/\bmelee\s+spell\s+attack\b/i.test(plain)) return "melee"
  if (/\branged\s+spell\s+attack\b/i.test(plain)) return "ranged"
  if (/\bspell\s+attack\b/i.test(plain) && /\branged\b/i.test(plain)) return "ranged"
  if (/\bspell\s+attack\b/i.test(plain) && /\bmelee\b/i.test(plain)) return "melee"
  return null
}

/** Base damaging clause only — ignore augment list items when possible. */
function basePowerBody(plain: string): string {
  const cut = plain.split(
    /\bYou can spend psi points up to your per[- ]use limit\b/i,
  )[0]
  return (cut ?? plain).trim()
}

export type ParsedSpecialAttack = {
  attackProfile: SpecialAttackCharacteristic["attackProfile"]
  targetMode: NonNullable<SpecialAttackCharacteristic["targetMode"]>
  damageDiceCount: number
  damageDieType: SpecialAttackDieType
  damageTypes: string[]
  saveAbility?: string | null
  rangeFeet?: number | null
  areaShape?: SpecialAttackCharacteristic["areaShape"]
  areaLengthFeet?: number | null
  label?: string
}

/**
 * Extract a special_attack from a psionic power / similar activatable description.
 * Returns null when there is no clear attack roll or damaging save.
 */
export function parseSpecialAttackFromPowerDescription(
  description: string,
  options?: { name?: string; range?: string | null },
): ParsedSpecialAttack | null {
  const plain = basePowerBody(stripHtml(description))
  if (!plain) return null

  const attackProfileSpell = parseSpellAttackProfile(plain)
  const saveAbility = parseSaveAbility(plain)
  const isForceSave =
    Boolean(saveAbility) &&
    (/\b(?:must\s+(?:succeed\s+on|make)\s+a\s+\w+\s+saving\s+throw|saving\s+throw\s+or\s+take|on\s+a\s+fail(?:ed|ure))\b/i.test(
      plain,
    ) ||
      /\btake[s]?\s+\d+\s*d\s*\d+\s+[a-z/, ]+damage\b/i.test(plain))

  if (!attackProfileSpell && !isForceSave) return null

  // Prefer the first damage expression in the base body.
  const damageClause =
    plain.match(
      /(?:take[s]?|deals?|dealing)\s+(\d+\s*d\s*(?:4|6|8|10|12))\s+([a-z/, \-]+?)\s+damage\b/i,
    ) ??
    plain.match(
      /(?:takes?)\s+(\d+\s*d\s*(?:4|6|8|10|12))\s+([a-z/, \-]+?)\s+damage\b/i,
    ) ??
    plain.match(/(\d+\s*d\s*(?:4|6|8|10|12))\s+([a-z/, \-]+?)\s+damage\b/i)

  if (!damageClause) return null
  const die = parseDie(damageClause[1])
  if (!die) return null
  const damageTypes = parseDamageTypes(damageClause[2])
  if (!damageTypes.length) return null

  const rangeFeet = parseRangeFeet(plain, options?.range)
  const isArea =
    /\ball\s+creatures?\s+in\b|\bin\s+a\s+\d+[- ]?foot\s+(?:radius|cone|line|cube|sphere)\b|\beach\s+creature\s+in\b/i.test(
      plain,
    )

  let areaShape: SpecialAttackCharacteristic["areaShape"] = null
  let areaLengthFeet: number | null = null
  const cone = plain.match(/(\d+)[- ]?foot\s+cone/i)
  const line = plain.match(/(\d+)[- ]?foot\s+(?:long\s+)?line/i)
  const radius = plain.match(/(\d+)[- ]?foot[- ]radius/i)
  if (cone) {
    areaShape = "cone"
    areaLengthFeet = parseInt(cone[1], 10)
  } else if (line) {
    areaShape = "line"
    areaLengthFeet = parseInt(line[1], 10)
  } else if (radius) {
    areaShape = "sphere"
    areaLengthFeet = parseInt(radius[1], 10)
  } else if (isArea && rangeFeet != null) {
    areaShape = "line"
    areaLengthFeet = rangeFeet
  }

  const attackProfile = attackProfileSpell ?? "force_save"
  const name = options?.name?.trim() || "Special Attack"

  return {
    attackProfile,
    targetMode: isArea || areaShape ? "area" : "single",
    damageDiceCount: die.count,
    damageDieType: die.dieType,
    damageTypes,
    saveAbility: attackProfile === "force_save" ? saveAbility : null,
    rangeFeet,
    areaShape,
    areaLengthFeet,
    label: name,
  }
}

export function specialAttackCharacteristicFromParsed(
  parsed: ParsedSpecialAttack,
  idKey: string,
): SpecialAttackCharacteristic {
  return {
    id: modId(idKey),
    type: "special_attack",
    attackName: parsed.label,
    attackProfile: parsed.attackProfile,
    targetMode: parsed.targetMode,
    properties: ["Psionic"],
    damageTypes: parsed.damageTypes,
    damageDiceCount: parsed.damageDiceCount,
    damageDieType: parsed.damageDieType,
    saveAbility: parsed.saveAbility ?? null,
    saveDCBase: parsed.attackProfile === "force_save" ? 8 : null,
    rangeFeet: parsed.rangeFeet ?? null,
    areaShape: parsed.areaShape ?? null,
    areaLengthFeet: parsed.areaLengthFeet ?? null,
    label: parsed.label,
  }
}

/** Map Casting Time / Execution text onto linked-modifier activation (combat Actions). */
export function activationFromCastingTime(
  castingTime?: string | null,
  fallback: FeatureActivation = { action: true },
): FeatureActivation {
  if (!castingTime?.trim()) return { ...fallback }
  const text = castingTime.toLowerCase()
  if (/\bbonus\s+action\b/.test(text)) return { bonusAction: true }
  if (/\breaction\b/.test(text)) return { reaction: true }
  if (/\b(?:magic\s+)?action\b/.test(text)) return { action: true }
  return { ...fallback }
}

function hasActionEconomy(activation?: FeatureActivation | null): boolean {
  return Boolean(activation?.action || activation?.bonusAction || activation?.reaction)
}

/** Fill Action/Bonus/Reaction on special_attack instances that lack activation. */
export function ensureSpecialAttackActivation(
  linkedModifiers: LinkedModifierInstance[],
  castingTime?: string | null,
): LinkedModifierInstance[] {
  const activation = activationFromCastingTime(castingTime)
  return linkedModifiers.map((instance) => {
    if (!instance.characteristics?.some((char) => char.type === "special_attack")) return instance
    if (hasActionEconomy(instance.activation)) return instance
    return { ...instance, activation }
  })
}

export function specialAttackModifierFromPowerDescription(
  description: string,
  options?: {
    name?: string
    range?: string | null
    castingTime?: string | null
    instanceKey?: string
  },
): LinkedModifierInstance | null {
  const parsed = parseSpecialAttackFromPowerDescription(description, options)
  if (!parsed) return null
  const key = (options?.instanceKey ?? options?.name ?? "special_attack")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase()
  return {
    ...charInstance(
      createModifierInstanceId(),
      characteristicCatalogRefId("special_attack"),
      [specialAttackCharacteristicFromParsed(parsed, `import_${key}_special_attack`)],
    ),
    activation: activationFromCastingTime(options?.castingTime),
  }
}
