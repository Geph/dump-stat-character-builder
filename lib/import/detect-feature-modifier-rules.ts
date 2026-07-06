import type { AbilityScoreKey, AbilityModifierKey, UnarmedStrikeDie } from "@/lib/compendium/characteristic-modifiers"
import { SKILL_NAMES } from "@/lib/compendium/characteristic-modifiers"
import {
  characteristicCatalogRefId,
  effectCatalogRefId,
} from "@/lib/compendium/modifier-catalog-refs"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import { charInstance, fxInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
import { asiPool } from "@/lib/compendium/feat-modifier-presets"
import {
  buildEvasionModifier,
  buildGrantFeatModifier,
  buildWeaponMasteryModifier,
} from "@/lib/compendium/shared-feature-modifier-builders"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import type { RollBonusConfig } from "@/lib/compendium/roll-bonus-config"
import type { DetectFeatureContext } from "@/lib/import/detect-feature-modifiers"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"
import { THIRD_PARTY_RESOURCE_PATTERNS } from "@/lib/import/third-party-resources"
import type { UsesConfig, FeatureEffect } from "@/lib/types"
import {
  blockedWhenConditionLimitation,
  notWearingArmorLimitation,
  type ModifierLimitation,
} from "@/lib/compendium/modifier-limitations"

export type DetectionConfidence = "high" | "medium" | "low"

export type FeatureModifierRule = {
  id: string
  confidence: DetectionConfidence
  test: RegExp
  build: (match: RegExpMatchArray, ctx: DetectFeatureContext, text: string) => LinkedModifierInstance | null
  /** When "full", match against the entire feature description (not clause segments). */
  scope?: "segment" | "full"
}

export type FeatureNameModifierRule = {
  id: string
  confidence: DetectionConfidence
  test: (featureName: string, ctx: DetectFeatureContext) => boolean
  build: (ctx: DetectFeatureContext) => LinkedModifierInstance | null
  /** When description matches, skip this name rule (phrase rules win). */
  suppressWhenDescriptionMatches?: RegExp[]
}

export const CLASSIC_ASI_PHRASE =
  /increase one ability score of your choice by 2,?\s+or you can increase two ability scores of your choice by 1/i

export const FEAT_ASI_2024_PHRASE =
  /gain the Ability Score Improvement feat or another feat of your choice for which you qualify/i

const ABILITY_WORD_TO_KEY: Record<string, AbilityScoreKey> = {
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

const ABILITY_WORD_TO_SAVE: Record<string, string> = {
  strength: "Strength",
  str: "Strength",
  dexterity: "Dexterity",
  dex: "Dexterity",
  constitution: "Constitution",
  con: "Constitution",
  intelligence: "Intelligence",
  int: "Intelligence",
  wisdom: "Wisdom",
  wis: "Wisdom",
  charisma: "Charisma",
  cha: "Charisma",
}

const DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "poison",
  "psychic",
  "radiant",
  "thunder",
  "bludgeoning",
  "piercing",
  "slashing",
] as const

const CONDITION_NAMES = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
] as const

function instanceKey(ctx: DetectFeatureContext, ruleId: string): string {
  const base = [ctx.contentKind, ctx.sourceName, ctx.featureName, ruleId]
    .filter(Boolean)
    .join("_")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase()
  return `import_${base}`
}

function newInstanceId(): string {
  return createModifierInstanceId()
}

function grantFeatInstance(categories: FeatPickCategory[], label: string): LinkedModifierInstance {
  return buildGrantFeatModifier(categories, label, newInstanceId())
}

// When adding a name rule, add a matching entry in lib/import/modifier-wiring-registry.ts (tests enforce coverage).

export const FEATURE_NAME_MODIFIER_RULES: FeatureNameModifierRule[] = [
  {
    id: "grant.asi_by_name",
    confidence: "high",
    test: (featureName) => /ability score improvement/i.test(featureName),
    build: () => grantFeatInstance(["General"], "General feat"),
    suppressWhenDescriptionMatches: [CLASSIC_ASI_PHRASE],
  },
  {
    id: "grant.epic_boon_by_name",
    confidence: "high",
    test: (featureName) => /^epic boon$/i.test(featureName.trim()),
    build: () => grantFeatInstance(["Epic Boon"], "Epic Boon"),
  },
  {
    id: "grant.fighting_style_by_name",
    confidence: "high",
    test: (featureName) => /^fighting style$/i.test(featureName.trim()),
    build: () => grantFeatInstance(["Fighting Style"], "Fighting Style feat"),
  },
  {
    id: "defensive.evasion_by_name",
    confidence: "high",
    test: (featureName) => /^evasion$/i.test(featureName.trim()),
    build: () => buildEvasionModifier(`modinst_evasion_${newInstanceId()}`),
  },
  {
    id: "weapon.mastery_by_name",
    confidence: "high",
    test: (featureName) => /^weapon mastery$/i.test(featureName.trim()),
    build: () => buildWeaponMasteryModifier(`modinst_weapon_mastery_${newInstanceId()}`),
  },
]

function parseAbilityWord(word: string): AbilityScoreKey | null {
  return ABILITY_WORD_TO_KEY[word.trim().toLowerCase()] ?? null
}

const ABILITY_SCORE_TO_MODIFIER: Record<AbilityScoreKey, AbilityModifierKey> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
}

function abilityScoreToModifierKey(key: AbilityScoreKey): AbilityModifierKey {
  return ABILITY_SCORE_TO_MODIFIER[key]
}

function parseSaveAbility(word: string): string | null {
  return ABILITY_WORD_TO_SAVE[word.trim().toLowerCase()] ?? null
}

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function matchSkillName(fragment: string): string | null {
  const stripped = fragment
    .replace(/^the\s+/i, "")
    .replace(/\s+skill$/i, "")
    .trim()
  const normalized = titleCaseWords(stripped.replace(/\s+and\s+/gi, " "))
  for (const skill of SKILL_NAMES) {
    if (skill.toLowerCase() === normalized.toLowerCase()) return skill
  }
  const multi = fragment.split(/\s*,\s*|\s+and\s+/i).map((part) => titleCaseWords(part.trim()))
  for (const part of multi) {
    for (const skill of SKILL_NAMES) {
      if (skill.toLowerCase() === part.toLowerCase()) return skill
    }
  }
  return null
}

function parseSkillList(fragment: string): string[] {
  const parts = fragment.split(/\s*,\s*|\s+and\s+/i).map((part) => part.trim()).filter(Boolean)
  const skills: string[] = []
  for (const part of parts) {
    const skill = matchSkillName(part)
    if (skill && !skills.includes(skill)) skills.push(skill)
  }
  return skills
}

function parseLimitationsFromText(text: string): ModifierLimitation[] {
  const limitations: ModifierLimitation[] = []
  if (/unless you have the incapacitated condition/i.test(text)) {
    limitations.push(blockedWhenConditionLimitation("Incapacitated"))
  }
  if (/while you don'?t have the incapacitated condition/i.test(text)) {
    limitations.push(blockedWhenConditionLimitation("Incapacitated"))
  }
  if (/while you aren'?t wearing heavy armor/i.test(text) || /while not wearing heavy armor/i.test(text)) {
    limitations.push(notWearingArmorLimitation("Heavy armor"))
  }
  if (/while you aren'?t wearing armor/i.test(text) && !/heavy armor/i.test(text)) {
    limitations.push(notWearingArmorLimitation("Any armor"))
  }
  if (/not wielding a shield/i.test(text) || /without a shield/i.test(text)) {
    limitations.push(notWearingArmorLimitation("Shield"))
  }
  return limitations
}

function buildCheckRollModifier(
  ctx: DetectFeatureContext,
  ruleSuffix: string,
  options: {
    checkRollMode: "advantage" | "disadvantage"
    checkCategory: "save" | "skill" | "initiative" | "attack" | "ability"
    checkAbility?: string | null
    checkSkills?: string[]
  },
  sourceText?: string,
): LinkedModifierInstance {
  return fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), {
    effects: [
      {
        id: modId(instanceKey(ctx, ruleSuffix)),
        kind: "check_roll_modifier",
        checkRollMode: options.checkRollMode,
        checkCategory: options.checkCategory,
        checkAbility: options.checkAbility ?? null,
        checkSkills: options.checkSkills,
        limitations: sourceText ? parseLimitationsFromText(sourceText) : [],
      },
    ],
  })
}

