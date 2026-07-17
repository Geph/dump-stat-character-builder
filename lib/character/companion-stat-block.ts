import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

/** How a companion stat scales with the owner character. */
export type CompanionScaleRef =
  | { kind: "ability_modifier"; ability: AbilityScoreKey }
  | { kind: "class_level"; className?: string; multiplier?: number }
  | { kind: "proficiency_bonus" }
  | { kind: "spell_attack_modifier" }
  | { kind: "spell_save_dc" }

export type CompanionScaledPart =
  | { type: "fixed"; value: number }
  | { type: "scale"; ref: CompanionScaleRef }

export type CompanionScaledValue = {
  parts: CompanionScaledPart[]
  /** Human-readable formula from source text. */
  label?: string
}

export type CompanionAbilityRow = {
  score: number
  modifier: number
  save: number
  /**
   * When set (companion formula saves like "+2 plus PB"), resolve against the owner
   * at sheet time; `save` holds the fixed component for fallback display.
   */
  saveFormula?: CompanionScaledValue | null
  /** Original mod string from import (e.g. "+3"). */
  modLabel?: string | null
  /** Original save string from import (e.g. "+2 plus PB"). */
  saveLabel?: string | null
}

export type CompanionNamedBlock = {
  name: string
  description: string
  /** Owner class level gate (companions / retainers). */
  unlockLevel?: number | null
  unlockLevelLabel?: string | null
  /** Parenthetical tag: "2 Ferocity", "Recharge 6", "1/Day", "Signature Attack". */
  tag?: string | null
}

/** Parsed companion stat block (template — resolved at sheet time). */
export type CompanionStatBlockTemplate = {
  name: string
  sizeTypeAlignment?: string | null
  ac: CompanionScaledValue
  hp: CompanionScaledValue
  hitDiceNote?: string | null
  speed?: string | null
  abilityScores?: Partial<Record<AbilityScoreKey, CompanionAbilityRow>>
  resistances?: string[]
  vulnerabilities?: string[]
  damageImmunities?: string[]
  conditionImmunities?: string[]
  senses?: string | null
  languages?: string | null
  /** Skill proficiencies line, e.g. "Perception +5, Stealth +4". */
  skills?: string | null
  /** Saving throw bonuses line, e.g. "Con +2 plus PB". */
  savingThrows?: string | null
  /** Weapon/armor/tool proficiencies line. */
  proficiencies?: string | null
  /** Starting gear line. */
  gear?: string | null
  cr?: string | null
  /** Initiative modifier note, e.g. "+2 (12)". */
  initiative?: string | null
  traits: CompanionNamedBlock[]
  actions: CompanionNamedBlock[]
  bonusActions?: CompanionNamedBlock[]
  reactions?: CompanionNamedBlock[]
  legendaryActions?: CompanionNamedBlock[]
  /**
   * A "polymorph" form (e.g. Druid Wild Shape) where the owner becomes the
   * creature instead of commanding a separate companion. When set, the owner
   * retains their own Hit Points, Intelligence/Wisdom/Charisma scores, and
   * skill/saving throw proficiencies (using the higher modifier).
   */
  polymorph?: boolean
  /** Import schema v2 category — creature (fixed) vs companion (owner-scaled). */
  category?: "creature" | "companion" | null
  /** Companion scaling metadata from import schema v2. */
  scaling?: { scales_with: string; notes: string } | null
  /** XP for fixed-CR creatures; null for companions. */
  xp?: number | null
  /** Printed PB for creatures (e.g. "+2"); companions use owner PB via scaling. */
  proficiencyBonusLabel?: string | null
  /** Parenthetical AC qualifier (natural armor, shield). */
  acNote?: string | null
}

export type CompanionSource = {
  featureName: string
  featureLevel: number
  className: string
  subclassName?: string | null
  classId: string
  subclassId?: string | null
  /** Discriminator when a single feature provides multiple forms (e.g. Druid Beast forms). */
  formName?: string | null
}

export type ResolvedCompanion = {
  key: string
  template: CompanionStatBlockTemplate
  source: CompanionSource
  ac: number
  maxHp: number
  hitDiceLabel?: string | null
  proficiencyBonus: number
  /** True when the form follows polymorph rules (owner HP / mental stats retained). */
  polymorph: boolean
  /**
   * Ability rows to display. For polymorph forms this merges the creature's
   * physical scores with the owner's retained mental scores and the higher
   * save modifier per ability; otherwise it mirrors the template.
   */
  abilityScores?: Partial<Record<AbilityScoreKey, CompanionAbilityRow>>
}

export type CharacterCompanionState = {
  key: string
  currentHp: number | null
  customName?: string | null
  /** Active conditions tracked on the companion sub-sheet. */
  activeConditions?: string[] | null
  /** When true for a polymorph form, owner physical stats use this form on the main sheet. */
  polymorphActive?: boolean | null
}

export type CompanionResolveContext = {
  abilityMods: Record<AbilityScoreKey, number>
  proficiencyBonus: number
  spellAttackModifier: number | null
  spellSaveDc: number | null
  classLevels: { className: string; level: number }[]
  /** Owner stats used to resolve polymorph (Wild Shape) forms. */
  ownerMaxHp?: number
  ownerAbilityScores?: Record<AbilityScoreKey, number>
  /** Full ability names the owner is proficient in for saving throws. */
  ownerSavingThrowProficiencies?: string[]
}

const ABILITY_KEY_MAP: Record<string, AbilityScoreKey> = {
  strength: "strength",
  str: "strength",
  dexterity: "dexterity",
  dex: "dexterity",
  constitution: "constitution",
  con: "constitution",
  intelligence: "intelligence",
  int: "intelligence",
  wisdom: "wisdom",
  wis: "wisdom",
  charisma: "charisma",
  cha: "charisma",
}

