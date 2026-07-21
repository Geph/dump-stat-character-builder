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
import {
  GRANT_CREATURE_CATALOG_ID,
  grantCreatureCharacteristic,
} from "@/lib/compendium/grant-creature-catalog"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import type { RollBonusConfig } from "@/lib/compendium/roll-bonus-config"
import type { DetectFeatureContext } from "@/lib/import/detect-feature-modifiers"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"
import { PSIONIC_TALENT_WIRING_RULES } from "@/lib/import/psionic-talent-wiring"
import { THIRD_PARTY_RESOURCE_PATTERNS } from "@/lib/import/third-party-resources"
import type { UsesConfig, FeatureEffect } from "@/lib/types"
import {
  blockedWhenConditionLimitation,
  notWearingArmorLimitation,
  requiresActiveToggleLimitation,
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
  /increase one ability score of your choice by 2,?\s+or(?: you can)? increase two ability scores of your choice by 1/i

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
  "Surprised",
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

function textMentionsWhileRaging(text: string): boolean {
  return (
    /\bwhile\s+(?:your\s+)?rage\s+is\s+active\b/i.test(text) ||
    /\bwhile\s+(?:you\s+are\s+)?raging\b/i.test(text)
  )
}

function textMentionsWhileBloodied(text: string): boolean {
  return (
    /\bwhile\s+(?:you\s+are\s+)?bloodied\b/i.test(text) ||
    /\bwhile\s+bloodied\b/i.test(text) ||
    /\bif\s+you\s+are\s+bloodied\b/i.test(text)
  )
}

function grantFeatInstance(categories: FeatPickCategory[], label: string): LinkedModifierInstance {
  return buildGrantFeatModifier(categories, label, newInstanceId())
}

function grantCreatureInstance(creatureNames: string[]): LinkedModifierInstance {
  return charInstance(newInstanceId(), GRANT_CREATURE_CATALOG_ID, [
    grantCreatureCharacteristic(creatureNames),
  ])
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
  {
    // Unleashed Mind talent — play-state Rampage Die stepper already exists; this
    // marks the talent as wired with a sheet reminder rather than inventing auto-triggers.
    id: "psion.tantrum_by_name",
    confidence: "medium",
    test: (featureName) => /^tantrum$/i.test(featureName.trim()),
    build: (ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("uses"), [
        {
          id: modId(instanceKey(ctx, "tantrum_rampage")),
          type: "uses",
          uses: {
            type: "special",
            specialDescription:
              "Rampage Die (sheet control): step up when you roll initiative; step up when you take damage while the die is d6 or lower. Auto-stepping is not modeled yet.",
          },
          label: "Tantrum — Rampage Die steps",
        },
      ]),
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
  if (
    /\bwhile\s+(?:you\s+are\s+)?bloodied\b/i.test(text) ||
    /\bwhile\s+bloodied\b/i.test(text) ||
    /\bif\s+you\s+are\s+bloodied\b/i.test(text)
  ) {
    limitations.push(requiresActiveToggleLimitation("below_half_hp"))
  }
  if (
    /\bwhile\s+(?:you\s+are\s+)?dancing\b/i.test(text) ||
    /\bwhile\s+(?:in|using)\s+(?:a\s+)?dance\b/i.test(text) ||
    /\bwhile\s+your\s+dance\s+is\s+active\b/i.test(text)
  ) {
    limitations.push(requiresActiveToggleLimitation("while_dancing"))
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
    /** Conditions the roll is made against (e.g. ["spell"] for saves vs spells). */
    checkConditionTypes?: string[]
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
        ...(options.checkConditionTypes?.length
          ? { checkConditionTypes: options.checkConditionTypes }
          : {}),
        limitations: sourceText ? parseLimitationsFromText(sourceText) : [],
      },
    ],
  })
}

function spellsKnownInstance(
  ctx: DetectFeatureContext,
  ruleSuffix: string,
  spellNames: string[],
  label: string,
): LinkedModifierInstance {
  return charInstance(newInstanceId(), characteristicCatalogRefId("spells_known"), [
    {
      id: modId(instanceKey(ctx, ruleSuffix)),
      type: "spells_known",
      spells: spellNames.map((name) => ({
        spellId: spellNamePlaceholder(name),
        alwaysPrepared: true,
      })),
      alwaysPrepared: true,
      label,
    },
  ])
}

function parseSpellNameList(fragment: string): string[] {
  const cleaned = fragment
    .replace(/^the\s+/i, "")
    .replace(/\s+spells?$/i, "")
    .trim()
  if (!cleaned) return []
  return cleaned
    .split(/\s*,\s*|\s+and\s+/i)
    // Oxford-comma lists ("…, and seeming") leave a leading "and" on the last part.
    .map((part) => part.trim().replace(/^(?:and|or)\s+/i, "").replace(/^the\s+/i, ""))
    .filter((part) => part.length > 1 && looksLikeNamedSpell(part))
}

/** Reject chooser / pool phrasing that is not a concrete spell title. */
function looksLikeNamedSpell(name: string): boolean {
  if (/\d/.test(name)) return false
  if (/^(one|two|three|four|five|six|a|an|any|it|this|that|them|the|each|whether|how|what)\b/i.test(name)) {
    return false
  }
  if (/\b(of your|that you|level|prepared|from your|circle|domain|oath|psi|expend(?:ing)?|spend(?:ing)?)\b/i.test(name)) {
    return false
  }
  if (!/^[A-Za-z]/.test(name)) return false
  return true
}

