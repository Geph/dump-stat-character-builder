import { createModifierInstanceId, syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import type { Feature } from "@/lib/types"

/** Cantrips column → incremental Warmage cantrip picks (not cumulative totals). */
export const WARMAGE_CANTRIP_GRANTS = [
  { level: 0, count: 4 },
  { level: 0, count: 1, unlocksAtClassLevel: 3 },
  { level: 0, count: 1, unlocksAtClassLevel: 5 },
  { level: 0, count: 1, unlocksAtClassLevel: 9 },
  { level: 0, count: 1, unlocksAtClassLevel: 13 },
  { level: 0, count: 1, unlocksAtClassLevel: 17 },
  { level: 0, count: 1, unlocksAtClassLevel: 20 },
] as const

/** House of Kings maneuvers — all known (not a Maneuvers Known picker). */
export const WARMAGE_KINGS_MANEUVERS = [
  {
    name: "Blitz",
    description:
      "<p>When you hit a creature with an attack, you can expend one Battle Die as a Bonus Action to maneuver one of your allies. Add the Battle Die to the attack's damage roll. Choose an ally within 60 feet of yourself that can see or hear you. That ally can take a Reaction to move up to its Speed without provoking Opportunity Attacks.</p>",
  },
  {
    name: "Check",
    description:
      "<p>When you hit a creature with an attack, you can expend one Battle Die as a Bonus Action to threaten the target. Add the Battle Die to the attack's damage roll. The target has the Frightened condition until the end of your next turn.</p>",
  },
  {
    name: "Flash of Brilliance",
    description:
      "<p>When you fail an Intelligence or Wisdom check, you can expend one Battle Die to add it to the roll, potentially turning it into a success. You can only use this maneuver once per turn.</p>",
  },
  {
    name: "Gambit",
    description:
      "<p>When you hit a creature with an attack, you can expend one Battle Die as a Bonus Action to give your allies an opening. Add the Battle Die to the attack's damage roll. The next creature other than yourself to make an attack roll against the target adds the Battle Die to the attack roll.</p>",
  },
  {
    name: "Morale Boost",
    description:
      "<p>When an ally you can see within 60 feet of yourself fails a saving throw, you can take a Reaction to expend one Battle Die and add it to the roll, potentially turning it into a success.</p>",
  },
  {
    name: "Stalemate",
    description:
      "<p>When you hit a creature with an attack, you can expend one Battle Die as a Bonus Action to hold that creature in place. Add the Battle Die to the attack's damage roll. The target must succeed on a Strength saving throw or its Speed becomes 0 until the end of its next turn.</p>",
  },
] as const

type MechanicRow = Record<string, unknown>

function asRecord(value: unknown): MechanicRow | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as MechanicRow) : null
}

function looksCumulativeCantripGrants(mechanics: unknown[]): boolean {
  const counts: number[] = []
  for (const mech of mechanics) {
    const m = asRecord(mech)
    if (!m || m.kind !== "spells_known") continue
    const label = String(m.spellChoiceLabel ?? "")
    if (label && !/cantrip/i.test(label)) continue
    for (const g of Array.isArray(m.spellChoiceGrants) ? m.spellChoiceGrants : []) {
      const row = asRecord(g)
      if (row && row.level === 0 && typeof row.count === "number") counts.push(row.count)
    }
  }
  const sorted = [...counts].sort((a, b) => a - b)
  return sorted.length >= 3 && sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6
}

function normalizeSpellcastingMechanics(mechanics: unknown[]): unknown[] {
  const ability = mechanics.find((mech) => asRecord(mech)?.kind === "spellcasting_ability")
  return [
    ...(ability ? [ability] : [
      {
        kind: "spellcasting_ability",
        spellcastingAbility: "intelligence",
        sourcePhrase: "Intelligence is your spellcasting ability for your Warmage spells.",
        confidence: "high",
      },
    ]),
    {
      kind: "spells_known",
      spellChoiceGrants: [...WARMAGE_CANTRIP_GRANTS],
      spellChoiceLabel: "Warmage cantrips",
      sourcePhrase: "You know Warmage cantrips of your choice as shown in the Cantrips column.",
      confidence: "high",
    },
  ]
}

function ensureArcaneSurgeResource(
  resources: NonNullable<ImportContent["class_resources"]>,
): NonNullable<ImportContent["class_resources"]> {
  const without = resources.filter((r) => r.resource_key !== "arcane_surge")
  return [
    ...without,
    {
      class_name: "Warmage",
      resource_key: "arcane_surge",
      name: "Arcane Surge",
      description:
        "Once per turn, double a Warmage cantrip's damage dice (triple if already a Critical Hit). Regain 1 use on a Short Rest and all uses on a Long Rest. Master Warmage restores 1 use when you roll Initiative with none left.",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        atLevelTable: [
          { level: 5, count: 2 },
          { level: 11, count: 3 },
        ],
        recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
        rechargeOnInitiative: 1,
      },
    },
  ]
}

