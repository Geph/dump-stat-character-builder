import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { SKILL_NAMES } from "@/lib/compendium/characteristic-modifiers"
import {
  characteristicCatalogRefId,
  effectCatalogRefId,
} from "@/lib/compendium/modifier-catalog-refs"
import {
  charInstance,
  fxInstance,
  modId,
  usesInstance,
} from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { DetectFeatureContext } from "@/lib/import/detect-feature-modifiers"
import type { UsesConfig } from "@/lib/types"

export type DetectionConfidence = "high" | "medium" | "low"

export type FeatureModifierRule = {
  id: string
  confidence: DetectionConfidence
  test: RegExp
  build: (match: RegExpMatchArray, ctx: DetectFeatureContext, text: string) => LinkedModifierInstance | null
}

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

function parseAbilityWord(word: string): AbilityScoreKey | null {
  return ABILITY_WORD_TO_KEY[word.trim().toLowerCase()] ?? null
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
  const normalized = titleCaseWords(fragment.replace(/\s+and\s+/gi, " "))
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
      /\b(?:AC|armor\s+class)\s+(?:equals|is)\s+(\d+)\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier(?:\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier)?/i,
    build: (match, ctx) => {
      const base = parseInt(match[1], 10)
      const first = parseAbilityWord(match[2])
      const second = match[3] ? parseAbilityWord(match[3]) : null
      if (!first || !Number.isFinite(base)) return null
      const abilities = [first, second].filter(Boolean) as AbilityScoreKey[]
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
      const abilities = [first, second].filter(Boolean) as AbilityScoreKey[]
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
    test: /\b(?:a\s+)?\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?attack\s+rolls?\b/i,
    build: (match, ctx) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("attack_roll_modifiers"), [
        {
          id: modId(instanceKey(ctx, "attack_all")),
          type: "attack_roll_modifiers",
          entries: [{ bonus, target: "all" }],
        },
      ])
    },
  },
  {
    id: "attack.bonus.ranged",
    confidence: "high",
    test: /\b(?:a\s+)?\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?ranged\s+attack\s+rolls?\b/i,
    build: (match, ctx) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("attack_roll_modifiers"), [
        {
          id: modId(instanceKey(ctx, "attack_ranged")),
          type: "attack_roll_modifiers",
          entries: [{ bonus, target: "ranged" }],
        },
      ])
    },
  },
  {
    id: "attack.bonus.melee",
    confidence: "high",
    test: /\b(?:a\s+)?\+\s*(\d+)\s+(?:bonus\s+)?to\s+(?:your\s+)?melee\s+attack\s+rolls?\b/i,
    build: (match, ctx) => {
      const bonus = parseInt(match[1], 10)
      if (!Number.isFinite(bonus)) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("attack_roll_modifiers"), [
        {
          id: modId(instanceKey(ctx, "attack_melee")),
          type: "attack_roll_modifiers",
          entries: [{ bonus, target: "melee" }],
        },
      ])
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
    id: "save.advantage",
    confidence: "high",
    test: /\badvantage\s+on\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving\s+throws?\b/i,
    build: (match, ctx) => {
      const ability = parseSaveAbility(match[1])
      if (!ability) return null
      return fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "save_adv")),
            kind: "check_roll_modifier",
            checkRollMode: "advantage",
            checkCategory: "save",
            checkAbility: ability,
          },
        ],
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
      return fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "skill_adv")),
            kind: "check_roll_modifier",
            checkRollMode: "advantage",
            checkCategory: "skill",
            checkSkills: [skill],
          },
        ],
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
      /\b(?:must|you must)\s+finish\s+a\s+short\s+or\s+long\s+rest\s+before\s+you\s+can\s+use\s+this\s+(?:feature\s+)?again\b/i,
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
]