function parseCastingAbilityFromText(text: string): AbilityScoreKey | null {
  const match = text.match(
    /\b(Intelligence|Wisdom|Charisma)(?:,\s*(?:Intelligence|Wisdom|Charisma))*\s+is your spellcasting ability\b/i,
  )
  if (!match) return null
  return parseAbilityWord(match[1])
}

function parseDamageTypes(fragment: string): string[] {
  const lower = fragment.toLowerCase()
  return DAMAGE_TYPES.filter((type) => lower.includes(type)).map(
    (type) => type.charAt(0).toUpperCase() + type.slice(1),
  )
}

function parseCondition(fragment: string): string | null {
  const conditions = parseConditions(fragment)
  return conditions[0] ?? null
}

function parseConditions(fragment: string): string[] {
  const lower = fragment.toLowerCase()
  return CONDITION_NAMES.filter((condition) => {
    const re = new RegExp(`\\b${condition.toLowerCase()}\\b`, "i")
    return re.test(lower)
  })
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
    /((?:a\s+)?(?:climb(?:ing)?|swim(?:ming)?|fly(?:ing)?)(?:\s+speed)?(?:\s+and\s+(?:a\s+)?(?:climb(?:ing)?|swim(?:ming)?|fly(?:ing)?)(?:\s+speed)?)*)\s+equal to your (?:(?:walking|walk)\s+)?speed\b/i,
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
  const withDie = `${phrase} Die`
  // Prefer die-named resources first so "Dance Die" maps to dance_die, not dances.
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (pattern.namePattern.test(withDie)) {
      if (pattern.resourceKey === "exploit_die_size") return "exploit_dice"
      return pattern.resourceKey
    }
  }
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (pattern.namePattern.test(phrase)) {
      if (pattern.resourceKey === "exploit_die_size") return "exploit_dice"
      return pattern.resourceKey
    }
  }
  if (/^exploit$/i.test(phrase)) return "exploit_dice"
  return `${phrase.toLowerCase().replace(/\s+/g, "_")}_dice`
}