function grantKingsManeuvers() {
  return charInstance(createModifierInstanceId(), characteristicCatalogRefId("grant_custom_ability"), [
    {
      id: modId("warmage_kings_maneuvers"),
      type: "grant_custom_ability",
      abilityNames: WARMAGE_KINGS_MANEUVERS.map((m) => m.name),
      label: "Gain House of Kings Maneuver Options",
    },
  ])
}

/**
 * Sanitize Mage Hand Press Warmage imports:
 * - INT cantrip-only spellcasting (no base caster_progression — Bishops adds third caster)
 * - Incremental cantrip spellChoiceGrants
 * - Ensure arcane_surge pool (2→3) with short regain 1 / long all / Initiative restore 1
 * - House of Kings: inject maneuver knacks + auto-grant on Battle Tactics
 * - House of Bishops: subclass spellcasting third prepared
 */
export function sanitizeWarmageImportContent(content: ImportContent): ImportContent {
  const hasWarmage = (content.classes ?? []).some((cls) => /warmage/i.test(cls.name ?? ""))
  if (!hasWarmage) return content

  let next: ImportContent = { ...content }

  next = {
    ...next,
    class_resources: ensureArcaneSurgeResource(next.class_resources ?? []),
  }

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/warmage/i.test(cls.name ?? "")) return cls
        const existing = (cls.spellcasting ?? {}) as {
          ability?: string
          caster_progression?: string
          prepared?: boolean
        }
        // Base Warmage has no spell slots — strip mistaken full/half progression.
        const { caster_progression: _drop, ...restCasting } = existing
        const spellcasting = {
          ...restCasting,
          ability: existing.ability ?? "Intelligence",
        }
        const features = (cls.features ?? []).map((feat) => {
          if (!/^spellcasting$/i.test(feat.name ?? "")) return feat
          const mechanics = Array.isArray(feat.mechanics) ? feat.mechanics : []
          return {
            ...feat,
            mechanics: looksCumulativeCantripGrants(mechanics)
              ? normalizeSpellcastingMechanics(mechanics)
              : mechanics.length
                ? mechanics
                : normalizeSpellcastingMechanics([]),
          }
        })
        return { ...cls, spellcasting, features } as typeof cls
      }),
    }
  }

  // Ensure Kings maneuvers exist as knacks (auto-granted — not Tricks pool).
  const proposals = [...(next.import_proposals?.custom_abilities ?? [])]
  for (const maneuver of WARMAGE_KINGS_MANEUVERS) {
    const exists = proposals.some(
      (a) =>
        a.name === maneuver.name &&
        (/house of kings/i.test(a.source_name ?? "") || a.source_type === "subclass"),
    )
    if (exists) continue
    proposals.push({
      proposal_id: `kings_${maneuver.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: maneuver.name,
      ability_role: "knack",
      definition: "House of Kings Battle Dice maneuver.",
      description: maneuver.description,
      source_type: "subclass",
      source_name: "House of Kings",
      level_requirement: 3,
      eligible_classes: ["Warmage"],
    })
  }
  // Demote Kings maneuvers out of the Warmage Tricks picker (subclass source + knack would show up).
  const normalizedProposals = proposals.map((ability) => {
    if (
      ability.source_type === "subclass" &&
      /house of kings/i.test(ability.source_name ?? "") &&
      WARMAGE_KINGS_MANEUVERS.some((m) => m.name === ability.name) &&
      ability.ability_role === "knack"
    ) {
      const { ability_role: _role, ...rest } = ability
      return rest
    }
    return ability
  })
  next = {
    ...next,
    import_proposals: {
      ...next.import_proposals,
      custom_abilities: normalizedProposals as NonNullable<
        NonNullable<ImportContent["import_proposals"]>["custom_abilities"]
      >,
    },
  }

  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((sc) => {
        if (!/warmage/i.test(sc.class_name ?? "")) return sc

        if (/^house of bishops$/i.test(sc.name ?? "")) {
          const existing = (sc.spellcasting ?? {}) as {
            ability?: string
            caster_progression?: "full" | "half" | "third" | "pact"
            prepared?: boolean
          }
          return {
            ...sc,
            spellcasting: {
              ...existing,
              ability: existing.ability ?? "Intelligence",
              caster_progression: existing.caster_progression ?? "third",
              prepared: existing.prepared ?? true,
            },
          } as typeof sc
        }

        if (!/^house of kings$/i.test(sc.name ?? "")) return sc
        const features = (sc.features ?? []).map((feat) => {
          if (/^battle tactics$/i.test(feat.name ?? "")) {
            const existing = Array.isArray((feat as Feature).linkedModifiers)
              ? ((feat as Feature).linkedModifiers ?? [])
              : []
            const already = existing.some((mod) =>
              mod.characteristics?.some((c) => c.type === "grant_custom_ability"),
            )
            if (already) return feat
            const synced = syncModifierRefs({
              name: feat.name,
              description: feat.description ?? "",
              linkedModifiers: [...existing, grantKingsManeuvers()],
            } as Feature)
            return { ...feat, linkedModifiers: synced.linkedModifiers } as typeof feat
          }
          if (/\[maneuver\]/i.test(feat.name ?? "")) {
            return feat
          }
          return feat
        })
        return { ...sc, features }
      }),
    }
  }

  return next
}

export const WARMAGE_PRESETS: EnrichmentPreset[] = [
  {
    id: "warmage.class.spellcasting",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^spellcasting$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Base Warmage is Intelligence cantrip casting only (no spell slots). House of Bishops adds third-caster Wizard prepared slots on the subclass. Cantrips scale from the Cantrips column via incremental spellChoiceGrants.",
      },
    ],
  },
  {
    id: "warmage.class.warmage_edge",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^warmage edge$/i },
    skipIfCharacteristicTypes: ["on_cast_spell_trigger"],
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "warmage_edge",
          catalogRefId: "cat_char_on_cast_spell_trigger",
          characteristics: [
            {
              id: "mod_warmage_edge",
              type: "on_cast_spell_trigger",
              spellTags: ["cantrip", "damage"],
              effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
              label:
                "Warmage Edge: once per turn add INT (and Cantrip Bonus Dice from level 5+) to one cantrip damage roll",
            },
          ],
        },
      },
    ],
  },
  {
    id: "warmage.class.warmage_tricks",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^warmage tricks$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Tricks use optionsSource class_knacks + class_resources.tricks_known (special). Import Warmage-exclusive cantrips with Tricks so prerequisites like Force Buckler resolve. House of Kings maneuvers are separate auto-grants — not Tricks picks.",
      },
    ],
  },
  {
    id: "warmage.class.arcane_surge",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^arcane surge$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "arcane_surge",
          classResourceAmount: 1,
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Dump Stat tracks Arcane Surge on class_resources.arcane_surge (2 uses from L5, 3 from L11; short regain 1 / long all). Doubling cantrip damage dice remains play-time.",
      },
    ],
  },
  {
    id: "warmage.class.arcane_surge_improvement",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^arcane surge improvement$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Raises Arcane Surge uses to 3 (see class_resources.arcane_surge atLevelTable).",
      },
    ],
  },
  {
    id: "warmage.class.master_warmage",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^master warmage$/i },
    operations: [
      {
        op: "appendDescription",
        text: "When you roll Initiative with 0 Arcane Surge uses, regain 1 (uses.rechargeOnInitiative: 1 on arcane_surge).",
      },
    ],
  },
  {
    id: "warmage.class.reliable_cantrip",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^reliable cantrip$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Reliable Cantrip minimum damage on a miss or successful save is tracked narratively — apply minimum dice + Edge when resolving the roll.",
      },
    ],
  },
  {
    id: "warmage.class.strategic_deflection",
    pack: "warmage",
    target: "class_feature",
    match: { className: /warmage/i, name: /^strategic deflection$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
      },
    ],
  },
  {
    id: "warmage.subclass.kings_battle_tactics",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^battle tactics$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "House of Kings knows all listed maneuvers (auto-granted) — not a Maneuvers Known / Tricks picker. Battle Dice pool is subclass-scoped class_resources.battle_dice with rechargeOnInitiative.",
      },
    ],
  },
  {
    id: "warmage.subclass.kings_maneuver_feature",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /\[maneuver\]/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Subclass maneuver — keep \"expend one Battle Die\" phrasing. Not a Tricks pick.",
      },
    ],
  },
  {
    id: "warmage.subclass.bishops_spellcasting",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^spellcasting$/i },
    operations: [
      {
        op: "appendDescription",
        text: "House of Bishops is a third caster (Wizard list, prepared). Set subclass.spellcasting { ability: Intelligence, caster_progression: third, prepared: true }. Warmage Edge can improve level 1+ Wizard spells as if they were cantrips.",
      },
    ],
  },
]