export function companionKey(source: CompanionSource): string {
  const subclass = source.subclassId ?? "none"
  const base = `${source.classId}:${subclass}:${slugify(source.featureName)}`
  return source.formName ? `${base}:${slugify(source.formName)}` : base
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

export function parseAbilityKey(word: string): AbilityScoreKey | null {
  return ABILITY_KEY_MAP[word.toLowerCase()] ?? null
}

export function resolveCompanionScaledValue(
  value: CompanionScaledValue,
  ctx: CompanionResolveContext,
): number {
  let total = 0
  for (const part of value.parts) {
    if (part.type === "fixed") {
      total += part.value
      continue
    }
    total += resolveScaleRef(part.ref, ctx)
  }
  return total
}

function resolveScaleRef(ref: CompanionScaleRef, ctx: CompanionResolveContext): number {
  switch (ref.kind) {
    case "ability_modifier":
      return ctx.abilityMods[ref.ability] ?? 0
    case "proficiency_bonus":
      return ctx.proficiencyBonus
    case "spell_attack_modifier":
      return ctx.spellAttackModifier ?? ctx.proficiencyBonus
    case "spell_save_dc":
      return ctx.spellSaveDc ?? 8 + ctx.proficiencyBonus
    case "class_level": {
      const row = ref.className
        ? ctx.classLevels.find((entry) => entry.className.toLowerCase() === ref.className!.toLowerCase())
        : ctx.classLevels[0]
      const level = row?.level ?? 1
      return level * (ref.multiplier ?? 1)
    }
    default:
      return 0
  }
}

const PHYSICAL_ABILITIES: AbilityScoreKey[] = ["strength", "dexterity", "constitution"]
const MENTAL_ABILITIES: AbilityScoreKey[] = ["intelligence", "wisdom", "charisma"]

function abilityFullName(key: AbilityScoreKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function modifierFromScore(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Merge a polymorph creature's stat block with the owner's retained statistics
 * per the 2024 Wild Shape rule: keep the creature's physical scores, the owner's
 * mental scores, and the higher saving-throw modifier for each ability.
 */
function resolvePolymorphAbilityScores(
  template: CompanionStatBlockTemplate,
  ctx: CompanionResolveContext,
): Partial<Record<AbilityScoreKey, CompanionAbilityRow>> {
  const ownerScores = ctx.ownerAbilityScores
  if (!ownerScores) return template.abilityScores ?? {}

  const saveProfs = new Set(ctx.ownerSavingThrowProficiencies ?? [])
  const result: Partial<Record<AbilityScoreKey, CompanionAbilityRow>> = {}

  const ownerRow = (key: AbilityScoreKey): CompanionAbilityRow => {
    const score = ownerScores[key]
    const modifier = ctx.abilityMods[key] ?? modifierFromScore(score)
    const save = modifier + (saveProfs.has(abilityFullName(key)) ? ctx.proficiencyBonus : 0)
    return { score, modifier, save }
  }

  // Physical abilities: use the creature's scores, but take the higher save.
  for (const key of PHYSICAL_ABILITIES) {
    const beast = template.abilityScores?.[key]
    if (!beast) continue
    const resolvedBeast = resolveAbilityRow(beast, ctx)
    const owner = ownerRow(key)
    result[key] = { ...resolvedBeast, save: Math.max(resolvedBeast.save, owner.save) }
  }

  // Mental abilities: retained from the owner.
  for (const key of MENTAL_ABILITIES) {
    result[key] = ownerRow(key)
  }

  return result
}

function resolveAbilityRow(
  row: CompanionAbilityRow,
  ctx: CompanionResolveContext,
): CompanionAbilityRow {
  if (!row.saveFormula) return row
  return {
    ...row,
    save: resolveCompanionScaledValue(row.saveFormula, ctx),
  }
}

function resolveAbilityScores(
  scores: Partial<Record<AbilityScoreKey, CompanionAbilityRow>> | undefined,
  ctx: CompanionResolveContext,
): Partial<Record<AbilityScoreKey, CompanionAbilityRow>> | undefined {
  if (!scores) return undefined
  const result: Partial<Record<AbilityScoreKey, CompanionAbilityRow>> = {}
  for (const key of Object.keys(scores) as AbilityScoreKey[]) {
    const row = scores[key]
    if (row) result[key] = resolveAbilityRow(row, ctx)
  }
  return result
}

export function resolveCompanion(
  template: CompanionStatBlockTemplate,
  source: CompanionSource,
  ctx: CompanionResolveContext,
): ResolvedCompanion {
  const polymorph = Boolean(template.polymorph)
  const maxHp =
    polymorph && typeof ctx.ownerMaxHp === "number"
      ? ctx.ownerMaxHp
      : resolveCompanionScaledValue(template.hp, ctx)

  return {
    key: companionKey(source),
    template,
    source,
    ac: resolveCompanionScaledValue(template.ac, ctx),
    maxHp,
    // Polymorph forms keep the owner's own Hit Point Dice, so drop the beast's note.
    hitDiceLabel: polymorph ? null : template.hitDiceNote ?? null,
    proficiencyBonus: ctx.proficiencyBonus,
    polymorph,
    abilityScores: polymorph
      ? resolvePolymorphAbilityScores(template, ctx)
      : resolveAbilityScores(template.abilityScores, ctx),
  }
}

export function formatScaledValueSummary(
  value: CompanionScaledValue,
  resolved: number,
): string {
  if (value.label) return `${resolved} (${value.label})`
  return String(resolved)
}
