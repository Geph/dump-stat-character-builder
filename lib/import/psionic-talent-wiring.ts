/**
 * Phrase detectors for Psion discipline talents (buckets A/B/D) and power riders.
 */
import type { AbilityModifierKey, AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  characteristicCatalogRefId,
  effectCatalogRefId,
} from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, fxInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { DetectFeatureContext } from "@/lib/import/detect-feature-modifiers"
import type { FeatureModifierRule } from "@/lib/import/detect-feature-modifier-rules"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"

function instanceKey(ctx: DetectFeatureContext, ruleId: string): string {
  return [ctx.contentKind, ctx.sourceName, ctx.featureName, ruleId]
    .filter(Boolean)
    .join("_")
    .replace(/\W+/g, "_")
    .toLowerCase()
}

function newInstanceId(): string {
  return createModifierInstanceId()
}

function parseAbilityWord(word: string): AbilityScoreKey | null {
  const key = word.trim().toLowerCase()
  const map: Record<string, AbilityScoreKey> = {
    strength: "strength",
    dexterity: "dexterity",
    constitution: "constitution",
    intelligence: "intelligence",
    wisdom: "wisdom",
    charisma: "charisma",
  }
  return map[key] ?? null
}

function abilityModKey(ability: AbilityScoreKey): AbilityModifierKey {
  return ability.slice(0, 3).toUpperCase() as AbilityModifierKey
}

/** Parent power names inferred from talent prose for sheet rider alerts. */
const POWER_RIDER_PARENTS: { re: RegExp; parents: string[] }[] = [
  { re: /\bPhase Rift\b/i, parents: ["Phase Rift"] },
  { re: /\bflicker\b/i, parents: ["Phase Rift"] },
  { re: /\bEnhancing Surge\b/i, parents: ["Enhancing Surge"] },
  { re: /\bTelekinetic Force\b/i, parents: ["Telekinetic Force"] },
  { re: /\bAstral Construct\b/i, parents: ["Astral Construct"] },
  { re: /\bMind Leech\b/i, parents: ["Mind Leech"] },
  { re: /\bTelepathic Intrusion\b/i, parents: ["Telepathic Intrusion"] },
  { re: /\bSeeing\b/i, parents: ["Seeing"] },
  { re: /\bDenial\b/i, parents: ["Denial"] },
  { re: /\bElemental Blast\b/i, parents: ["Elemental Blast"] },
  { re: /\bProject Item\b/i, parents: ["Projection Discipline"] },
  { re: /\bAdaptive Hunter\b/i, parents: ["Consumption Discipline"] },
]

function collectParentPowerNames(text: string): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const entry of POWER_RIDER_PARENTS) {
    if (!entry.re.test(text)) continue
    for (const parent of entry.parents) {
      const key = parent.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      names.push(parent)
    }
  }
  return names
}

function powerRiderInstance(
  ctx: DetectFeatureContext,
  parents: string[],
  summary?: string,
): LinkedModifierInstance {
  return charInstance(newInstanceId(), characteristicCatalogRefId("power_rider"), [
    {
      id: modId(instanceKey(ctx, "power_rider")),
      type: "power_rider",
      parentPowerNames: parents,
      alertSummary: summary ?? ctx.featureName ?? "Related talent",
      label: summary ?? ctx.featureName ?? "Related talent",
    },
  ])
}

