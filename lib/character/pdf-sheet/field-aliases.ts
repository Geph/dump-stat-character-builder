/**
 * Maps our canonical sheet keys onto the field names used by third-party fillable
 * character sheet PDFs.
 *
 * Two naming families are covered out of the box:
 *  - the `Front_*` / `Back_*` / `Attune_*` family shared by the class-specific and
 *    generic (martial / caster / half-caster / back) sheets;
 *  - the well-named subset of the 2024 PHB fillable sheet (`AC`, `Max HP`, `Level`,
 *    `Equipment Box`, `Spell 3 Name`, …). That sheet also has a large number of
 *    `Text Box 12`-style fields which carry no meaning and are intentionally skipped.
 *
 * Any other fillable PDF works to the extent that its field names normalize onto one
 * of the aliases below, so users can bring their own sheets.
 */

import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { matchSheetProfile, profileTargets } from "./sheet-profiles"

/** Canonical key → value. Booleans drive checkboxes, strings drive text fields. */
export type SheetFieldValues = Record<string, string | boolean>

/**
 * Collapse a PDF field name to a comparable token string: lowercase, punctuation to
 * spaces, and the sheet-side `front` / `back` / `attune` prefix removed so the same
 * alias covers `Front_Character Name` and `Back_Character Name`.
 */
export function normalizePdfFieldName(name: string): string {
  const flattened = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
  return flattened.replace(/^(front|back|attune|attunement) /, "")
}

const ABILITY_TOKENS: Record<AbilityScoreKey, readonly string[]> = {
  strength: ["str", "strength"],
  dexterity: ["dex", "dexterity"],
  constitution: ["con", "constitution"],
  intelligence: ["int", "intelligence"],
  wisdom: ["wis", "wisdom"],
  charisma: ["cha", "charisma"],
}

export const ABILITY_KEYS = Object.keys(ABILITY_TOKENS) as AbilityScoreKey[]

/** Skill name as shown in the compendium, used to build `skill.<slug>.*` keys. */
export const SHEET_SKILL_NAMES = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
] as const

export function sheetSkillSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

/** Number of repeated rows we are willing to fill for each repeating block. */
export const SHEET_BLOCK_LIMITS = {
  weapons: 6,
  spells: 40,
  spellAttacks: 6,
  features: 12,
  magicItems: 5,
} as const

function abilityAliases(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const key of ABILITY_KEYS) {
    const tokens = ABILITY_TOKENS[key]
    out[`ability.${key}.score`] = tokens.map((t) => `${t} score`)
    out[`ability.${key}.mod`] = [
      ...tokens.map((t) => `${t} mod`),
      ...tokens.map((t) => `${t} modifier`),
    ]
    out[`save.${key}.bonus`] = [
      ...tokens.map((t) => `${t} save throw`),
      ...tokens.map((t) => `${t} saving throw`),
      ...tokens.map((t) => `${t} save`),
    ]
    out[`save.${key}.proficient`] = [
      ...tokens.map((t) => `save ${t}`),
      ...tokens.map((t) => `${t} saving throw proficiency`),
      ...tokens.map((t) => `${t} save proficiency`),
    ]
  }
  return out
}

function skillAliases(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const name of SHEET_SKILL_NAMES) {
    const slug = sheetSkillSlug(name)
    const token = name.toLowerCase()
    out[`skill.${slug}.bonus`] = [`skill ${token}`, token]
    out[`skill.${slug}.proficient`] = [`proficiency ${token}`, `${token} proficiency`]
    out[`skill.${slug}.expertise`] = [`expertise ${token}`, `${token} expertise`]
  }
  return out
}