function parseDamageTypes(fragment: string): string[] {
  const lower = fragment.toLowerCase()
  return DAMAGE_TYPES.filter((type) => lower.includes(type)).map(
    (type) => type.charAt(0).toUpperCase() + type.slice(1),
  )
}

function parseCondition(fragment: string): string | null {
  const normalized = titleCaseWords(fragment.replace(/the\s+/i, "").replace(/\s+condition$/i, ""))
  for (const condition of CONDITION_NAMES) {
    if (condition.toLowerCase() === normalized.toLowerCase()) return condition
  }
  return null
}

function parseRechargeRest(fragment: string): UsesConfig["recharges"] {
  const lower = fragment.toLowerCase()
  if (lower.includes("short") && lower.includes("long")) {
    return [{ rest: "short_rest" }, { rest: "long_rest" }]
  }
  if (lower.includes("short")) return [{ rest: "short_rest" }]
  return [{ rest: "long_rest" }]
}

function parseCritRangeMinimum(fragment: string): number | null {
  const range = fragment.match(/(\d+)\s*(?:or|through|–|-|to)\s*(\d+)/i)
  if (range) return Math.min(parseInt(range[1], 10), parseInt(range[2], 10))
  const single = fragment.match(/(\d+)/)
  return single ? parseInt(single[1], 10) : null
}

function parseAttackTargetFromText(text: string): string {
  if (/ranged\s+weapons?/i.test(text)) return "ranged"
  if (/melee\s+weapons?/i.test(text)) return "melee"
  if (/weapon\s+attacks?/i.test(text)) return "all"
  return "all"
}

function parseAttackCoverFlags(text: string): Pick<
  import("@/lib/compendium/characteristic-modifiers").RollModifierEntry,
  "ignoreHalfCover" | "treatThreeQuartersCoverAsHalf"
> {
  return {
    ignoreHalfCover: /\bignore\s+half[- ]cover\b/i.test(text),
    treatThreeQuartersCoverAsHalf:
      /\btreat\s+three[- ]quarter(?:s|'s)?\s+cover\s+as\s+half\s+cover\b/i.test(text),
  }
}

function parseAttackBonusTarget(text: string, fallback = "all"): string {
  const withWeapons = text.match(/\battack\s+rolls?\s+with\s+(ranged|melee)\s+weapons?\b/i)
  if (withWeapons) return withWeapons[1].toLowerCase()
  return parseAttackTargetFromText(text) === "all" ? fallback : parseAttackTargetFromText(text)
}

function buildAttackRollBonusModifier(
  ctx: DetectFeatureContext,
  bonus: number,
  target: string,
  text: string,
  ruleSuffix: string,
): LinkedModifierInstance {
  const cover = parseAttackCoverFlags(text)
  return charInstance(newInstanceId(), characteristicCatalogRefId("attack_roll_modifiers"), [
    {
      id: modId(instanceKey(ctx, ruleSuffix)),
      type: "attack_roll_modifiers",
      entries: [
        {
          bonus,
          target,
          ...(cover.ignoreHalfCover ? { ignoreHalfCover: true } : {}),
          ...(cover.treatThreeQuartersCoverAsHalf ? { treatThreeQuartersCoverAsHalf: true } : {}),
        },
      ],
    },
  ])
}

function normalizeSpeedTypeWord(word: string): "climb" | "swim" | "fly" | "walk" | null {
  const normalized = word.toLowerCase().replace(/\s+speed$/i, "").replace(/^a\s+/i, "").trim()
  if (normalized.startsWith("climb")) return "climb"
  if (normalized.startsWith("swim")) return "swim"
  if (normalized.startsWith("fly")) return "fly"
  if (normalized.startsWith("walk")) return "walk"
  return null
}

function parseSpeedTypesEqualToWalk(text: string): ("climb" | "swim" | "fly")[] {
  const match = text.match(
    /((?:a\s+)?(?:climb(?:ing)?|swim(?:ming)?|fly(?:ing)?)(?:\s+speed)?(?:\s+and\s+(?:a\s+)?(?:climb(?:ing)?|swim(?:ming)?|fly(?:ing)?)(?:\s+speed)?)*)\s+equal to your (?:walking|walk)\s+speed/i,
  )
  if (!match) return []
  const types: ("climb" | "swim" | "fly")[] = []
  for (const part of match[1].split(/\s+and\s+/i)) {
    const speedType = normalizeSpeedTypeWord(part)
    if (speedType && speedType !== "walk" && !types.includes(speedType)) {
      types.push(speedType)
    }
  }
  return types
}

function buildSpeedEqualToWalkModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  const types = parseSpeedTypesEqualToWalk(text)
  if (!types.length) return null
  return charInstance(newInstanceId(), characteristicCatalogRefId("speed"), [
    ...types.map((speedType) => ({
      id: modId(instanceKey(ctx, `speed_${speedType}_walk`)),
      type: "speed" as const,
      speedType,
      mode: "equal_to_walk" as const,
      value: 0,
      label: `${titleCaseWords(speedType)} speed = walk`,
    })),
  ])
}

function buildCritBonusDamageModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  if (!/critical\s+hit/i.test(text)) return null
  const hasLevelBonus =
    /bonus damage equal to your (?:\w+\s+)?level/i.test(text) ||
    /deal(?:s)?\s+bonus damage equal to your (?:\w+\s+)?level/i.test(text)
  if (!hasLevelBonus) return null

  const target = parseAttackTargetFromText(text)
  const appliesTo =
    target === "all" ? "weapon attacks" : `${target} weapon attacks`

  return charInstance(newInstanceId(), characteristicCatalogRefId("bonus_damage_riders"), [
    {
      id: modId(instanceKey(ctx, "crit_bonus_level")),
      type: "bonus_damage_riders",
      triggerOn: "on_crit",
      automaticBonus: { mode: "character_level" },
      appliesTo,
      riders: [],
      maxRidersPerUse: 1,
      label: "Bonus damage on crit = character level",
    },
  ])
}

function buildCritMaximizeModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  if (!/critical\s+hit/i.test(text) || !/maximize the damage/i.test(text)) return null
  const levelMatch = text.match(
    /At\s+(\d+)(?:st|nd|rd|th)?\s+level,?\s+when you score a critical hit/i,
  )
  const level = levelMatch ? parseInt(levelMatch[1], 10) : null
  const target = parseAttackTargetFromText(text)
  const appliesTo =
    target === "all" ? "weapon attacks" : `${target} weapon attacks`

  return charInstance(newInstanceId(), characteristicCatalogRefId("on_hit_trigger"), [
    {
      id: modId(instanceKey(ctx, "crit_maximize")),
      type: "on_hit_trigger",
      triggerOn: "crit",
      maximizeWeaponDamage: true,
      maximizeWeaponDamageAtLevel: Number.isFinite(level ?? NaN) ? level : null,
      oncePerTurn: false,
      appliesTo,
      label: level ? `Maximize crit damage at level ${level}` : "Maximize crit damage",
    },
  ])
}

const SAVE_ABILITY_NAMES = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
] as const

function parseSaveAbilitiesFromText(text: string): string[] {
  const beforeSave = text.match(/([\w\s,or]+)\s+saving throws?\b/i)
  if (!beforeSave) return []
  return SAVE_ABILITY_NAMES.filter((ability) =>
    new RegExp(`\\b${ability}\\b`, "i").test(beforeSave[1]),
  )
}

function parseResourceDieKey(text: string): string | null {
  const match = text.match(/your\s+(\w+(?:\s+\w+)?)\s+Die\b/i)
  if (!match) return null
  const phrase = match[1].trim()
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (pattern.namePattern.test(`${phrase} Die`) || pattern.namePattern.test(phrase)) {
      if (pattern.resourceKey === "exploit_die_size") return "exploit_dice"
      return pattern.resourceKey
    }
  }
  if (/^exploit$/i.test(phrase)) return "exploit_dice"
  return `${phrase.toLowerCase().replace(/\s+/g, "_")}_dice`
}

const RESOURCE_DIE_BONUS_PHRASE =
  /bonus to (?:the|your) roll equal to your \w+(?:\s+\w+)?\s+Die/i

