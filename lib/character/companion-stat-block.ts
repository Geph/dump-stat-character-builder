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
}

export type CompanionNamedBlock = {
  name: string
  description: string
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
  damageImmunities?: string[]
  conditionImmunities?: string[]
  senses?: string | null
  languages?: string | null
  cr?: string | null
  traits: CompanionNamedBlock[]
  actions: CompanionNamedBlock[]
  bonusActions?: CompanionNamedBlock[]
  reactions?: CompanionNamedBlock[]
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
}

export type CharacterCompanionState = {
  key: string
  currentHp: number | null
  customName?: string | null
}

export type CompanionResolveContext = {
  abilityMods: Record<AbilityScoreKey, number>
  proficiencyBonus: number
  spellAttackModifier: number | null
  spellSaveDc: number | null
  classLevels: { className: string; level: number }[]
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

export function resolveCompanion(
  template: CompanionStatBlockTemplate,
  source: CompanionSource,
  ctx: CompanionResolveContext,
): ResolvedCompanion {
  return {
    key: companionKey(source),
    template,
    source,
    ac: resolveCompanionScaledValue(template.ac, ctx),
    maxHp: resolveCompanionScaledValue(template.hp, ctx),
    hitDiceLabel: template.hitDiceNote ?? null,
    proficiencyBonus: ctx.proficiencyBonus,
  }
}

export function formatScaledValueSummary(
  value: CompanionScaledValue,
  resolved: number,
): string {
  if (value.label) return `${resolved} (${value.label})`
  return String(resolved)
}