export const PSIONIC_TALENT_WIRING_RULES: FeatureModifierRule[] = [
  {
    id: "save.bonus.ability_modifier",
    confidence: "high",
    scope: "full",
    test: /\badd\s+your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier\s+to\s+the\s+saving\s+throw\b/i,
    build: (match, ctx) => {
      const ability = parseAbilityWord(match[1])
      if (!ability) return null
      return fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "save_ability_mod")),
            kind: "check_roll_modifier",
            checkRollMode: "bonus",
            checkCategory: "save",
            bonusConfig: { mode: "ability_modifier", ability: abilityModKey(ability) },
          },
        ],
      })
    },
  },
  {
    id: "check.advantage.charisma.attuned",
    confidence: "medium",
    scope: "full",
    test:
      /\bwhen\s+you\s+make\s+a\s+Charisma\s+check[\s\S]{0,120}roll\s+an\s+additional\s+d20\s+and\s+take\s+the\s+higher\s+result\b/i,
    build: (_match, ctx) =>
      fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "cha_keep_higher")),
            kind: "check_roll_modifier",
            checkRollMode: "advantage",
            checkCategory: "ability",
            checkAbility: "Charisma",
          },
        ],
      }),
  },
  {
    id: "spell.telekinetic_movement_buffs",
    confidence: "medium",
    scope: "full",
    test: /\beffect\s+of\s+spider\s+climb,\s+feather\s+fall,\s+or\s+levitate\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("spells_known"), [
        {
          id: modId(instanceKey(ctx, "tk_movement_spells")),
          type: "spells_known",
          alwaysPrepared: true,
          label: "Telekinetic Movement options (cast with 1 psi)",
          spells: ["spider climb", "feather fall", "levitate"].map((name) => ({
            spellId: spellNamePlaceholder(name),
            alwaysPrepared: true,
          })),
        },
      ]),
  },
  {
    id: "precognitive.dreams.thp",
    confidence: "high",
    scope: "full",
    test: /\btemporary\s+hit\s+points\s+equal\s+to\s+your\s+Intelligence\s+modifier\b/i,
    build: (_match, ctx) =>
      fxInstance(newInstanceId(), effectCatalogRefId("grant_temp_hp"), {
        effects: [
          {
            id: modId(instanceKey(ctx, "precog_thp")),
            kind: "grant_temp_hp",
            tempHpTrigger: "on_action",
            healMode: "ability_modifier",
            healAbility: "INT",
            label: "Temporary hit points equal to Intelligence modifier (companions after long rest)",
          },
        ],
      }),
  },
  {
    id: "precognitive.dreams.surprise_immunity",
    confidence: "high",
    scope: "full",
    test: /\b(?:can(?:no|\u2019|\u2018|')?t|cannot)\s+be\s+surprised\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("condition_immunity"), [
        {
          id: modId(instanceKey(ctx, "surprise_immune")),
          type: "condition_immunity",
          conditions: ["Surprised"],
          label: "Can't be surprised",
        },
      ]),
  },
  {
    id: "ability.score.override.physical_surge",
    confidence: "high",
    scope: "full",
    test:
      /\bmake\s+your\s+(Strength|Dexterity)\s+or\s+(Strength|Dexterity)\s+ability\s+score\s+equal\s+to\s+your\s+(Intelligence|Wisdom|Charisma|Strength|Dexterity|Constitution)\s+ability\s+score\b/i,
    build: (match, ctx) => {
      const a = parseAbilityWord(match[1])
      const b = parseAbilityWord(match[2])
      const source = parseAbilityWord(match[3])
      if (!a || !b || !source) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("ability_score_override"), [
        {
          id: modId(instanceKey(ctx, "ability_override")),
          type: "ability_score_override",
          targets: [...new Set([a, b])],
          sourceAbility: source,
          chooseOneTarget: true,
          requiresSheetToggle: "physical_surge_active",
          label: "Physical Surge ability score override",
        },
      ])
    },
  },
  {
    id: "healing.received.half_magical",
    confidence: "high",
    scope: "full",
    test: /\bmagical\s+healing\s+effects\s+on\s+you[\s\S]{0,60}restore\s+only\s+half\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("healing_received_modifier"), [
        {
          id: modId(instanceKey(ctx, "heal_half")),
          type: "healing_received_modifier",
          multiplier: 0.5,
          magicalOnly: true,
          includePotions: true,
          label: "Magical healing received is halved",
        },
      ]),
  },
  {
    id: "elemental.emotions.save_dice",
    confidence: "medium",
    scope: "full",
    test:
      /\bcold\s+lets\s+you\s+add\s+(\d+)d(4|6|8|10)\s+to\s+Wisdom\s+saving\s+throws[\s\S]{0,200}fire\s+lets\s+you\s+add\s+(\d+)d(4|6|8|10)\s+to\s+Constitution[\s\S]{0,200}lightning\s+lets\s+you\s+add\s+(\d+)d(4|6|8|10)\s+to\s+Dexterity\b/i,
    build: (match, ctx) => {
      const rows: { ability: string; dieCount: number; dieType: "d4" | "d6" | "d8" | "d10" }[] = [
        {
          ability: "Wisdom",
          dieCount: parseInt(match[1], 10),
          dieType: `d${match[2]}` as "d4" | "d6" | "d8" | "d10",
        },
        {
          ability: "Constitution",
          dieCount: parseInt(match[3], 10),
          dieType: `d${match[4]}` as "d4" | "d6" | "d8" | "d10",
        },
        {
          ability: "Dexterity",
          dieCount: parseInt(match[5], 10),
          dieType: `d${match[6]}` as "d4" | "d6" | "d8" | "d10",
        },
      ]
      return fxInstance(newInstanceId(), effectCatalogRefId("check_roll_modifier"), {
        effects: rows.map((row, index) => ({
          id: modId(instanceKey(ctx, `elem_save_${index}`)),
          kind: "check_roll_modifier" as const,
          checkRollMode: "bonus" as const,
          checkCategory: "save" as const,
          checkAbility: row.ability,
          bonusConfig: { mode: "die" as const, dieCount: row.dieCount, dieType: row.dieType },
          label: `Elemental Emotions (${row.ability})`,
        })),
      })
    },
  },
  {
    id: "grant.custom_ability.named_power",
    confidence: "high",
    scope: "full",
    test: /\byou\s+gain\s+the\s+([A-Z][A-Za-z' -]{2,40})\s+psionic\s+power\b/i,
    build: (match, ctx) => {
      const name = match[1].trim()
      if (!name) return null
      return charInstance(newInstanceId(), characteristicCatalogRefId("grant_custom_ability"), [
        {
          id: modId(instanceKey(ctx, "grant_ability")),
          type: "grant_custom_ability",
          abilityNames: [name],
          label: `Gain ${name}`,
        },
      ])
    },
  },
  {
    id: "grant.custom_ability.named_discipline",
    confidence: "high",
    scope: "full",
    // "granting the psionic discipline of Telepathy" / "You gain the psionic discipline of Psychokinesis"
    test: /\b(?:granting(?:\s+you)?|you\s+gain)\s+(?:the\s+)?psionic\s+discipline\s+of\s+([A-Za-z][A-Za-z' -]{1,40})/i,
    build: (match, ctx) => {
      const raw = match[1].trim().replace(/[.,;:]+$/, "")
      if (!raw) return null
      const name = /\bdiscipline\b/i.test(raw) ? raw : `${raw} Discipline`
      return charInstance(newInstanceId(), characteristicCatalogRefId("grant_custom_ability"), [
        {
          id: modId(instanceKey(ctx, "grant_discipline")),
          type: "grant_custom_ability",
          abilityNames: [name],
          label: `Gain ${name}`,
        },
      ])
    },
  },
  {
    id: "choice.count.bonus.unlimited_imagination",
    confidence: "high",
    scope: "full",
    test: /\bselect\s+two\s+options\s+from\s+Boundless\s+Imagination\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("feature_choice_count_bonus"), [
        {
          id: modId(instanceKey(ctx, "choice_bonus")),
          type: "feature_choice_count_bonus",
          targetFeatureName: "Boundless Imagination",
          choiceCategory: "Boundless Imagination",
          bonus: 1,
          label: "Unlimited Imagination (+1 Boundless Imagination pick)",
        },
      ]),
  },
  {
    id: "choice.count.bonus.skill_thief",
    confidence: "high",
    scope: "full",
    test:
      /\bgain\s+an\s+additional\s+number\s+of\s+skill,\s+tool,\s+or\s+language\s+proficiencies\s+from\s+Adaptive\s+Hunter\s+equal\s+to\s+half\s+your\s+proficiency\s+bonus\b/i,
    build: (_match, ctx) =>
      charInstance(newInstanceId(), characteristicCatalogRefId("feature_choice_count_bonus"), [
        {
          id: modId(instanceKey(ctx, "skill_thief_slots")),
          type: "feature_choice_count_bonus",
          targetFeatureName: "Adaptive Hunter",
          choiceCategory: "Adaptive Hunter",
          bonusFrom: "half_proficiency",
          label: "Skill Thief (extra Adaptive Hunter slots)",
        },
      ]),
  },
  {
    id: "power.rider.from_prose",
    confidence: "medium",
    scope: "full",
    test:
      /\b(?:Phase Rift|Enhancing Surge|Telekinetic Force|Astral Construct|Mind Leech|Telepathic Intrusion|Elemental Blast|Denial|Seeing|Project Item|flicker)\b/i,
    build: (_match, ctx, text) => {
      const parents = collectParentPowerNames(text)
      if (!parents.length) return null
      return powerRiderInstance(ctx, parents, ctx.featureName ?? undefined)
    },
  },
]
