import {
  CAPTAIN_BASE_MANEUVERS,
  isCaptainBaseManeuverName,
  sanitizeCaptainFeature,
} from "@/lib/compendium/captain-feature-wiring"
import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import type { Feature } from "@/lib/types"

/** Descriptions already present in the Captain import fixture — used when a pass drops a row. */
export const CAPTAIN_BASE_MANEUVER_FALLBACKS: Record<
  (typeof CAPTAIN_BASE_MANEUVERS)[number],
  { description: string; execution: string }
> = {
  Bolster: {
    description:
      "<p>As a Bonus Action, you can expend one Battle Die to motivate an ally within 60 feet of yourself. The next time your ally makes an attack before the start of your next turn, it adds the Battle Die to the attack and damage roll.</p>",
    execution: "Bonus Action, expend one Battle Die",
  },
  "Born Leader": {
    description:
      "<p>When you fail a Wisdom or Charisma check, you can expend one Battle Die to add it to the roll, potentially turning it into a success. You can only use this maneuver once per turn.</p>",
    execution: "When you fail a Wisdom or Charisma check, expend one Battle Die",
  },
  "Morale Boost": {
    description:
      "<p>When an ally you can see within 60 feet of yourself fails a saving throw, you can take a Reaction to expend one Battle Die and add it to the roll, potentially turning it into a success.</p>",
    execution: "Reaction, expend one Battle Die, when an ally fails a save",
  },
  Rally: {
    description:
      "<p>As a Bonus Action on your turn, you can expend one Battle Die to choose one ally within 60 feet of yourself that can see or hear you. That creature regains Hit Points equal to the number rolled + your Charisma modifier.</p>",
    execution: "Bonus Action, expend one Battle Die",
  },
  "Staggering Strike": {
    description:
      "<p>When you hit a creature with an attack using a Melee weapon or an Unarmed Strike, you can expend one Battle Die as a Bonus Action to daze the target. Add the Battle Die to the attack's damage roll.</p>",
    execution: "Bonus Action, expend one Battle Die, when you hit",
  },
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function looksLikeCaptainClassManeuver(ability: Record<string, unknown>): boolean {
  const name = String(ability.name ?? "")
  if (!name || /^cohort$/i.test(name) || /\[maneuver\]/i.test(name)) return false
  if (isCaptainBaseManeuverName(name)) return true
  const sourceType = String(ability.source_type ?? "")
  const sourceName = String(ability.source_name ?? ability.parent_class_name ?? "")
  if (sourceType === "subclass") return false
  if (sourceName && !/captain/i.test(sourceName)) return false
  const text = `${ability.description ?? ""} ${ability.definition ?? ""}`
  return /expend\s+(?:one|a|1)\s+battle\s+die/i.test(text)
}

function fallbackProposal(name: (typeof CAPTAIN_BASE_MANEUVERS)[number]) {
  const fallback = CAPTAIN_BASE_MANEUVER_FALLBACKS[name]
  return {
    proposal_id: `${name.toLowerCase().replace(/\s+/g, "_")}_maneuver`,
    name,
    ability_role: "knack" as const,
    definition: "Base Battle Die maneuver, known automatically by all Captains.",
    description: fallback.description,
    execution: fallback.execution,
    eligible_classes: ["Captain"],
    source_type: "class" as const,
    source_name: "Captain",
    level_requirement: 1,
  }
}

function normalizeCaptainManeuver(ability: Record<string, unknown>): Record<string, unknown> {
  if (!looksLikeCaptainClassManeuver(ability)) return ability
  return {
    ...ability,
    ability_role: "knack",
    source_type: ability.source_type === "compendium" ? "class" : ability.source_type,
    source_name:
      ability.source_type === "compendium" || !ability.source_name ? "Captain" : ability.source_name,
    eligible_classes: Array.isArray(ability.eligible_classes) && ability.eligible_classes.length
      ? ability.eligible_classes
      : ["Captain"],
    level_requirement: ability.level_requirement ?? 1,
  }
}

function collectManeuverNames(abilities: Record<string, unknown>[]): string[] {
  const names = new Set<string>(CAPTAIN_BASE_MANEUVERS)
  for (const ability of abilities) {
    if (!looksLikeCaptainClassManeuver(ability)) continue
    const name = String(ability.name ?? "").trim()
    if (name) names.add(name)
  }
  return [...names]
}

/**
 * Sanitize Captain imports:
 * - Battle Tactics auto-grants base maneuvers (not a Maneuvers Known / class_knacks picker).
 * - Keep subclass [Maneuver] features as extra named options, not knack picks.
 */
export function sanitizeCaptainImportContent(content: ImportContent): ImportContent {
  const hasCaptain = (content.classes ?? []).some((cls) => /captain/i.test(cls.name ?? ""))
  if (!hasCaptain) return content

  const proposalRows = (content.import_proposals?.custom_abilities ?? []).map((row) =>
    normalizeCaptainManeuver(asRecord(row) ?? {}),
  )
  const abilityRows = (content.abilities ?? []).map((row) =>
    normalizeCaptainManeuver(asRecord(row) ?? {}),
  )

  const knownNames = new Set(
    [...proposalRows, ...abilityRows]
      .map((row) => String(row.name ?? "").trim().toLowerCase())
      .filter(Boolean),
  )
  const missingFallbacks = CAPTAIN_BASE_MANEUVERS.filter(
    (name) => !knownNames.has(name.toLowerCase()),
  ).map((name) => fallbackProposal(name))

  const nextProposals = [...proposalRows, ...missingFallbacks]
  const extraNames = collectManeuverNames([...abilityRows, ...nextProposals])

  const classes = (content.classes ?? []).map((cls) => {
    if (!/captain/i.test(cls.name ?? "")) return cls
    return {
      ...cls,
      features: (cls.features ?? []).map((feature) =>
        sanitizeCaptainFeature(feature as Feature, extraNames) as typeof feature,
      ),
    }
  })

  const shouldWriteProposals =
    Boolean(content.import_proposals) || missingFallbacks.length > 0

  return {
    ...content,
    classes,
    ...(content.abilities
      ? { abilities: abilityRows as NonNullable<ImportContent["abilities"]> }
      : {}),
    ...(shouldWriteProposals
      ? {
          import_proposals: {
            ...content.import_proposals,
            custom_abilities: nextProposals as NonNullable<
              NonNullable<ImportContent["import_proposals"]>["custom_abilities"]
            >,
          },
        }
      : {}),
  }
}

export const CAPTAIN_PRESETS: EnrichmentPreset[] = [
  {
    id: "captain.class.battle_tactics",
    pack: "captain",
    target: "class_feature",
    match: { className: /captain/i, name: /^battle tactics$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "captain_battle_tactics_maneuvers",
          catalogRefId: "cat_char_grant_custom_ability",
          characteristics: [
            {
              id: "mod_captain_battle_tactics_maneuvers",
              type: "grant_custom_ability",
              abilityNames: [...CAPTAIN_BASE_MANEUVERS],
              label: "Gain Captain Maneuver Options",
            },
          ],
        },
        replaceCharacteristicTypes: ["grant_custom_ability"],
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "All Captains automatically know Bolster, Born Leader, Morale Boost, Rally, and Staggering Strike (granted as custom abilities — not a Maneuvers Known picker). Subclass [Maneuver] features are additional named options, not pool picks.",
      },
    ],
  },
  {
    id: "captain.subclass.maneuver",
    pack: "captain",
    target: "subclass_feature",
    match: { subclassClassName: /captain/i, name: /\[maneuver\]/i },
    operations: [{ op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } }],
  },
]