function buildResourceDieCheckBonus(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  if (!RESOURCE_DIE_BONUS_PHRASE.test(text)) return null
  const resourceKey = parseResourceDieKey(text)
  if (!resourceKey) return null

  const bonusConfig: RollBonusConfig = {
    mode: "die",
    dieScaling: "class_resource",
    classResourceKey: resourceKey,
  }
  const abilities = parseSaveAbilitiesFromText(text)
  const rollKind = /saving throw/i.test(text) ? "save" : "ability"

  const effects: FeatureEffect[] =
    abilities.length > 0
      ? abilities.map((ability, index) => ({
          id: modId(instanceKey(ctx, `resource_die_${ability}_${index}`)),
          kind: "check_roll_modifier" as const,
          checkRollMode: "bonus" as const,
          checkCategory: "save" as const,
          checkAbility: ability,
          bonusConfig,
        }))
      : [
          {
            id: modId(instanceKey(ctx, "resource_die")),
            kind: "check_roll_modifier" as const,
            checkRollMode: "bonus" as const,
            checkCategory: rollKind as FeatureEffect["checkCategory"],
            bonusConfig,
          },
        ]

  return fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), { effects })
}

function parseExpendedResourceKey(text: string): string {
  const match = text.match(/without expending an?\s+([\w\s]+?)\s+Die\b/i)
  if (!match) return "exploit_dice"
  const phrase = match[1].trim()
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (
      pattern.namePattern.test(`${phrase} Die`) ||
      pattern.namePattern.test(`${phrase} Dice`) ||
      pattern.namePattern.test(phrase)
    ) {
      return pattern.resourceKey
    }
  }
  return `${phrase.toLowerCase().replace(/\s+/g, "_")}_dice`
}

function parseAbilitiesBeforeCheck(text: string): string[] {
  const match = text.match(/When you make a ([^.]+?) ability check or saving throw/i)
  if (!match) return []
  return SAVE_ABILITY_NAMES.filter((ability) =>
    new RegExp(`\\b${ability}\\b`, "i").test(match[1]),
  )
}

function parseRollKindsFromCheckPhrase(text: string): import("@/lib/compendium/characteristic-modifiers").RollTriggerKind[] {
  const kinds: import("@/lib/compendium/characteristic-modifiers").RollTriggerKind[] = []
  if (/ability check/i.test(text)) kinds.push("ability")
  if (/saving throw/i.test(text)) kinds.push("save")
  return kinds
}

function parseNamedAbilityOptions(text: string): string[] {
  const match = text.match(/you can use (.+?) without expending/i)
  if (!match) return []
  return match[1]
    .split(/\s+or\s+/i)
    .map((name) => titleCaseWords(name.trim()))
    .filter(Boolean)
}

function buildFreeResourceUseOnRollModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  if (!/without expending/i.test(text)) return null
  const optionNames = parseNamedAbilityOptions(text)
  if (!optionNames.length) return null

  const resourceKey = parseExpendedResourceKey(text)
  const appliesOnAbilities = parseAbilitiesBeforeCheck(text)
  const appliesOnRollKinds = parseRollKindsFromCheckPhrase(text)

  return charInstance(newInstanceId(), characteristicCatalogRefId("resource_ability_menu"), [
    {
      id: modId(instanceKey(ctx, "free_resource_use")),
      type: "resource_ability_menu",
      resourceKey,
      waiveResourceCost: true,
      appliesOnRollKinds,
      appliesOnAbilities,
      options: optionNames.map((name) => ({
        name,
        resourceCost: 0,
      })),
      label: `Free ${optionNames.join(" / ")} on ${appliesOnAbilities.join("/") || "matching"} rolls`,
    },
  ])
}

function parseAbilityScoreKeyFromWord(word: string): "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA" | null {
  const normalized = word.toLowerCase()
  const map: Record<string, "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"> = {
    strength: "STR",
    dexterity: "DEX",
    constitution: "CON",
    intelligence: "INT",
    wisdom: "WIS",
    charisma: "CHA",
  }
  return map[normalized] ?? null
}

function buildWarriorSpiritTurnStartModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  const match = text.match(
    /regain\s+(\d+)\s+ki\s+at\s+the\s+start\s+of\s+each\s+of\s+your\s+turns/i,
  )
  if (!match) return null
  const amount = parseInt(match[1], 10) || 1
  const blockedByConditions = /incapacitated/i.test(text) ? ["Incapacitated"] : []

  return charInstance(newInstanceId(), characteristicCatalogRefId("turn_start_trigger"), [
    {
      id: modId(instanceKey(ctx, "warriors_spirit")),
      type: "turn_start_trigger",
      restoreResourceKey: "ki_points",
      restoreResourceAmount: amount,
      blockedByConditions,
      label: `Regain ${amount} Ki at turn start`,
    },
  ])
}

function buildTechniqueOnHitModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  const match = text.match(
    /once per turn when you hit[\s\S]{0,200}?\b(?:spend|expend)\s+(\d+)\s+ki\b/i,
  )
  if (!match) return null
  const amount = parseInt(match[1], 10) || 1
  return charInstance(newInstanceId(), characteristicCatalogRefId("on_hit_trigger"), [
    {
      id: modId(instanceKey(ctx, "technique_on_hit")),
      type: "on_hit_trigger",
      oncePerTurn: true,
      spendResourceKey: "ki_points",
      spendResourceAmount: amount,
      label: "Mystic Technique (on hit)",
    },
  ])
}

function buildTurnStartLowHpHealModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  if (!/begin your turn/i.test(text) || !/regain hit points/i.test(text)) return null

  const healMatch = text.match(/regain hit points equal to (\d+) \+ your (\w+) modifier/i)
  if (!healMatch) return null

  const healFixed = parseInt(healMatch[1], 10)
  const healAbility = parseAbilityScoreKeyFromWord(healMatch[2])
  if (!Number.isFinite(healFixed) || !healAbility) return null

  const hpBelowFraction = /less than half of your hit points/i.test(text) ? 0.5 : null
  const hpAtLeastMatch = text.match(/at least (\d+) hit point/i)
  const hpAtLeast = hpAtLeastMatch ? parseInt(hpAtLeastMatch[1], 10) : 1

  return charInstance(newInstanceId(), characteristicCatalogRefId("turn_start_trigger"), [
    {
      id: modId(instanceKey(ctx, "turn_start_heal")),
      type: "turn_start_trigger",
      hpBelowFraction,
      hpAtLeast,
      effect: {
        catalogRefId: effectCatalogRefId("heal_self"),
        activation: {
          effects: [
            {
              id: modId(instanceKey(ctx, "turn_start_heal_fx")),
              kind: "heal_self",
              healMode: "fixed",
              healFixed,
              healAbility,
            },
          ],
        },
      },
      label: `Regain ${healFixed} + ${healAbility} at turn start below half HP`,
    },
  ])
}

function buildDamageDieScalingByLevelModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  const tiers: BonusByLevelEntry[] = []
  const regex = /at\s+(\d+)(?:st|nd|rd|th)?\s+level[\s\S]{0,120}?(\d+)d(\d+)/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const level = parseInt(match[1], 10)
    const dieCount = parseInt(match[2], 10)
    const dieSides = parseInt(match[3], 10)
    if (!Number.isFinite(level) || !Number.isFinite(dieCount) || !Number.isFinite(dieSides)) continue
    tiers.push({
      level,
      mode: "dice",
      dieCount,
      dieType: (`d${dieSides}` as BonusByLevelEntry["dieType"]),
    })
  }
  if (tiers.length < 2) return null

  const sorted = [...tiers].sort((a, b) => a.level - b.level)
  return charInstance(newInstanceId(), characteristicCatalogRefId("unarmed_strike_damage"), [
    {
      id: modId(instanceKey(ctx, "damage_die_scaling")),
      type: "unarmed_strike_damage",
      die: `${sorted[0].dieCount ?? 1}${sorted[0].dieType ?? "d6"}` as UnarmedStrikeDie,
      dieByLevel: sorted,
      label: "Scaling damage die by level",
    },
  ])
}

function buildCriticalHitScalingModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  if (!/critical\s+hit/i.test(text)) return null

  const target = parseAttackTargetFromText(text)
  const byLevel: BonusByLevelEntry[] = []
  let baseMinimum: number | null = null

  const critPhrases = [
    /(?:score|can score)\s+(?:a\s+)?critical\s+hit\s+on\s+(?:a\s+)?(?:d20\s+)?roll\s+of\s+([^.;]+)/gi,
    /critical\s+hit\s+on\s+(?:a\s+)?(?:d20\s+)?roll\s+of\s+([^.;]+)/gi,
  ]

  for (const re of critPhrases) {
    const match = re.exec(text)
    if (match) {
      baseMinimum = parseCritRangeMinimum(match[1])
      break
    }
  }

  for (const match of text.matchAll(
    /At\s+(?:(\d+)(?:st|nd|rd|th)?\s+level|level\s+(\d+)),?\s+(?:your\s+attack\s+rolls\s+with\s+\w+\s+weapons?\s+)?(?:score|can score).*?critical\s+hit\s+on\s+(?:a\s+)?roll\s+of\s+([^.;]+)/gi,
  )) {
    const level = parseInt(match[1] ?? match[2], 10)
    const min = parseCritRangeMinimum(match[3])
    if (Number.isFinite(level) && min != null) {
      byLevel.push({ level, mode: "fixed", fixed: min })
    }
  }

  for (const match of text.matchAll(
    /At\s+(?:(\d+)(?:st|nd|rd|th)?\s+level|level\s+(\d+)),?\s+they\s+(?:can\s+)?score.*?critical\s+hit\s+on\s+(?:a\s+)?roll\s+of\s+([^.;]+)/gi,
  )) {
    const level = parseInt(match[1] ?? match[2], 10)
    const min = parseCritRangeMinimum(match[3])
    if (Number.isFinite(level) && min != null) {
      byLevel.push({ level, mode: "fixed", fixed: min })
    }
  }

  for (const match of text.matchAll(
    /At\s+(\d+)(?:st|nd|rd|th)?\s+level,?\s+this\s+critical\s+hit\s+range\s+increases.*?(\d+)\s+through\s+(\d+)/gi,
  )) {
    const level = parseInt(match[1], 10)
    const min = Math.min(parseInt(match[2], 10), parseInt(match[3], 10))
    if (Number.isFinite(level) && Number.isFinite(min)) {
      byLevel.push({ level, mode: "fixed", fixed: min })
    }
  }

  if (baseMinimum == null && !byLevel.length) return null

  const sortedByLevel = byLevel.sort((a, b) => a.level - b.level)

  return charInstance(newInstanceId(), characteristicCatalogRefId("attack_roll_modifiers"), [
    {
      id: modId(instanceKey(ctx, "crit_scaling")),
      type: "attack_roll_modifiers",
      entries: [
        {
          bonus: 0,
          target,
          criticalHitMinimum: baseMinimum,
          criticalHitMinimumByLevel: sortedByLevel,
        },
      ],
      label:
        target === "all"
          ? `Critical hit ${baseMinimum ?? sortedByLevel[0]?.fixed}–20${sortedByLevel.length ? " (by level)" : ""}`
          : `${titleCaseWords(target)} weapon critical hit range`,
    },
  ])
}

function buildWeaponDamageModifierFromText(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  const grantMissing =
    /doesn['\u2019]t add your ability modifier to the roll[\s\S]{0,160}add your ability modifier/i.test(
      text,
    ) ||
    /does not add your ability modifier[\s\S]{0,160}add your ability modifier/i.test(text) ||
    /add your ability modifier nonetheless/i.test(text)
  const extraDiceMatch = text.match(
    /(?:takes?|deal(?:s)?)\s+(?:an?\s+)?extra\s+(\d+d\d+)\s+damage/i,
  )
  const target = /ranged\s+weapons?/i.test(text)
    ? "ranged"
    : /melee\s+weapons?/i.test(text)
      ? "melee"
      : "all"
  if (!grantMissing && !extraDiceMatch) return null

  return charInstance(newInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
    {
      id: modId(instanceKey(ctx, "weapon_damage")),
      type: "damage_roll_modifiers",
      entries: [
        {
          bonus: 0,
          target,
          grantAbilityModifierWhenMissing: grantMissing,
          bonusDiceWhenModifierIncluded: extraDiceMatch?.[1] ?? null,
          bonusDiceUsesWeaponDamageType: Boolean(extraDiceMatch && /weapon'?s type/i.test(text)),
        },
      ],
      label:
        grantMissing && extraDiceMatch
          ? "Add ability mod to damage when missing; extra dice when already added"
          : grantMissing
            ? "Add ability modifier to weapon damage when missing"
            : `Extra ${extraDiceMatch?.[1]} when ability modifier already on damage`,
    },
  ])
}

// When adding a rule, add a matching entry in lib/import/modifier-wiring-registry.ts (tests enforce coverage).

