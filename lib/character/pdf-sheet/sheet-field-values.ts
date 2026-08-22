import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { DerivedCharacter } from "@/lib/character/types"
import {
  ABILITY_KEYS,
  directFieldKey,
  SHEET_BLOCK_LIMITS,
  SHEET_SKILL_NAMES,
  sheetSkillSlug,
  type SheetFieldValues,
} from "./field-aliases"

export type SheetPdfWeapon = {
  name: string
  attackBonus: number
  damage: string
}

export type SheetPdfSpell = {
  name: string
  level: number
  prepared?: boolean
  ritual?: boolean
  concentration?: boolean
  castingTime?: string | null
  range?: string | null
  /** Short effect/damage summary printed next to the spell. */
  effect?: string | null
  /** Spells with an attack roll or save are also listed in the sheet's attack block. */
  isAttack?: boolean
  save?: string | null
}

export type SheetPdfFeature = {
  name: string
  level?: number | null
  text?: string | null
}

export type SheetPdfMagicItem = {
  name: string
  effect?: string | null
  attuned?: boolean
}

export type SheetPdfCurrency = Partial<Record<"cp" | "sp" | "ep" | "gp" | "pp", number>>

export type SheetPdfCharacterInput = {
  name: string
  playerName?: string | null
  level: number
  experience?: number | null
  className: string
  subclassName?: string | null
  speciesName?: string | null
  backgroundName?: string | null
  alignment?: string | null
  size?: string | null
  appearance?: Record<string, string> | null
  personalityTraits?: string | null
  ideals?: string | null
  bonds?: string | null
  flaws?: string | null
  backstory?: string | null
  inspiration?: boolean
  derived: DerivedCharacter
  hp: { current: number; max: number; temp: number }
  hitDice: { total: number; used: number; die?: string | null }
  weapons: SheetPdfWeapon[]
  spells: SheetPdfSpell[]
  features: SheetPdfFeature[]
  equipmentLines: string[]
  magicItems?: SheetPdfMagicItem[]
  currency?: SheetPdfCurrency
  featNames?: string[]
  speciesTraitNames?: string[]
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

function joinList(values: readonly string[]): string {
  return values.filter(Boolean).join(", ")
}

function includesToken(values: readonly string[], token: string): boolean {
  const needle = token.toLowerCase()
  return values.some((value) => value.toLowerCase().includes(needle))
}

function spellLevelLabel(level: number): string {
  return level === 0 ? "C" : String(level)
}

/**
 * Flatten a character onto canonical sheet keys. Everything is stringified here so the
 * PDF layer only has to worry about which widget a key lands on.
 */
export function buildSheetFieldValues(input: SheetPdfCharacterInput): SheetFieldValues {
  const { derived } = input
  const values: SheetFieldValues = {}

  const set = (key: string, value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) return
    if (typeof value === "boolean") {
      values[key] = value
      return
    }
    const text = String(value)
    if (!text) return
    values[key] = text
  }

  set("characterName", input.name)
  set("playerName", input.playerName)
  set("className", input.className)
  set("subclassName", input.subclassName)
  set("speciesName", input.speciesName)
  set("backgroundName", input.backgroundName)
  set("alignment", input.alignment)
  set("level", input.level)
  set("xp", input.experience)
  set("size", input.size)
  set("proficiencyBonus", signed(derived.proficiencyBonus))
  if (input.inspiration) set("inspiration", true)

  set("armorClass", derived.armorClass)
  set("initiative", signed(derived.initiative))
  set("speed", derived.speed)
  set("maxHp", input.hp.max)
  set("currentHp", input.hp.current)
  if (input.hp.temp > 0) set("tempHp", input.hp.temp)
  set("hitDiceTotal", input.hitDice.total)
  if (input.hitDice.used > 0) set("hitDiceUsed", input.hitDice.used)
  set("hitDie", input.hitDice.die)

  set("passivePerception", derived.passivePerception)
  set("passiveInsight", derived.passiveInsight)
  set("passiveInvestigation", derived.passiveInvestigation)

  for (const ability of ABILITY_KEYS as AbilityScoreKey[]) {
    set(`ability.${ability}.score`, derived.abilityScores[ability])
    set(`ability.${ability}.mod`, signed(derived.abilityMods[ability]))
  }

  for (const save of derived.saves) {
    set(`save.${save.ability}.bonus`, signed(save.bonus + (save.auraBonus ?? 0)))
    set(`save.${save.ability}.proficient`, save.proficient)
  }

  const skillByName = new Map(derived.skills.map((skill) => [skill.name.toLowerCase(), skill]))
  for (const name of SHEET_SKILL_NAMES) {
    const skill = skillByName.get(name.toLowerCase())
    if (!skill) continue
    const slug = sheetSkillSlug(name)
    set(`skill.${slug}.bonus`, signed(skill.bonus))
    set(`skill.${slug}.proficient`, skill.proficient || skill.expertise)
    set(`skill.${slug}.expertise`, skill.expertise)
  }

  const armorProfs = derived.armorProficiencies ?? []
  set("prof.armor.light", includesToken(armorProfs, "light"))
  set("prof.armor.medium", includesToken(armorProfs, "medium"))
  set("prof.armor.heavy", includesToken(armorProfs, "heavy"))
  set("prof.shields", includesToken(armorProfs, "shield"))

  const weaponProfs = derived.weaponProficiencies ?? []
  set("prof.weapons.simple", includesToken(weaponProfs, "simple"))
  set("prof.weapons.martial", includesToken(weaponProfs, "martial"))

  set("languages", joinList(derived.languages ?? []))
  set("toolProficiencies", joinList(derived.toolProficiencies ?? []))
  set("weaponProficiencies", joinList(weaponProfs))
  set("armorProficiencies", joinList(armorProfs))
  set("speciesTraits", joinList(input.speciesTraitNames ?? []))
  set("feats", joinList(input.featNames ?? []))
  set("equipment", input.equipmentLines.join("\n"))

  input.weapons.slice(0, SHEET_BLOCK_LIMITS.weapons).forEach((weapon, i) => {
    const n = i + 1
    set(`weapon.${n}.name`, weapon.name)
    set(`weapon.${n}.attack`, signed(weapon.attackBonus))
    set(`weapon.${n}.damage`, weapon.damage)
  })

  const primaryCasting = derived.spellcasting?.[0]
  if (primaryCasting) {
    set("spellAttackBonus", signed(primaryCasting.attackBonus))
    set("spellSaveDc", primaryCasting.saveDc)
    set("spellcastingAbility", primaryCasting.abilityLabel)
  }

  const sortedSpells = [...input.spells].sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name),
  )
  sortedSpells.slice(0, SHEET_BLOCK_LIMITS.spells).forEach((spell, i) => {
    const n = i + 1
    set(`spell.${n}.name`, spell.name)
    set(`spell.${n}.level`, spellLevelLabel(spell.level))
    if (spell.prepared) set(`spell.${n}.prepared`, true)
    if (spell.ritual) set(`spell.${n}.ritual`, true)
    if (spell.effect) set(`spell.${n}.notes`, spell.effect)
  })
  set("cantripsKnown", sortedSpells.filter((spell) => spell.level === 0).length || null)
  set("spellsKnown", sortedSpells.filter((spell) => spell.level > 0).length || null)

  sortedSpells
    .filter((spell) => spell.isAttack)
    .slice(0, SHEET_BLOCK_LIMITS.spellAttacks)
    .forEach((spell, i) => {
      const n = i + 1
      set(`spellAttack.${n}.name`, spell.name)
      set(`spellAttack.${n}.range`, spell.range)
      set(`spellAttack.${n}.castingTime`, spell.castingTime)
      set(`spellAttack.${n}.save`, spell.save)
      set(`spellAttack.${n}.effect`, spell.effect)
      if (spell.concentration) set(`spellAttack.${n}.concentration`, true)
    })

  input.features.slice(0, SHEET_BLOCK_LIMITS.features).forEach((feature, i) => {
    const n = i + 1
    set(`feature.${n}.name`, feature.name)
    set(`feature.${n}.level`, feature.level)
    set(`feature.${n}.text`, feature.text)
  })

  // Sheets without a per-feature block get the same content as two prose columns.
  const featureLines = input.features.map((feature) =>
    feature.level ? `${feature.name} (lv ${feature.level})` : feature.name,
  )
  const featureSplit = Math.ceil(featureLines.length / 2)
  set("classFeatures.1", featureLines.slice(0, featureSplit).join("\n"))
  set("classFeatures.2", featureLines.slice(featureSplit).join("\n"))
  set("additionalFeatures", joinList(input.featNames ?? []))

  ;(input.magicItems ?? []).slice(0, SHEET_BLOCK_LIMITS.magicItems).forEach((item, i) => {
    const n = i + 1
    set(`magicItem.${n}.name`, item.name)
    set(`magicItem.${n}.effect`, item.effect)
    if (item.attuned) set(`magicItem.${n}.attuned`, true)
  })

  for (const [coin, amount] of Object.entries(input.currency ?? {})) {
    if (typeof amount === "number" && amount > 0) set(`currency.${coin}`, amount)
  }

  set("personalityTraits", input.personalityTraits)
  set("ideals", input.ideals)
  set("bonds", input.bonds)
  set("flaws", input.flaws)
  set("backstory", input.backstory)

  const appearance = input.appearance ?? {}
  for (const key of ["age", "height", "weight", "eyes", "skin", "hair"] as const) {
    set(key, appearance[key])
  }

  // Class sheets pre-print a box per class feature. Offer every feature by name last so
  // it only lands where the template actually has a matching box, and never overwrites
  // a slot a canonical key already claimed.
  for (const feature of input.features) {
    set(directFieldKey(feature.name), feature.text || feature.name)
  }

  return values
}