function indexedAliases(): Record<string, string[]> {
  const out: Record<string, string[]> = {}

  for (let n = 1; n <= SHEET_BLOCK_LIMITS.weapons; n += 1) {
    out[`weapon.${n}.name`] = [`weapon name ${n}`, `weapon ${n} name`]
    out[`weapon.${n}.attack`] = [
      `weapon atk bonus ${n}`,
      `weapon ${n} atk bonus`,
      `weapon attack bonus ${n}`,
    ]
    out[`weapon.${n}.damage`] = [`weapon damage ${n}`, `weapon ${n} damage`]
  }

  for (let n = 1; n <= SHEET_BLOCK_LIMITS.spells; n += 1) {
    out[`spell.${n}.name`] = [`spell name ${n}`, `spell ${n} name`]
    out[`spell.${n}.level`] = [`spell level ${n}`, `spell ${n} level`]
    out[`spell.${n}.prepared`] = [`spell prepared ${n}`, `spell ${n} prepared`]
    out[`spell.${n}.ritual`] = [`spell ritual ${n}`, `spell ${n} ritual`]
    out[`spell.${n}.notes`] = [`spell notes ${n}`, `spell ${n} notes`]
  }

  for (let n = 1; n <= SHEET_BLOCK_LIMITS.spellAttacks; n += 1) {
    out[`spellAttack.${n}.name`] = [`spell attack name ${n}`]
    out[`spellAttack.${n}.range`] = [`spell range ${n}`]
    out[`spellAttack.${n}.castingTime`] = [`spell casting time ${n}`]
    out[`spellAttack.${n}.save`] = [`spell save ${n}`]
    out[`spellAttack.${n}.effect`] = [`spell effect ${n}`]
    out[`spellAttack.${n}.concentration`] = [`spell concentration ${n}`]
  }

  for (let n = 1; n <= SHEET_BLOCK_LIMITS.features; n += 1) {
    out[`feature.${n}.name`] = [`feature name ${n}`]
    out[`feature.${n}.text`] = [`feature ${n}`]
    out[`feature.${n}.level`] = [`level value ${n}`]
  }

  for (let n = 1; n <= SHEET_BLOCK_LIMITS.magicItems; n += 1) {
    const padded = String(n).padStart(2, "0")
    out[`magicItem.${n}.name`] = [`item name ${padded}`, `magic item ${n}`]
    out[`magicItem.${n}.effect`] = [`item effect ${padded}`]
    out[`magicItem.${n}.attuned`] = [`item ${padded}`, `magic item ${n} attunement`]
  }

  return out
}

const STATIC_ALIASES: Record<string, string[]> = {
  characterName: ["character name", "charname", "character"],
  playerName: ["player name", "player"],
  className: ["class name", "class", "classes"],
  subclassName: ["archetype", "subclass", "martial archetype", "sacred oath", "arcane tradition"],
  speciesName: ["race", "species", "race species", "ancestry", "lineage"],
  backgroundName: ["background"],
  alignment: ["alignment", "alignment box"],
  level: ["level", "level box", "total level", "character level"],
  xp: ["xp", "exp", "experience points", "experience"],
  size: ["size", "size field"],
  proficiencyBonus: ["proficiency", "prof bonus", "proficiency bonus"],
  inspiration: ["inspiration", "heroic inspiration"],

  armorClass: ["ac", "armor class", "armour class"],
  shieldBonus: ["shield bonus"],
  initiative: ["initiative", "init"],
  speed: ["speed", "walking speed"],
  maxHp: ["max hp", "hp max", "max hit points", "hit point maximum"],
  currentHp: ["current hp", "hp current", "hp"],
  tempHp: ["temp hp", "hp temp", "temporary hit points"],
  hitDiceTotal: ["total hit dice", "hit dice max", "hit dice total", "hit dice"],
  hitDiceUsed: ["used hit dice", "hit dice spent", "hit dice used"],
  hitDie: ["hit die", "hit dice type"],

  passivePerception: ["passive perception", "passive wisdom perception"],
  passiveInsight: ["passive insight"],
  passiveInvestigation: ["passive investigation"],

  languages: ["languages", "languages field", "languages known"],
  toolProficiencies: ["tools", "tool profs", "tool proficiencies"],
  weaponProficiencies: ["weapon profs", "weapon proficiencies"],
  armorProficiencies: ["armor profs", "armour profs", "armor proficiencies"],
  speciesTraits: ["racial traits", "species traits", "race traits"],
  feats: ["feats", "feat"],
  equipment: ["equipment", "equipment box", "backpack", "gear"],

  "classFeatures.1": ["class features 1", "class features"],
  "classFeatures.2": ["class features 2"],
  additionalCombatFeatures: ["additional combat features"],
  additionalFeatures: ["additional features traits", "additional features and traits"],

  "prof.armor.light": ["light armour", "light armor"],
  "prof.armor.medium": ["medium armour", "medium armor"],
  "prof.armor.heavy": ["heavy armour", "heavy armor"],
  "prof.weapons.simple": ["simple weapons"],
  "prof.weapons.martial": ["martial weapons"],
  "prof.shields": ["shields", "shield"],

  spellAttackBonus: ["spell atk", "spell attack bonus", "spell attack"],
  spellSaveDc: ["spell dc", "spell save dc", "spell saving throw dc"],
  spellcastingAbility: ["spellcasting ability", "spell ability"],
  cantripsKnown: ["cantrips known"],
  spellsKnown: ["spells known", "spells prepared"],

  "currency.cp": ["cp", "copper coins", "copper"],
  "currency.sp": ["sp", "silver coins", "silver"],
  "currency.ep": ["ep", "electrum coins", "electrum"],
  "currency.gp": ["gp", "gold coins", "gold"],
  "currency.pp": ["pp", "platinum coins", "platinum"],

  personalityTraits: ["personality traits"],
  ideals: ["ideals"],
  bonds: ["bonds"],
  flaws: ["flaws"],
  backstory: ["backstory", "backstory and personality field", "character backstory"],
  age: ["age"],
  height: ["height"],
  weight: ["weight"],
  eyes: ["eyes"],
  skin: ["skin"],
  hair: ["hair"],
}