export const FEATURE_MODIFIER_RULES: FeatureModifierRule[] = [
  {
    id: "proficiency.skills.list",
    confidence: "high",
    test: /\b(?:gain|have|you are)\s+proficien(?:cy|t)\s+(?:with|in)\s+([^.;\n]+)/i,
    build: (match, ctx) => {
      const skills = parseSkillList(match[1])
      if (!skills.length) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("skills"), [
        {
          id: modId(instanceKey(ctx, "skills")),
          type: "skills",
          entries: skills.map((skill) => ({ skill, expertise: false })),
        },
      ])
    },
  },
  {
    id: "proficiency.skills.choice",
    confidence: "medium",
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+(?:one|two|three|four|\d+)\s+skills?\b/i,
    build: (match, ctx) => {
      const countMatch = match[0].match(/\b(one|two|three|four|\d+)\s+skills?\b/i)
      const wordToCount: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
      const raw = countMatch?.[1]?.toLowerCase() ?? "1"
      const count = wordToCount[raw] ?? parseInt(raw, 10)
      if (!Number.isFinite(count) || count < 1) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("skills"), [
        {
          id: modId(instanceKey(ctx, "skills_choice")),
          type: "skills",
          entries: [],
          allowAnySkill: true,
          choiceCount: count,
        },
      ])
    },
  },
  {
    id: "proficiency.expertise",
    confidence: "high",
    test: /\bexpertise\s+(?:with|in)\s+([^.;\n]+)/i,
    build: (match, ctx) => {
      const skills = parseSkillList(match[1])
      if (!skills.length) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("skills"), [
        {
          id: modId(instanceKey(ctx, "expertise")),
          type: "skills",
          entries: skills.map((skill) => ({ skill, expertise: true })),
          grantExpertise: true,
        },
      ])
    },
  },
  {
    id: "proficiency.tools.expertise",
    confidence: "high",
    test:
      /\bproficiency bonus is doubled\b[^.]{0,120}\btool proficienc(?:y|ies)\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("tool_proficiencies"), [
        {
          id: modId(instanceKey(ctx, "tool_expertise")),
          type: "tool_proficiencies",
          values: [],
          grantExpertise: true,
          label: "Double proficiency on class tool checks",
        },
      ]),
  },
  {
    id: "attunement.slots.total",
    confidence: "high",
    scope: "full",
    test:
      /\b(?:can\s+(?:now\s+)?)?attune to up to (three|four|five|six|seven|eight|nine|ten|\d+) magic items?\b/i,
    build: (match, ctx) => {
      const WORD_NUMBERS: Record<string, number> = {
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
      }
      const raw = match[1].toLowerCase()
      const total = WORD_NUMBERS[raw] ?? parseInt(raw, 10)
      if (!Number.isFinite(total) || total < 1) return null
      return charInstance(newInstanceId(), "cat_char_attunement_slots", [
        {
          id: modId(instanceKey(ctx, "attune")),
          type: "attunement_slots",
          totalSlots: total,
          label: `Attune to ${total} magic items`,
        },
      ])
    },
  },
  {
    id: "proficiency.tools",
    confidence: "high",
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+(?:the\s+)?([^.;\n]+?(?:'s|’s)?\s+(?:supplies|tools|kit|kits|instruments?))/i,
    build: (match, ctx) => {
      const tool = titleCaseWords(match[1].trim())
      if (!tool || /skills?|weapons?|armor/i.test(tool)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("tool_proficiencies"), [
        {
          id: modId(instanceKey(ctx, "tools")),
          type: "tool_proficiencies",
          values: [tool],
        },
      ])
    },
  },
  {
    id: "proficiency.weapons.martial",
    confidence: "high",
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+martial\s+(?:weapons?|weapon\s+proficiencies?)/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("weapon_proficiencies"), [
        {
          id: modId(instanceKey(ctx, "martial_weapons")),
          type: "weapon_proficiencies",
          mode: "martial_weapons",
          values: [],
        },
      ]),
  },
  {
    id: "proficiency.armor.heavy",
    confidence: "high",
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+heavy\s+armor\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("armor_proficiencies"), [
        {
          id: modId(instanceKey(ctx, "heavy_armor")),
          type: "armor_proficiencies",
          values: ["Heavy armor"],
        },
      ]),
  },
  {
    id: "proficiency.armor.medium",
    confidence: "high",
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+medium\s+armor\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("armor_proficiencies"), [
        {
          id: modId(instanceKey(ctx, "medium_armor")),
          type: "armor_proficiencies",
          values: ["Medium armor"],
        },
      ]),
  },
  {
    id: "proficiency.armor.shields",
    confidence: "high",
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+shields?\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("armor_proficiencies"), [
        {
          id: modId(instanceKey(ctx, "shields")),
          type: "armor_proficiencies",
          values: ["Shields"],
        },
      ]),
  },
  {
    id: "proficiency.saves",
    confidence: "high",
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+([A-Za-z]+)\s+saving\s+throws?\b/i,
    build: (match, ctx) => {
      const save = parseSaveAbility(match[1])
      if (!save) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("saving_throws"), [
        {
          id: modId(instanceKey(ctx, "saves")),
          type: "saving_throws",
          values: [save],
        },
      ])
    },
  },
  {
    id: "ac.unarmored.ability",
    confidence: "high",
    test:
      /\b(?:base\s+)?(?:AC|armor\s+class)\s+(?:equals|is)\s+(\d+)\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier(?:\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier)?/i,
    build: (match, ctx) => {
      const base = parseInt(match[1], 10)
      const first = parseAbilityWord(match[2])
      const second = match[3] ? parseAbilityWord(match[3]) : null
      if (!first || !Number.isFinite(base)) return null
      const abilities = [first, second]
        .filter(Boolean)
        .map((key) => abilityScoreToModifierKey(key as AbilityScoreKey))
      return charInstance(newInstanceId(), characteristicCatalogRefId("ac"), [
        {
          id: modId(instanceKey(ctx, "ac_formula")),
          type: "ac",
          mode: "ability_modifiers",
          base,
          abilities,
        },
      ])
    },
  },
  {
    id: "ac.unarmored.ten",
    confidence: "high",
    test:
      /\b(?:AC|armor\s+class)\s+(?:equals|is)\s+10\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier(?:\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier)?/i,
    build: (match, ctx) => {
      const first = parseAbilityWord(match[1])
      const second = match[2] ? parseAbilityWord(match[2]) : null
      if (!first) return null
      const abilities = [first, second]
        .filter(Boolean)
        .map((key) => abilityScoreToModifierKey(key as AbilityScoreKey))
      return charInstance(newInstanceId(), characteristicCatalogRefId("ac"), [
        {
          id: modId(instanceKey(ctx, "ac_10")),
          type: "ac",
          mode: "ability_modifiers",
          base: 10,
          abilities,
        },
      ])
    },
  },
  {
    id: "ac.flat_bonus",
    confidence: "high",
    test: /\b(?:\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?AC|(\d+)\s+bonus\s+to\s+(?:your\s+)?(?:AC|Armor\s+Class))\b/i,
    build: (match, ctx) => {
      const bonus = parseInt(match[1] ?? match[2], 10)
      if (!Number.isFinite(bonus)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("ac"), [
        {
          id: modId(instanceKey(ctx, "ac_bonus")),
          type: "ac",
          mode: "flat_bonus",
          flatBonus: bonus,
        },
      ])
    },
  },
  {
    id: "hp.per_level",
    confidence: "high",
    test: /\bhit\s+point\s+maximum\s+increases?\s+by\s+(\d+)\b/i,
    build: (match, ctx) => {
      const value = parseInt(match[1], 10)
      if (!Number.isFinite(value)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("hit_points"), [
        {
          id: modId(instanceKey(ctx, "hp_per_level")),
          type: "hit_points",
          mode: "per_level",
          value,
        },
      ])
    },
  },
  {
    id: "hp.per_level.alt",
    confidence: "high",
    test: /\b\+(\d+)\s+hit\s+points?\s+per\s+(?:character\s+)?level\b/i,
    build: (match, ctx) => {
      const value = parseInt(match[1], 10)
      if (!Number.isFinite(value)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("hit_points"), [
        {
          id: modId(instanceKey(ctx, "hp_per_level")),
          type: "hit_points",
          mode: "per_level",
          value,
        },
      ])
    },
  },
  {
    id: "attack.bonus.all",
    confidence: "high",
    test:
      /\b(?:a\s+)?\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?attack\s+rolls?(?:\s+with\s+(?:ranged|melee)\s+weapons?)?\b/i,
    build: (match, ctx, text) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      const target = parseAttackBonusTarget(text, "all")
      return buildAttackRollBonusModifier(ctx, bonus, target, text, "attack_all")
    },
  },
  {
    id: "attack.bonus.ranged",
    confidence: "high",
    test: /\b(?:a\s+)?\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?ranged\s+attack\s+rolls?\b/i,
    build: (match, ctx, text) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      return buildAttackRollBonusModifier(ctx, bonus, "ranged", text, "attack_ranged")
    },
  },
  {
    id: "attack.bonus.melee",
    confidence: "high",
    test: /\b(?:a\s+)?\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?melee\s+attack\s+rolls?\b/i,
    build: (match, ctx, text) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      return buildAttackRollBonusModifier(ctx, bonus, "melee", text, "attack_melee")
    },
  },
  {
    id: "damage.rider.dice",
    confidence: "medium",
    test: /\b(?:deal|deals)\s+(?:an?\s+)?extra\s+(\d+d\d+)\s+([a-z]+)?\s*damage\b/i,
    build: (match, ctx) => {
      const damageType = match[2] ? titleCaseWords(match[2]) : undefined
      return charInstance(newInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
        {
          id: modId(instanceKey(ctx, "damage_rider")),
          type: "damage_roll_modifiers",
          entries: [{ bonus: 0, target: "all", customTarget: `${match[1]}${damageType ? ` ${damageType}` : ""}` }],
          label: `Extra ${match[1]}${damageType ? ` ${damageType}` : ""} damage`,
        },
      ])
    },
  },
  {
    id: "check.advantage.initiative",
    confidence: "high",
    test: /\b(?:have|gain|get)\s+advantage\s+on\s+initiative(?:\s+rolls?)?\b|\badvantage\s+on\s+(?:your\s+)?initiative(?:\s+rolls?)?\b/i,
    build: (_match, ctx, text) =>
      buildCheckRollModifier(
        ctx,
        "init_adv",
        {
          checkRollMode: "advantage",
          checkCategory: "initiative",
        },
        text,
      ),
  },
  {
    id: "check.advantage.attack.ranged",
    confidence: "high",
    test: /\badvantage\s+on\s+ranged(?:\s+weapon)?\s+attack\s+rolls?\b/i,
    build: (_match, ctx) =>
      buildCheckRollModifier(ctx, "ranged_atk_adv", {
        checkRollMode: "advantage",
        checkCategory: "attack",
      }),
  },
  {
    id: "check.advantage.attack.melee",
    confidence: "high",
    test: /\badvantage\s+on\s+melee\s+attack\s+rolls?\b/i,
    build: (_match, ctx) =>
      buildCheckRollModifier(ctx, "melee_atk_adv", {
        checkRollMode: "advantage",
        checkCategory: "attack",
      }),
  },
  {
    id: "check.advantage.attack",
    confidence: "medium",
    test: /\badvantage\s+on\s+attack\s+rolls?\b/i,
    build: (_match, ctx) =>
      buildCheckRollModifier(ctx, "atk_adv", {
        checkRollMode: "advantage",
        checkCategory: "attack",
      }),
  },
  {
    id: "check.advantage.ability",
    confidence: "high",
    test: /\badvantage\s+on\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+checks?\b/i,
    build: (match, ctx, text) => {
      const ability = parseSaveAbility(match[1])
      if (!ability) return null
      return buildCheckRollModifier(
        ctx,
        "ability_adv",
        {
          checkRollMode: "advantage",
          checkCategory: "ability",
          checkAbility: ability,
        },
        text,
      )
    },
  },
  {
    id: "check.advantage.track",
    confidence: "high",
    test: /\badvantage\s+on\s+ability\s+checks?\s+you\s+make\s+to\s+track\b/i,
    build: (_match, ctx) =>
      buildCheckRollModifier(ctx, "track_adv", {
        checkRollMode: "advantage",
        checkCategory: "skill",
        checkSkills: ["Survival"],
      }),
  },
  {
    id: "save.advantage",
    confidence: "high",
    test: /\badvantage\s+on\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving\s+throws?\b/i,
    build: (match, ctx, text) => {
      const ability = parseSaveAbility(match[1])
      if (!ability) return null
      return buildCheckRollModifier(
        ctx,
        "save_adv",
        {
          checkRollMode: "advantage",
          checkCategory: "save",
          checkAbility: ability,
        },
        text,
      )
    },
  },
  {
    id: "check.advantage.skill.ability",
    confidence: "high",
    test:
      /\badvantage\s+on\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+\(([A-Za-z]+)\)\s+checks?\b/i,
    build: (match, ctx) => {
      const skill = matchSkillName(match[2])
      if (!skill) return null
      return buildCheckRollModifier(ctx, "skill_adv", {
        checkRollMode: "advantage",
        checkCategory: "skill",
        checkSkills: [skill],
      })
    },
  },
  {
    id: "check.advantage.skill",
    confidence: "high",
    test: /\badvantage\s+on\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:\(|\b)checks?\b/i,
    build: (match, ctx) => {
      const skill = matchSkillName(match[1])
      if (!skill) return null
      return buildCheckRollModifier(ctx, "skill_adv", {
        checkRollMode: "advantage",
        checkCategory: "skill",
        checkSkills: [skill],
      })
    },
  },
  {
    id: "resistance.damage",
    confidence: "high",
    test: /\bresistance\s+to\s+([^.;\n]+?)\s+damage\b/i,
    build: (match, ctx) => {
      const types = parseDamageTypes(match[1])
      if (!types.length) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("damage_resistance"), [
        {
          id: modId(instanceKey(ctx, "resistance")),
          type: "damage_resistance",
          damageTypes: types,
        },
      ])
    },
  },
  {
    id: "immunity.condition",
    confidence: "high",
    test: /\b(?:immune\s+to\s+(?:the\s+)?|can'?t\s+be\s+)([^.;\n]+?)(?:\s+condition)?\b/i,
    build: (match, ctx, text) => {
      if (!/\bimmune\b/i.test(text) && !/\bcan'?t\s+be\b/i.test(text)) return null
      const condition = parseCondition(match[1])
      if (!condition) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("condition_immunity"), [
        {
          id: modId(instanceKey(ctx, "condition_immune")),
          type: "condition_immunity",
          conditions: [condition],
        },
      ])
    },
  },
  {
    id: "speed.walk",
    confidence: "high",
    test: /\b(?:walking\s+)?speed\s+increases?\s+by\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const feet = parseInt(match[1], 10)
      if (!Number.isFinite(feet)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("speed"), [
        {
          id: modId(instanceKey(ctx, "speed_walk")),
          type: "speed",
          speedType: "walk",
          mode: "add",
          value: feet,
        },
      ])
    },
  },
  {
    id: "speed.fly",
    confidence: "high",
    test: /\b(?:a\s+)?fly(?:ing)?\s+speed\s+of\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const feet = parseInt(match[1], 10)
      if (!Number.isFinite(feet)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("speed"), [
        {
          id: modId(instanceKey(ctx, "speed_fly")),
          type: "speed",
          speedType: "fly",
          mode: "add",
          value: feet,
        },
      ])
    },
  },
  {
    id: "speed.swim",
    confidence: "high",
    test: /\b(?:a\s+)?swim(?:ming)?\s+speed\s+of\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const feet = parseInt(match[1], 10)
      if (!Number.isFinite(feet)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("speed"), [
        {
          id: modId(instanceKey(ctx, "speed_swim")),
          type: "speed",
          speedType: "swim",
          mode: "add",
          value: feet,
        },
      ])
    },
  },
  {
    id: "speed.climb",
    confidence: "high",
    test: /\b(?:a\s+)?climb(?:ing)?\s+speed\s+of\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const feet = parseInt(match[1], 10)
      if (!Number.isFinite(feet)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("speed"), [
        {
          id: modId(instanceKey(ctx, "speed_climb")),
          type: "speed",
          speedType: "climb",
          mode: "add",
          value: feet,
        },
      ])
    },
  },
  {
    id: "speed.equal_to_walk",
    confidence: "high",
    scope: "full",
    test:
      /(?:climb(?:ing)?|swim(?:ming)?|fly(?:ing)?)(?:\s+speed)?(?:\s+and\s+(?:a\s+)?(?:climb(?:ing)?|swim(?:ming)?|fly(?:ing)?)(?:\s+speed)?)*\s+equal to your (?:(?:walking|walk)\s+speed|speed)\b/i,
    build: (_match, ctx, text) => buildSpeedEqualToWalkModifier(ctx, text),
  },
  {
    id: "vision.darkvision",
    confidence: "high",
    test: /\bdarkvision(?:\s+(?:within|of))?\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const rangeFeet = parseInt(match[1], 10)
      if (!Number.isFinite(rangeFeet)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("vision"), [
        {
          id: modId(instanceKey(ctx, "darkvision")),
          type: "vision",
          visionType: "darkvision",
          rangeFeet,
        },
      ])
    },
  },
  {
    id: "attack.extra",
    confidence: "high",
    test: /\b(?:gain(?:s)?\s+an?\s+extra\s+attack|attack\s+twice|two\s+attacks)\b/i,
    build: (_match, ctx) =>
      fxInstance(newInstanceId(), effectCatalogRefId("extra_attack"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "extra_attack")),
            kind: "extra_attack",
            extraAttackCount: 1,
          },
        ],
      }),
  },
  {
    id: "uses.once_short_long_rest",
    confidence: "medium",
    test:
      /\b(?:must|you must)\s+finish\s+a\s+short\s+or\s+long\s+rest\s+before\s+you\s+can\s+use\s+(?:this feature|it)\s+again\b/i,
    build: (_match, ctx) => {
      const uses: UsesConfig = {
        type: "fixed",
        fixedAmount: 1,
        recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
      }
      return usesInstance(newInstanceId(), uses, ctx.featureName ?? "Limited uses")
    },
  },
  {
    id: "uses.item_charges",
    confidence: "high",
    scope: "full",
    test: /\bhas\s+(\d+)\s+charges?\b/i,
    build: (match, ctx, text) => {
      const count = parseInt(match[1], 10)
      if (!Number.isFinite(count)) return null
      const dawnRecharge = text.match(
        /\bregains?\s+(\d+d\d+|\d+)\s+expended\s+charges?\s+daily\s+at\s+dawn\b/i,
      )
      const longRestRecharge = text.match(
        /\bregains?\s+(\d+d\d+|\d+)\s+expended\s+charges?\s+(?:daily\s+)?(?:when\s+you\s+finish\s+a\s+|on\s+a\s+)?long\s+rest\b/i,
      )
      const uses: UsesConfig = {
        type: "fixed",
        fixedAmount: count,
      }
      if (dawnRecharge) {
        uses.specialDescription = `Regains ${dawnRecharge[1]} expended charges daily at dawn`
      } else if (longRestRecharge) {
        uses.recharges = [{ rest: "long_rest" }]
        if (longRestRecharge[1] !== String(count)) {
          uses.specialDescription = `Regains ${longRestRecharge[1]} expended charges on a long rest`
        }
      } else if (/\bregains?\s+all\s+expended\s+charges?\b/i.test(text)) {
        uses.recharges = [{ rest: "long_rest" }]
      }
      return usesInstance(newInstanceId(), uses, ctx.featureName ?? "Charges")
    },
  },
  {
    id: "uses.fixed_rest",
    confidence: "high",
    test:
      /\b(\d+)\s+times?(?:,)?\s+regaining\s+all\s+expended\s+uses\s+when\s+you\s+finish\s+a\s+(short|long)\s+rest\b/i,
    build: (match, ctx) => {
      const count = parseInt(match[1], 10)
      if (!Number.isFinite(count)) return null
      const uses: UsesConfig = {
        type: "fixed",
        fixedAmount: count,
        recharges: parseRechargeRest(match[2]),
      }
      return usesInstance(newInstanceId(), uses, ctx.featureName ?? "Limited uses")
    },
  },
  {
    id: "uses.ability_modifier",
    confidence: "medium",
    test:
      /\b(?:a\s+)?number\s+of\s+times\s+equal\s+to\s+your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier\b/i,
    build: (match, ctx, text) => {
      if (!/\bregain(?:ing)?\s+all\s+expended\s+uses\b/i.test(text) && !/\bper\s+long\s+rest\b/i.test(text)) {
        return null
      }
      const ability = match[1].toUpperCase().slice(0, 3) as unknown as unknown as unknown as unknown as UsesConfig["abilityModifier"]
      const uses: UsesConfig = {
        type: "ability_modifier",
        abilityModifier: ability,
        recharges: [{ rest: "long_rest" }],
      }
      return usesInstance(newInstanceId(), uses, ctx.featureName ?? "Limited uses")
    },
  },
  {
    id: "uses.proficiency",
    confidence: "medium",
    test: /\b(?:a\s+)?number\s+of\s+times\s+equal\s+to\s+your\s+proficiency\s+bonus\b/i,
    build: (_match, ctx, text) => {
      if (!/\bregain(?:ing)?\s+all\s+expended\s+uses\b/i.test(text) && !/\bper\s+long\s+rest\b/i.test(text)) {
        return null
      }
      const uses: UsesConfig = {
        type: "proficiency",
        recharges: [{ rest: "long_rest" }],
      }
      return usesInstance(newInstanceId(), uses, ctx.featureName ?? "Limited uses")
    },
  },
  {
    id: "grant.fighting_style",
    confidence: "high",
    test: /\b(?:gain|learn|adopt|choose)\s+(?:a|an|one)?\s*fighting\s+style(?:\s+feat)?(?:\s+of\s+your\s+choice)?\b/i,
    build: () => grantFeatInstance(["Fighting Style"], "Fighting Style feat"),
  },
  {
    id: "grant.fighting_style_feat",
    confidence: "high",
    test: /\bfighting\s+style\s+feat\s+of\s+your\s+choice\b/i,
    build: () => grantFeatInstance(["Fighting Style"], "Fighting Style feat"),
  },
  {
    id: "grant.epic_boon",
    confidence: "high",
    test: /\b(?:gain|choose)\s+(?:an?\s+)?epic\s+boon(?:\s+feat)?(?:\s+of\s+your\s+choice)?\b/i,
    build: () => grantFeatInstance(["Epic Boon"], "Epic Boon"),
  },
  {
    id: "grant.origin_feat",
    confidence: "high",
    test: /\b(?:gain|choose)\s+(?:an?\s+)?origin\s+feat(?:\s+of\s+your\s+choice)?\b/i,
    build: () => grantFeatInstance(["Origin"], "Origin feat"),
  },
  {
    id: "grant.general_feat",
    confidence: "medium",
    test: /\b(?:gain|choose)\s+(?:a|an|one)\s+(?:general\s+)?feat(?:\s+of\s+your\s+choice)?\b/i,
    build: (_match, _ctx, text) => {
      if (/\bfighting\s+style\b/i.test(text)) return null
      if (/\bepic\s+boon\b/i.test(text)) return null
      if (/\borigin\s+feat\b/i.test(text)) return null
      return grantFeatInstance(["General"], "General feat")
    },
  },
  {
    id: "attack.critical.scaling",
    confidence: "high",
    scope: "full",
    test: /critical\s+hit\s+on\s+(?:a\s+)?(?:d20\s+)?roll\s+of/i,
    build: (_match, ctx, text) => buildCriticalHitScalingModifier(ctx, text),
  },
  {
    id: "damage.weapon.ability_modifier",
    confidence: "high",
    scope: "full",
    test:
      /(?:doesn['\u2019]t add your ability modifier to the roll|add your ability modifier nonetheless|if you already add your modifier to the damage roll)/i,
    build: (_match, ctx, text) => buildWeaponDamageModifierFromText(ctx, text),
  },
  {
    id: "damage.crit.bonus",
    confidence: "high",
    scope: "full",
    test: /critical\s+hit[\s\S]{0,120}bonus damage equal to your (?:\w+\s+)?level/i,
    build: (_match, ctx, text) => buildCritBonusDamageModifier(ctx, text),
  },
  {
    id: "damage.crit.maximize",
    confidence: "high",
    scope: "full",
    test: /critical\s+hit[\s\S]{0,160}maximize the damage/i,
    build: (_match, ctx, text) => buildCritMaximizeModifier(ctx, text),
  },
  {
    id: "check.bonus.resource_die",
    confidence: "high",
    scope: "full",
    test: RESOURCE_DIE_BONUS_PHRASE,
    build: (_match, ctx, text) => buildResourceDieCheckBonus(ctx, text),
  },
  {
    id: "resource.free_use_on_roll",
    confidence: "high",
    scope: "full",
    test: /you can use .+ without expending an?\s+\w+(?:\s+\w+)?\s+Die\b/i,
    build: (_match, ctx, text) => buildFreeResourceUseOnRollModifier(ctx, text),
  },
  {
    id: "heal.turn_start_low_hp",
    confidence: "high",
    scope: "full",
    test: /begin your turn[\s\S]{0,120}regain hit points equal to \d+ \+ your \w+ modifier/i,
    build: (_match, ctx, text) => buildTurnStartLowHpHealModifier(ctx, text),
  },
  {
    id: "defensive.evasion",
    confidence: "high",
    test:
      /\bdexterity\s+saving\s+throw\b[^.]{0,160}\b(?:take\s+only\s+half|half\s+damage)\b[^.]{0,80}\b(?:take\s+)?no\s+damage\b/i,
    build: () => buildEvasionModifier(`modinst_evasion_${newInstanceId()}`),
  },
  {
    id: "defensive.flat_damage_reduction",
    confidence: "medium",
    test: /reduce\s+(?:the\s+)?damage\s+(?:taken|you\s+take)\s+by\s+(\d+)\b/i,
    build: (match, ctx) => {
      const amount = parseInt(match[1], 10)
      if (!Number.isFinite(amount) || amount <= 0) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("damage_reduction"), [
        {
          id: modId(instanceKey(ctx, "damage_reduction")),
          type: "damage_reduction",
          amount,
          damageTypes: ["Bludgeoning", "Piercing", "Slashing"],
        },
      ])
    },
  },
  {
    id: "check.bonus.initiative.ability",
    confidence: "high",
    test:
      /\bbonus to initiative rolls?\s+equal to your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier\b/i,
    build: (match, ctx) => {
      const ability = parseAbilityWord(match[1])
      if (!ability) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("initiative"), [
        {
          id: modId(instanceKey(ctx, "init_bonus")),
          type: "initiative",
          mode: "ability_modifier",
          ability: abilityScoreToModifierKey(ability),
        },
      ])
    },
  },
  {
    id: "sense.telepathy",
    confidence: "high",
    test: /\b(?:have|gain)\s+telepathy(?:\s+with a range of|\s+of)?\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const rangeFeet = parseInt(match[1], 10)
      if (!Number.isFinite(rangeFeet)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("telepathy"), [
        {
          id: modId(instanceKey(ctx, "telepathy")),
          type: "telepathy",
          rangeFeet,
        },
      ])
    },
  },
  {
    id: "language.known",
    confidence: "high",
    test: /\byou know (?!the )([A-Za-z]+)\b/i,
    build: (match, ctx) => {
      const language = titleCaseWords(match[1].trim())
      if (!language) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("languages"), [
        {
          id: modId(instanceKey(ctx, `lang_${language}`)),
          type: "languages",
          values: [language],
          label: `You know ${language}`,
        },
      ])
    },
  },
  {
    id: "language.choice",
    confidence: "high",
    test: /\blearn (one|two|three|four|\d+) languages? of your choice\b/i,
    build: (match, ctx) => {
      const wordToCount: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
      const raw = match[1]?.toLowerCase() ?? "1"
      const count = wordToCount[raw] ?? parseInt(raw, 10)
      if (!Number.isFinite(count) || count < 1) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("languages"), [
        {
          id: modId(instanceKey(ctx, "lang_choice")),
          type: "languages",
          values: [],
          choiceCount: count,
          choicePool: "standard",
          label: `Choose ${count} language${count === 1 ? "" : "s"}`,
        },
      ])
    },
  },
  {
    id: "language.choice.tables",
    confidence: "high",
    test: /\blearn one language of your choice from the language tables\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("languages"), [
        {
          id: modId(instanceKey(ctx, "lang_tables")),
          type: "languages",
          values: [],
          choiceCount: 1,
          choicePool: "standard",
          label: "Language from Player's Handbook tables",
        },
      ]),
  },
  {
    id: "spell.know_cantrip",
    confidence: "high",
    test: /\byou know the ([A-Za-z' ]+?) cantrip\b/i,
    build: (match, ctx) => {
      const spellName = match[1].trim()
      if (!spellName) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("spells_known"), [
        {
          id: modId(instanceKey(ctx, `cantrip_${spellName}`)),
          type: "spells_known",
          spells: [{ spellId: spellNamePlaceholder(spellName), alwaysPrepared: true }],
          alwaysPrepared: true,
          label: `${spellName} cantrip`,
        },
      ])
    },
  },
  {
    id: "spell.cantrip.choice",
    confidence: "high",
    test:
      /\blearn (?:one|two|three|four|\d+) other cantrips? of your choice(?: from the ([^.]+?))?(?:\.|$)/i,
    build: (match, ctx) => {
      const countMatch = match[0].match(/\b(one|two|three|four|\d+)\s+other cantrips?\b/i)
      const wordToCount: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
      const raw = countMatch?.[1]?.toLowerCase() ?? "1"
      const count = wordToCount[raw] ?? parseInt(raw, 10)
      if (!Number.isFinite(count) || count < 1) return null
      const schoolNote = match[1]?.replace(/\s+school(?:\s+of\s+magic)?$/i, "").trim()
      return charInstance(newInstanceId(), characteristicCatalogRefId("spells_known"), [
        {
          id: modId(instanceKey(ctx, "cantrip_choice")),
          type: "spells_known",
          spells: [],
          choiceGrants: [{ level: 0, count }],
          label: schoolNote ? `Cantrip choice (${schoolNote})` : "Cantrip choice",
        },
      ])
    },
  },
  {
    id: "spell.always_prepared",
    confidence: "high",
    test: /\balways have the ([A-Za-z' ]+?) spell prepared\b/i,
    build: (match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("spells_known"), [
        {
          id: modId(instanceKey(ctx, "always_prepared")),
          type: "spells_known",
          spells: [],
          alwaysPrepared: true,
          label: match[1].trim(),
        },
      ]),
  },
  {
    id: "spell.at_will_no_slot",
    confidence: "high",
    test: /\bcan cast (?:it|the [A-Za-z' ]+ spell)? without a spell slot\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("uses"), [
        {
          id: modId(instanceKey(ctx, "at_will")),
          type: "uses",
          uses: { type: "unlimited" },
          label: "Cast without a spell slot",
        },
      ]),
  },
  {
    id: "ac.bonus.while_armored",
    confidence: "high",
    test:
      /\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?(?:AC|Armor\s+Class)\s+while\s+(?:you\s+are\s+)?wearing\s+armor\b/i,
    build: (match, ctx) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("ac"), [
        {
          id: modId(instanceKey(ctx, "ac_armored")),
          type: "ac",
          mode: "flat_bonus",
          flatBonus: bonus,
          requiresArmor: true,
          label: `+${bonus} AC while wearing armor`,
        },
      ])
    },
  },
  {
    id: "ac.bonus.while_raging",
    confidence: "high",
    test:
      /\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?(?:AC|Armor\s+Class)\s+while\s+(?:you\s+are\s+)?raging\b/i,
    build: (match, ctx) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("ac"), [
        {
          id: modId(instanceKey(ctx, "ac_raging")),
          type: "ac",
          mode: "flat_bonus",
          flatBonus: bonus,
          requiresSheetToggle: "while_raging",
          label: `+${bonus} AC while raging`,
        },
      ])
    },
  },
  {
    id: "damage.scaling.die_by_level",
    confidence: "medium",
    scope: "full",
    test: /at\s+(\d+)(?:st|nd|rd|th)?\s+level[\s\S]{0,120}?(\d+)d(\d+)/i,
    build: (_match, ctx, text) => buildDamageDieScalingByLevelModifier(ctx, text),
  },
  {
    id: "resource.expend_psi_points",
    confidence: "high",
    scope: "full",
    test: /\bexpend\s+(\d+)\s+psi\s+points?\b/i,
    build: (match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("uses"), [
        {
          id: modId(instanceKey(ctx, "psi_spend")),
          type: "uses",
          uses: {
            type: "class_resource",
            classResourceKey: "psi_points",
            classResourceAmount: parseInt(match[1], 10) || 1,
          },
          label: "Spend psi points",
        },
      ]),
  },
  {
    id: "spellcasting.ability",
    confidence: "high",
    test:
      /\b(Intelligence|Wisdom|Charisma)(?:,\s*(?:Intelligence|Wisdom|Charisma))*\s+is your spellcasting ability\b/i,
    build: (match, ctx) => {
      const ability = parseAbilityWord(match[1])
      if (!ability) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("spellcasting_ability"), [
        {
          id: modId(instanceKey(ctx, "spellcasting")),
          type: "spellcasting_ability",
          ability,
          label: `${match[1]} spellcasting`,
        },
      ])
    },
  },
  {
    id: "damage.creature_type",
    confidence: "high",
    test:
      /when you hit an?\s+([A-Za-z]+)\s+with this weapon,?\s+the\s+\1\s+takes\s+an extra\s+(\d+d\d+)\s+([A-Za-z]+)\s+damage/i,
    build: (match, ctx) => {
      const creatureType = titleCaseWords(match[1])
      const dice = match[2]
      const damageType = titleCaseWords(match[3])
      return charInstance(newInstanceId(), characteristicCatalogRefId("damage_roll_modifiers"), [
        {
          id: modId(instanceKey(ctx, "creature_damage")),
          type: "damage_roll_modifiers",
          entries: [
            {
              bonus: 0,
              target: "all",
              onlyVsCreatureTypes: [creatureType],
              bonusDiceWhenModifierIncluded: dice,
            },
          ],
          label: `Extra ${dice} ${damageType} vs ${creatureType}`,
        },
      ])
    },
  },
  {
    id: "toggle.conditional_grant",
    confidence: "medium",
    scope: "full",
    test:
      /\b(?:it can choose to grant you the following benefits|while raging|while below half hit points)\b/i,
    build: () => null,
  },
  {
    id: "grant.asi_classic",
    confidence: "high",
    scope: "full",
    test: CLASSIC_ASI_PHRASE,
    build: (_match, ctx) =>
      asiPool(`modinst_${instanceKey(ctx, "asi_classic")}`, 2, "Ability Score Improvement (+2 or +1/+1)"),
  },
  {
    id: "grant.asi_2024",
    confidence: "high",
    scope: "full",
    test: FEAT_ASI_2024_PHRASE,
    build: (_match, ctx) =>
      grantFeatInstance(["General"], `General feat (${instanceKey(ctx, "asi_2024")})`),
  },
  {
    id: "technique.on_hit_once_per_turn",
    confidence: "high",
    scope: "full",
    test: /once per turn when you hit[\s\S]{0,200}?\b(?:spend|expend)\s+\d+\s+ki\b/i,
    build: (_match, ctx, text) => buildTechniqueOnHitModifier(ctx, text),
  },
  {
    id: "resource.turn_start_regain_ki",
    confidence: "high",
    scope: "full",
    test: /regain\s+\d+\s+ki\s+at\s+the\s+start\s+of\s+each\s+of\s+your\s+turns/i,
    build: (_match, ctx, text) => buildWarriorSpiritTurnStartModifier(ctx, text),
  },
]