const RESOURCE_DIE_BONUS_PHRASE =
  /(?:bonus to (?:the|your) (?:roll|AC|Armor Class) equal to your \w+(?:\s+\w+)?\s+Die|add (?:the|your) \w+(?:\s+\w+)?\s+Die to (?:the|your) (?:roll|AC|Armor Class))/i

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
  const isAcBonus = /\b(?:AC|Armor Class)\b/i.test(text)

  if (isAcBonus) {
    const isDieSizeOnly = resourceKey === "dance_die"
    return charInstance(newInstanceId(), characteristicCatalogRefId("resource_ability_menu"), [
      {
        id: modId(instanceKey(ctx, "resource_die_ac")),
        type: "resource_ability_menu",
        resourceKey,
        options: [
          {
            name: "Add die to AC",
            description: "Add this class resource die to your AC against one attack.",
            resourceCost: isDieSizeOnly ? 0 : 1,
            bonusConfig,
          },
        ],
        label: `Roll ${resourceKey.replace(/_/g, " ")} for AC`,
      },
    ])
  }

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
          limitations: parseLimitationsFromText(text),
        }))
      : [
          {
            id: modId(instanceKey(ctx, "resource_die")),
            kind: "check_roll_modifier" as const,
            checkRollMode: "bonus" as const,
            checkCategory: rollKind as FeatureEffect["checkCategory"],
            bonusConfig,
            limitations: parseLimitationsFromText(text),
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

function buildTurnStartResourceRestoreModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  const match = text.match(
    /regain\s+(\d+)\s+([a-z][a-z\s-]{0,40}?)\s+at\s+the\s+start\s+of\s+each\s+of\s+your\s+turns/i,
  )
  if (!match) return null
  const amount = parseInt(match[1], 10) || 1
  const resourcePhrase = match[2].trim().toLowerCase()
  const blockedByConditions = /incapacitated/i.test(text) ? ["Incapacitated"] : []

  let restoreResourceKey = "ki_points"
  let labelResource = "Ki"
  if (/psi\s*die|psi\s*dice|psionic\s+energy/i.test(resourcePhrase)) {
    restoreResourceKey = "psionic_energy_dice"
    labelResource = "Psionic Energy Die"
  } else if (/focus/i.test(resourcePhrase)) {
    restoreResourceKey = "focus_points"
    labelResource = "Focus"
  } else if (/sorcery/i.test(resourcePhrase)) {
    restoreResourceKey = "sorcery_points"
    labelResource = "Sorcery Point"
  } else if (/ki|focus point/i.test(resourcePhrase)) {
    restoreResourceKey = "ki_points"
    labelResource = "Ki"
  }

  return charInstance(newInstanceId(), characteristicCatalogRefId("turn_start_trigger"), [
    {
      id: modId(instanceKey(ctx, "turn_start_restore")),
      type: "turn_start_trigger",
      restoreResourceKey,
      restoreResourceAmount: amount,
      blockedByConditions,
      label: `Regain ${amount} ${labelResource} at turn start`,
    },
  ])
}

function buildWarriorSpiritTurnStartModifier(
  ctx: DetectFeatureContext,
  text: string,
): LinkedModifierInstance | null {
  return buildTurnStartResourceRestoreModifier(ctx, text)
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
    // Also match combined grants like "martial weapons and heavy armor".
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+(?:(?:martial|simple)\s+weapons?\s+and\s+)?heavy\s+armor\b/i,
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
    // Also match combined grants like "martial weapons and medium armor" (Nomad's Gear).
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+(?:(?:martial|simple)\s+weapons?\s+and\s+)?medium\s+armor\b/i,
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
    // Also match combined grants like "proficiency with medium armor and shields".
    test: /\bproficien(?:cy|t)\s+(?:with|in)\s+(?:(?:light|medium|heavy)\s+armor\s+and\s+)?shields?\b/i,
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
    build: (_match, ctx, text) => {
      // Ally/enemy pack-tactics style auras are not self check modifiers.
      if (/\b(?:your\s+)?allies\s+have\s+advantage\b/i.test(text)) return null
      if (/\benemies\b[\s\S]{0,80}\bdisadvantage\s+on\s+attack\s+rolls?\b/i.test(text)) return null
      return buildCheckRollModifier(
        ctx,
        "atk_adv",
        {
          checkRollMode: "advantage",
          checkCategory: "attack",
        },
        text,
      )
    },
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
    id: "save.advantage.magic",
    confidence: "high",
    test:
      /\badvantage\s+on\s+saving\s+throws?\s+against\s+spells(?:\s+(?:and|or)\s+(?:other\s+)?magic(?:al)?\s+effects?)?\b/i,
    build: (_match, ctx, text) =>
      buildCheckRollModifier(
        ctx,
        "save_adv_magic",
        {
          checkRollMode: "advantage",
          checkCategory: "save",
          checkConditionTypes: ["spell"],
        },
        text,
      ),
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
    id: "resistance.damage.except",
    confidence: "high",
    test: /\bresistance\s+to\s+(?:every|all)\s+damage\s+types?\s+except\s+([^.;\n]+)/i,
    build: (match, ctx, text) => {
      const excepted = new Set(parseDamageTypes(match[1]).map((type) => type.toLowerCase()))
      const types = DAMAGE_TYPES.filter((type) => !excepted.has(type)).map(
        (type) => type.charAt(0).toUpperCase() + type.slice(1),
      )
      if (!types.length) return null
      const whileRaging = textMentionsWhileRaging(text)
      const whileBloodied = textMentionsWhileBloodied(text)
      const toggle = whileRaging ? "while_raging" : whileBloodied ? "below_half_hp" : undefined
      return charInstance(newInstanceId(), characteristicCatalogRefId("damage_resistance"), [
        {
          id: modId(instanceKey(ctx, "resistance_except")),
          type: "damage_resistance",
          damageTypes: types,
          requiresSheetToggle: toggle,
          label: whileRaging
            ? `Resistance to all damage except ${match[1].trim()} (while raging)`
            : whileBloodied
              ? `Resistance to all damage except ${match[1].trim()} (while Bloodied)`
              : `Resistance to all damage except ${match[1].trim()}`,
        },
      ])
    },
  },
  {
    id: "resistance.spell_damage",
    confidence: "high",
    test: /\bresistance\s+to\s+(?:the\s+)?damage\s+(?:dealt\s+by|of|from)\s+spells\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("damage_resistance"), [
        {
          id: modId(instanceKey(ctx, "res_spell_damage")),
          type: "damage_resistance",
          damageTypes: [],
          fromSpells: true,
          label: "Resistance to damage from spells",
        },
      ]),
  },
  {
    id: "resistance.damage",
    confidence: "high",
    test: /\bresistance\s+to\s+([^.;\n]+?)\s+damage\b/i,
    build: (match, ctx, text) => {
      if (/\b(?:every|all)\s+damage\s+types?\s+except\b/i.test(match[0])) return null
      if (/\bexcept\b/i.test(match[1])) return null
      const types = parseDamageTypes(match[1])
      if (!types.length) return null
      const whileRaging = textMentionsWhileRaging(text)
      const whileBloodied = textMentionsWhileBloodied(text)
      const toggle = whileRaging ? "while_raging" : whileBloodied ? "below_half_hp" : undefined
      return charInstance(newInstanceId(), characteristicCatalogRefId("damage_resistance"), [
        {
          id: modId(instanceKey(ctx, "resistance")),
          type: "damage_resistance",
          damageTypes: types,
          requiresSheetToggle: toggle,
          label: whileBloodied
            ? `Resistance to ${types.join(", ")} (while Bloodied)`
            : whileRaging
              ? `Resistance to ${types.join(", ")} (while raging)`
              : undefined,
        },
      ])
    },
  },
  {
    id: "immunity.condition",
    confidence: "high",
    // "immune to" / "immunity to" / "can't be" — including multi-condition lists
    // like "immunity to the Charmed and Frightened conditions" (Uncontrollable Mind).
    test: /\b(?:immune\s+to\s+(?:the\s+)?|immunity\s+to\s+(?:the\s+)?|can'?t\s+be\s+)([^.;\n]+)/i,
    build: (match, ctx, text) => {
      if (
        !/\bimmune\b/i.test(text) &&
        !/\bimmunity\b/i.test(text) &&
        !/\bcan'?t\s+be\b/i.test(text)
      ) {
        return null
      }
      const conditions = parseConditions(match[1])
      if (!conditions.length) return null
      const whileClause = text.match(/\b(While\s+[^,]{3,80}),/i)?.[1]?.trim()
      return charInstance(newInstanceId(), characteristicCatalogRefId("condition_immunity"), [
        {
          id: modId(instanceKey(ctx, "condition_immune")),
          type: "condition_immunity",
          conditions,
          ...(whileClause
            ? { label: `Immunity to ${conditions.join(" and ")} (${whileClause})` }
            : {}),
        },
      ])
    },
  },
  {
    id: "speed.walk",
    confidence: "high",
    test: /\b(?:walking\s+)?speed\s+increases?\s+by\s+(\d+)\s+feet\b/i,
    build: (match, ctx, text) => {
      const feet = parseInt(match[1], 10)
      if (!Number.isFinite(feet)) return null
      const primordialLightning =
        /^Primordial Aspect$/i.test(ctx.featureName ?? "") &&
        /\bLightning\b[\s\S]{0,120}\bwalking speed increases?\b/i.test(text)
      return charInstance(newInstanceId(), characteristicCatalogRefId("speed"), [
        {
          id: modId(instanceKey(ctx, "speed_walk")),
          type: "speed",
          speedType: "walk",
          mode: "add",
          value: feet,
          ...(primordialLightning
            ? {
                requiresSheetToggle: "primordial_aspect_lightning",
                label: `+${feet} ft. walking speed (Lightning aspect)`,
              }
            : {}),
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
    test: /\bdarkvision(?:\s+(?:within|of|with\s+a\s+range\s+of))?\s+(\d+)\s+feet\b/i,
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
    id: "vision.mindsight",
    confidence: "high",
    scope: "full",
    test: /\bgain\s+mindsight\s+with\s+a\s+range\s+of\s+(\d+)\s+feet\b/i,
    build: (match, ctx, text) => {
      const rangeFeet = parseInt(match[1], 10)
      if (!Number.isFinite(rangeFeet)) return null
      const intelligenceFloor = text.match(/\bIntelligence\s+(\d+)\s+or\s+higher\b/i)?.[1]
      return charInstance(newInstanceId(), characteristicCatalogRefId("vision"), [
        {
          id: modId(instanceKey(ctx, "mindsight")),
          type: "vision",
          visionType: "custom",
          customType: intelligenceFloor
            ? `Mindsight (creatures with Intelligence ${intelligenceFloor}+)`
            : "Mindsight",
          rangeFeet,
          label: /creature\s+you\s+are\s+unaware\s+of\s+can\s+still\s+be\s+hidden/i.test(text)
            ? "Mindsight; creatures you are unaware of can still be hidden"
            : "Mindsight",
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
    // "Once you do / Once used / Once you cast it this way, you can't … again until you
    // finish/complete a (short or) long rest" — common homebrew once-per-rest phrasing.
    id: "uses.once_until_rest",
    confidence: "high",
    test:
      /\bonce\s+(?:you\s+(?:do|use|cast|create)\b[^.]{0,80}?|used|cast(?:\s+(?:it\s+)?this\s+way)?)\s*,\s*you\s+can(?:['\u2019]t|not)\s+(?:do\s+so|use|cast|create)\b[^.]{0,60}?\bagain\s+until\s+you\s+(?:finish|complete)\s+a\s+(short\s+or\s+long|long|short)\s+rest\b/i,
    build: (match, ctx) => {
      const uses: UsesConfig = {
        type: "fixed",
        fixedAmount: 1,
        recharges: parseRechargeRest(match[1]),
      }
      return usesInstance(newInstanceId(), uses, ctx.featureName ?? "Limited uses")
    },
  },
  {
    // "… once, regaining its use after a long rest" / "regaining the ability to do so after
    // a long rest" — Kibbles-style once-per-rest without "can't … again until".
    id: "uses.once_regain_after_rest",
    confidence: "high",
    scope: "full",
    test:
      /\bonce\b[^.]{0,80}?regain(?:ing)?\s+(?:(?:all\s+)?(?:its|the)\s+uses?|the\s+ability\s+to\s+do\s+so)\s+after\s+a\s+(short\s+or\s+long|long|short)\s+rest\b/i,
    build: (match, ctx) => {
      const uses: UsesConfig = {
        type: "fixed",
        fixedAmount: 1,
        recharges: parseRechargeRest(match[1]),
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
      /\b(?:a\s+)?number(?:\s+of\s+times)?\s+equal\s+to\s+your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier\b/i,
    build: (match, ctx, text) => {
      if (
        !/\bregain(?:ing)?\s+all\s+(?:expended\s+)?uses\b/i.test(text) &&
        !/\bper\s+long\s+rest\b/i.test(text)
      ) {
        return null
      }
      const ability = match[1].toUpperCase().slice(0, 3) as UsesConfig["abilityModifier"]
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
      if (!/\bregain(?:ing)?\s+all\s+(?:expended\s+)?uses\b/i.test(text) && !/\bper\s+long\s+rest\b/i.test(text)) {
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
    id: "grant.creature_companion",
    confidence: "medium",
    test: /\b(?:gain|summon|call)\s+(?:a\s+|an\s+)?([A-Z][A-Za-z0-9' -]{1,40}?(?:Companion|Familiar|Beast Form|Minstrel|Defender))\b/i,
    build: (match) => {
      const name = match[1]?.trim()
      if (!name || /\bfeat\b/i.test(name)) return null
      return grantCreatureInstance([name])
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
    // "You can communicate telepathically with any creature you can see within 30 feet"
    // (Kibbles Telepathy Discipline).
    id: "sense.telepathy.communicate",
    confidence: "high",
    test:
      /\bcommunicate\s+telepathically\s+with\s+any\s+creature\s+(?:you\s+can\s+see\s+)?within\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const rangeFeet = parseInt(match[1], 10)
      if (!Number.isFinite(rangeFeet)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("telepathy"), [
        {
          id: modId(instanceKey(ctx, "telepathy_comm")),
          type: "telepathy",
          rangeFeet,
        },
      ])
    },
  },
  {
    // "You can add your proficiency bonus to Perception and initiative rolls" (Prescience).
    id: "check.bonus.initiative.proficiency",
    confidence: "high",
    test:
      /\badd\s+(?:your\s+)?proficiency\s+bonus\s+to\s+(?:[A-Za-z]+\s+and\s+)?initiative\s+rolls?\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("initiative"), [
        {
          id: modId(instanceKey(ctx, "init_prof")),
          type: "initiative",
          mode: "add_proficiency",
        },
      ]),
  },
  {
    // "use Intelligence instead of Strength for Athletics checks" / "use Intelligence
    // instead of other ability modifiers when making an Athletics check".
    id: "skill.check.alternate_ability",
    confidence: "high",
    test:
      /\buse\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+instead\s+of\s+(?:other\s+ability\s+modifiers?|(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+or\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))?)\s+(?:for|when\s+making)\s+(?:an?\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+checks?\b/i,
    build: (match, ctx, text) => {
      const ability = parseAbilityWord(match[1])
      const skill = matchSkillName(match[2])
      if (!ability || !skill) return null
      const whileClause = text.match(/^\s*(While\s+[^,]{3,80}),/i)
      const trailingCondition = text.match(/\bchecks?\s+((?:against|to)\s+[^.;\n]+)/i)
      const conditionLabel = whileClause?.[1].trim() ?? trailingCondition?.[1].trim()
      return charInstance(
        newInstanceId(),
        characteristicCatalogRefId("skill_check_alternate_ability"),
        [
          {
            id: modId(instanceKey(ctx, "skill_alt_ability")),
            type: "skill_check_alternate_ability",
            ability,
            skills: [skill],
            ...(conditionLabel ? { conditionLabel } : {}),
          },
        ],
      )
    },
  },
  {
    // Projected Weaponry / similar: "use Intelligence instead of Strength or Dexterity
    // for its attack and damage rolls".
    id: "weapon.ability.override",
    confidence: "high",
    test:
      /\buse\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+instead\s+of\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+or\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))?\s+for\s+(?:its\s+|their\s+|your\s+)?(?:attack\s+and\s+damage|damage\s+and\s+attack)\s+rolls?\b/i,
    build: (match, ctx) => {
      const ability = parseAbilityWord(match[1])
      if (!ability) return null
      return charInstance(
        newInstanceId(),
        characteristicCatalogRefId("weapon_ability_override"),
        [
          {
            id: modId(instanceKey(ctx, "weapon_ability_override")),
            type: "weapon_ability_override",
            ability,
            appliesTo: "both",
            scope: "all",
          },
        ],
      )
    },
  },
  {
    // "Whenever you make an ability check using Strength or Dexterity, you can add 1d4
    // to the result" (Enhancing Skill).
    id: "check.bonus.ability_checks.die",
    confidence: "high",
    test:
      /\bwhenever\s+you\s+make\s+an\s+ability\s+check\s+using\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+or\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))?,?\s+you\s+can\s+add\s+(\d+)d(4|6|8|10|12|20)\s+to\s+the\s+result\b/i,
    build: (match, ctx) => {
      const abilities = [match[1], match[2]]
        .map((word) => (word ? parseSaveAbility(word) : null))
        .filter((value): value is string => Boolean(value))
      const dieCount = parseInt(match[3], 10)
      const dieType = `d${match[4]}` as "d4" | "d6" | "d8" | "d10" | "d12" | "d20"
      if (!abilities.length || !Number.isFinite(dieCount)) return null
      return fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), {
        effects: abilities.map((ability, index) => ({
          id: modId(instanceKey(ctx, `ability_check_die_${index}`)),
          kind: "check_roll_modifier",
          checkRollMode: "bonus" as const,
          checkCategory: "ability" as const,
          checkAbility: ability,
          bonusConfig: { mode: "die", dieCount, dieType } satisfies RollBonusConfig,
        })),
      })
    },
  },
  {
    // "raising it as a zombie or skeleton under your control" (Unlife Wielder).
    id: "grant.creature.raise_undead",
    confidence: "high",
    test:
      /\brais(?:e|ing)\s+(?:it|a\s+corpse|the\s+corpse|corpses?)\s+as\s+a\s+(zombie|skeleton)(?:\s+or\s+(?:a\s+)?(zombie|skeleton))?\b/i,
    build: (match, ctx) => {
      const options = [...new Set([match[1], match[2]].filter(Boolean).map(titleCaseWords))]
      if (!options.length) return null
      return charInstance(newInstanceId(), GRANT_CREATURE_CATALOG_ID, [
        {
          ...grantCreatureCharacteristic(options, {
            count: 1,
            ...(options.length > 1 ? { choiceOptions: options } : {}),
          }),
          id: modId(instanceKey(ctx, "raise_undead")),
        },
      ])
    },
  },
  {
    // Manifested Emotions (Kibbles Psychokinesis): ice / magma / dust mephit choice.
    id: "grant.creature.mephit_choice",
    confidence: "high",
    scope: "full",
    test:
      /\b(?:ice|magma|dust)\s+mephit\b[\s\S]{0,120}?\b(?:ice|magma|dust)\s+mephit\b[\s\S]{0,120}?\b(?:ice|magma|dust)\s+mephit\b/i,
    build: (_match, ctx, text) => {
      const found: string[] = []
      for (const kind of ["Ice", "Magma", "Dust"] as const) {
        if (new RegExp(`\\b${kind}\\s+mephit\\b`, "i").test(text)) {
          found.push(`${kind} Mephit`)
        }
      }
      if (found.length < 2) return null
      return charInstance(newInstanceId(), GRANT_CREATURE_CATALOG_ID, [
        {
          ...grantCreatureCharacteristic(found, {
            count: 1,
            choiceOptions: found,
          }),
          id: modId(instanceKey(ctx, "mephit_choice")),
          label: `Manifest mephit (${found.join(" / ")})`,
        },
      ])
    },
  },
  {
    id: "language.known",
    confidence: "high",
    // Capitalized word required (case-sensitive) so pronouns / clause openers
    // ("you know it can cast…", "you know whether…") don't wire as languages.
    test: /\b[Yy]ou know (?!the )([A-Z][a-z]+)\b/,
    build: (match, ctx) => {
      const raw = match[1].trim()
      const notLanguages = new Set([
        "It", "Its", "That", "This", "These", "Those", "They", "The", "A", "An",
        "One", "Two", "What", "Whether", "How", "If", "When", "Where", "Which", "Who", "You",
      ])
      if (notLanguages.has(raw)) return null
      const language = titleCaseWords(raw)
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
    test: /\b(?:you\s+know|learn|you\s+learn)\s+the\s+([A-Za-z' ]+?)\s+cantrip\b/i,
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
    id: "spell.can_cast_named",
    confidence: "high",
    scope: "full",
    test: /\byou can cast(?:\s+the)?\s+(.+?)\s+spells?\b/i,
    build: (match, ctx, text) => {
      const ritualOnly = /\bbut only as(?:\s+a)?\s+rituals?\b/i.test(text)
      if (!ritualOnly && /\bat will\b/i.test(text)) return null
      // Natural Recovery-style: "cast … without exhausting / without a slot" is an ability,
      // not always-prepared named spells. Check full text — the capture ends at "spell(s)".
      if (!ritualOnly && /\bwithout(?:\s+expending)?\s+a\s+spell\s+slot\b/i.test(text)) return null
      // Psi-point casting is handled by spell.cast_via_psi_points — the lazy capture here
      // would only pick up a partial name list.
      if (/\bby\s+(?:expend|spend)ing\s+(?:\d+\s+)?psi\s+points?\b/i.test(text)) return null
      const names = parseSpellNameList(match[1])
      if (!names.length) return null
      const castingAbility = parseCastingAbilityFromText(text) ?? undefined
      return charInstance(newInstanceId(), characteristicCatalogRefId("spells_known"), [
        {
          id: modId(instanceKey(ctx, "can_cast_named")),
          type: "spells_known",
          spells: names.map((name) => ({
            spellId: spellNamePlaceholder(name),
            alwaysPrepared: true,
            castAsRitual: ritualOnly || undefined,
          })),
          alwaysPrepared: true,
          castingAbility,
          label: ritualOnly ? `${names.join(", ")} (ritual only)` : names.join(", "),
        },
      ])
    },
  },
  {
    id: "spell.gain_cast_named",
    confidence: "high",
    scope: "full",
    // Explicit grants that omit the literal word "spell": "You can cast minor
    // illusion with your psionic powers" / "You gain the ability to cast plane
    // shift and teleport." Stop before "at will" so spell.cast_named_at_will wins.
    test:
      /\byou\s+(?:gain\s+the\s+ability\s+to|can)\s+cast\s+([A-Za-z][A-Za-z'\/ -]{2,80}?)(?=\s+with\s+your\s+psionic\s+powers|\s+at\s+will\b|\s*[.;])/i,
    build: (match, ctx, text) => {
      if (/\bat\s+will\b/i.test(text) && /\bcast\s+[A-Za-z][A-Za-z'\/ -]{2,60}?\s+at\s+will\b/i.test(text)) {
        return null
      }
      const names = parseSpellNameList(match[1])
      if (!names.length) return null
      return spellsKnownInstance(ctx, "gain_cast_named", names, names.join(", "))
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
    // "cast antimagic field by expending 8 psi points" / "expend 5 psi points to cast
    // animate objects" — psi-point casters (Kibbles Psion). Psi cost itself is wired
    // separately by resource.expend_psi_points.
    id: "spell.cast_via_psi_points",
    confidence: "high",
    scope: "full",
    test:
      /\bcast\s+([A-Za-z][A-Za-z'\/ -]{2,60}?)\s+by\s+(?:expend|spend)ing\s+(?:\d+\s+)?psi\s+points?\b|\b(?:expend|spend)\s+\d+\s+psi\s+points?\s+to\s+cast\s+([A-Za-z][A-Za-z'\/ -]{2,60}?)(?=\s*[.,;:]|$)/i,
    build: (match, ctx) => {
      const names = parseSpellNameList(match[1] ?? match[2] ?? "")
      if (!names.length) return null
      return spellsKnownInstance(
        ctx,
        "cast_via_psi",
        names,
        `${names.join(", ")} (cast with psi points)`,
      )
    },
  },
  {
    // "You can cast awaken once without expending a spell slot or psi points" /
    // "cast fire shield without expending psi points". Once-per-rest limits wire
    // separately via uses.once_until_rest.
    id: "spell.cast_named_no_slot",
    confidence: "high",
    scope: "full",
    test:
      /\bcast\s+([A-Za-z][A-Za-z'\/ -]{2,60}?)\s+(?:once\s+)?without\s+expending\s+(?:a\s+spell\s+slots?(?:\s+or\s+psi\s+points?)?|psi\s+points?)/i,
    build: (match, ctx) => {
      const fragment = match[1].replace(/\s+at\s+will$/i, "").replace(/\s+once$/i, "")
      const names = parseSpellNameList(fragment)
      if (!names.length) return null
      return spellsKnownInstance(
        ctx,
        "cast_no_slot",
        names,
        `${names.join(", ")} (no slot or psi cost)`,
      )
    },
  },
  {
    // "You can cast alter self at will …" / "You gain the ability to cast alter self at will"
    id: "spell.cast_named_at_will",
    confidence: "high",
    test:
      /\b(?:can|gain\s+the\s+ability\s+to)\s+cast\s+([A-Za-z][A-Za-z'\/ -]{2,60}?)\s+at\s+will\b/i,
    build: (match, ctx) => {
      const names = parseSpellNameList(match[1])
      if (!names.length) return null
      return spellsKnownInstance(ctx, "cast_at_will", names, `${names.join(", ")} (at will)`)
    },
  },
  {
    // "You gain the cure wounds spell" / "You learn divide self and can cast it …" /
    // "You learn invest life." — named-spell learning outside cantrip phrasing.
    id: "spell.learn_named",
    confidence: "high",
    scope: "full",
    test:
      /\byou\s+(?:gain|learn)\s+the\s+([A-Za-z][A-Za-z'\/ -]{2,60}?)\s+spells?\b|\byou\s+learn\s+([A-Za-z][A-Za-z'\/ -]{2,60}?)(?=\s*[.,]|\s+and\s+can\s+cast\b)/i,
    build: (match, ctx, text) => {
      const fromGain = match[1]
      const fromLearn = match[2]
      // The bare "You learn X." form needs casting context nearby to avoid
      // wiring narrative "you learn …" ribbons as spells.
      if (!fromGain && !/\bcast\b/i.test(text)) return null
      const names = parseSpellNameList(fromGain ?? fromLearn ?? "")
      if (!names.length) return null
      return spellsKnownInstance(ctx, "learn_named", names, names.join(", "))
    },
  },
  {
    // "The mutate and polymorph spells are added to your Enhancement Alternate Effects
    // list" / "You add the spell weird to your alternate effects list" — Kibbles Psion
    // talents that extend a discipline's psi-castable spell list.
    id: "spell.added_to_effects_list",
    confidence: "high",
    scope: "full",
    test:
      /\b(?:(?:the\s+)?([A-Za-z][A-Za-z'\/, -]{2,80}?)(?:\s+spells?)?\s+(?:is|are)\s+added\s+to\s+your\s+[A-Za-z' ]{0,40}?Alternate\s+Effects?\s+list|you\s+add\s+the\s+spell\s+([A-Za-z][A-Za-z'\/ -]{2,60}?)\s+to\s+your\s+[A-Za-z' ]{0,40}?[Aa]lternate\s+[Ee]ffects?\s+list)/i,
    build: (match, ctx) => {
      const names = parseSpellNameList(match[1] ?? match[2] ?? "")
      if (!names.length) return null
      return spellsKnownInstance(
        ctx,
        "added_alt_effects",
        names,
        `${names.join(", ")} (Alternate Effects)`,
      )
    },
  },
  {
    // Uncanny Flexibility / similar: "your reach increases by 5 feet when making melee
    // attacks" — self reach for melee/unarmed interactions.
    id: "weapon.reach.bonus",
    confidence: "high",
    test: /\breach\s+increases?\s+by\s+(\d+)\s+feet\b/i,
    build: (match, ctx) => {
      const reachBonusFeet = parseInt(match[1], 10)
      if (!Number.isFinite(reachBonusFeet) || reachBonusFeet <= 0) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("weapon_reach_modifier"), [
        {
          id: modId(instanceKey(ctx, "weapon_reach")),
          type: "weapon_reach_modifier",
          reachBonusFeet,
          appliesToUnarmedStrike: true,
          label: `+${reachBonusFeet} ft. reach`,
        },
      ])
    },
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
    id: "action.bonus.dash_disengage.while_raging",
    confidence: "high",
    scope: "full",
    test: /\b(?:disengage and dash|dash and disengage)\b/i,
    build: (_match, ctx, text) => {
      if (!/\bbonus\s+action\b/i.test(text)) return null
      if (!/\brage\b/i.test(text)) return null
      return fxInstance(newInstanceId(), effectCatalogRefId("movement_option"), {
        bonusAction: true,
        requirements: [{ kind: "while_raging" }],
        effects: [
          {
            id: modId(instanceKey(ctx, "dash_disengage_raging")),
            kind: "movement_option",
            label: "Take the Disengage and Dash actions",
          } satisfies FeatureEffect,
        ],
      })
    },
  },
  {
    id: "movement.leap.full_speed",
    confidence: "high",
    scope: "full",
    // Propelled Bound: "When you move on your turn, you can expend movement up to your
    // speed in a single bounding leap …" — a self movement option covering up to your
    // full speed as a jump. Keyed on the distinctive "bounding leap" phrasing.
    test: /\bbounding leap\b/i,
    build: (_match, ctx) =>
      fxInstance(newInstanceId(), effectCatalogRefId("movement_option"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "propelled_bound")),
            kind: "movement_option",
            moveDistanceMode: "speed",
            movementTypes: ["jump"],
            label: "Leap up to your Speed as a single bounding jump",
          } satisfies FeatureEffect,
        ],
      }),
  },
  {
    id: "spell.damage.half_on_save",
    confidence: "high",
    scope: "full",
    // Potent Psionics: "When a target succeeds on a saving throw against a damaging
    // Psionic Power … it still takes half damage but suffers no other effects." Mirrors
    // Evoker Potent Cantrip (on_cast_spell_trigger + damage_reduction half-on-save).
    test: /(?:still\s+)?takes?\s+half\s+(?:the\s+)?damage\b[\s\S]{0,40}?\bno\s+other\s+effect/i,
    build: (_match, ctx, text) => {
      if (!/\bsav(?:e|ing)\b/i.test(text)) return null
      return charInstance(newInstanceId(), "cat_char_on_cast_spell_trigger", [
        {
          id: modId(instanceKey(ctx, "half_damage_on_save")),
          type: "on_cast_spell_trigger",
          spellTags: ["discipline power", "damage"],
          effect: { catalogRefId: "cat_fx_damage_reduction" },
          label:
            "Damaging power on a successful save: target still takes half damage and suffers no other effects",
        },
      ])
    },
  },
  {
    id: "spell.damage.add_int_psionic_power",
    confidence: "high",
    scope: "full",
    // Shared by several Psion subclasses' Empowered Psionics feature. This is
    // represented the same way as Empowered Evocation: a scoped cast trigger
    // whose label carries the ability-modifier calculation for the sheet.
    test:
      /\bwhen\s+(?:you|a creature)\s+(?:deal|deals|suffer|suffers)\s+damage\s+(?:with|from)\s+(?:(?:one of\s+)?your\s+|a\s+)?psionic discipline powers?,?\s+you can add your Intelligence modifier to the damage dealt\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), "cat_char_on_cast_spell_trigger", [
        {
          id: modId(instanceKey(ctx, "psionic_power_int_damage")),
          type: "on_cast_spell_trigger",
          spellTags: ["discipline power", "damage"],
          effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
          label: "+INT to damage dealt by a psionic discipline power",
        },
      ]),
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
    test: /\b(?:expend|spend)(?:ing)?\s+(\d+)\s+psi\s+points?\b/i,
    build: (_match, ctx, text) => {
      // Find the first spend that is an activation cost — "unless you expend N psi
      // points" is an alternate-refresh clause, not the ability's cost.
      let amount: number | null = null
      const all = text.matchAll(/\b(?:expend|spend)(?:ing)?\s+(\d+)\s+psi\s+points?\b/gi)
      for (const hit of all) {
        const before = text.slice(Math.max(0, (hit.index ?? 0) - 24), hit.index ?? 0)
        if (/\bunless\s+you\s*$/i.test(before)) continue
        amount = parseInt(hit[1], 10)
        break
      }
      if (amount == null) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("uses"), [
        {
          id: modId(instanceKey(ctx, "psi_spend")),
          type: "uses",
          uses: {
            type: "class_resource",
            classResourceKey: "psi_points",
            classResourceAmount: amount || 1,
          },
          label: "Spend psi points",
        },
      ])
    },
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
  {
    id: "resource.turn_start_regain_pool",
    confidence: "high",
    scope: "full",
    test: /regain\s+\d+\s+(?:psi\s*(?:die|dice)|psionic\s+energy(?:\s+dice?)?|focus(?:\s+points?)?|sorcery\s+points?)\s+at\s+the\s+start\s+of\s+each\s+of\s+your\s+turns/i,
    build: (_match, ctx, text) => buildTurnStartResourceRestoreModifier(ctx, text),
  },
  ...PSIONIC_TALENT_WIRING_RULES,
]