/** Canonical sheet key → normalized PDF field names, best match first. */
export const SHEET_FIELD_ALIASES: Readonly<Record<string, readonly string[]>> = {
  ...STATIC_ALIASES,
  ...abilityAliases(),
  ...skillAliases(),
  ...indexedAliases(),
}

/**
 * Index actual PDF field names by their normalized form. Sheets in this family reuse
 * the same name on multiple widgets, so each entry keeps every original name.
 */
export function buildPdfFieldIndex(fieldNames: readonly string[]): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const name of fieldNames) {
    const key = normalizePdfFieldName(name)
    if (!key) continue
    const existing = index.get(key)
    if (existing) {
      if (!existing.includes(name)) existing.push(name)
    } else {
      index.set(key, [name])
    }
  }
  return index
}

/**
 * Prefix for keys that name a PDF field directly rather than a canonical sheet slot.
 * Class-specific sheets label boxes after the feature they hold ("Front_Action Surge",
 * "Front_Fighting Style"), which no fixed alias table can anticipate.
 */
export const DIRECT_FIELD_PREFIX = "field:"

export function directFieldKey(fieldLabel: string): string {
  return `${DIRECT_FIELD_PREFIX}${normalizePdfFieldName(fieldLabel)}`
}

/** Resolve a canonical key to the PDF field names it should write to, if any. */
export function resolveSheetField(
  canonicalKey: string,
  index: Map<string, string[]>,
): string[] {
  if (canonicalKey.startsWith(DIRECT_FIELD_PREFIX)) {
    return index.get(canonicalKey.slice(DIRECT_FIELD_PREFIX.length)) ?? []
  }
  const aliases = SHEET_FIELD_ALIASES[canonicalKey]
  if (!aliases) return []
  for (const alias of aliases) {
    const match = index.get(alias)
    if (match) return match
  }
  return []
}

/** How many canonical keys a template can accept — used to rank template quality. */
export function countMappableFields(fieldNames: readonly string[]): number {
  const index = buildPdfFieldIndex(fieldNames)
  const profile = matchSheetProfile(fieldNames)
  const keys = new Set(Object.keys(SHEET_FIELD_ALIASES))
  if (profile) for (const key of Object.keys(profile.fields)) keys.add(key)

  let count = 0
  for (const key of keys) {
    if (profile && profileTargets(profile, key).length > 0) count += 1
    else if (resolveSheetField(key, index).length > 0) count += 1
  }
  return count
}
