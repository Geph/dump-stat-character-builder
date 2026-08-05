import { createModifierInstanceId, syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"
import type { Feature } from "@/lib/types"

/** Rooks Covert Magic — each spell independently usable once per Long Rest. */
const COVERT_MAGIC_SPELLS = ["Feather Fall", "Invisibility", "Knock", "Silence", "Spider Climb"] as const

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

function adaptiveMagicRider() {
  return charInstance(createModifierInstanceId(), characteristicCatalogRefId("power_rider"), [
    {
      id: modId("adaptive_magic"),
      type: "power_rider",
      parentPowerNames: ["Adaptive Magic"],
      alertSummary:
        "While chosen: learn one additional Warmage trick (doesn't count against tricks known) and one additional Warmage cantrip.",
      label: "Adaptive Magic — extra trick + cantrip while active",
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

        if (/^house of pawns$/i.test(sc.name ?? "")) {
          const features = (sc.features ?? []).map((feat) => {
            if (!/^promotion$/i.test(feat.name ?? "") || !feat.choices?.options?.length) return feat
            const options = feat.choices.options.map((option) => {
              if (!/^adaptive magic$/i.test(option.name ?? "")) return option
              const optWithMods = option as typeof option & {
                linkedModifiers?: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[]
                modifierRefs?: string[]
              }
              const existing = Array.isArray(optWithMods.linkedModifiers) ? optWithMods.linkedModifiers : []
              const already = existing.some((mod) =>
                mod.characteristics?.some((c) => c.type === "power_rider"),
              )
              if (already) return option
              const synced = syncModifierRefs({
                name: option.name,
                description: option.description ?? "",
                linkedModifiers: [...existing, adaptiveMagicRider()],
              } as Feature)
              return {
                ...option,
                linkedModifiers: synced.linkedModifiers,
                modifierRefs: synced.modifierRefs,
              }
            })
            return { ...feat, choices: { ...feat.choices, options } }
          })
          return { ...sc, features } as typeof sc
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
    id: "warmage.subclass.cards_deck_of_fate",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^deck of fate$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["ac", "speed"],
        preset: {
          kind: "char_instance",
          idKey: "deck_of_fate_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_deck_of_fate",
              type: "power_rider",
              parentPowerNames: ["Deck of Fate"],
              alertSummary:
                "Bonus Action: play cards to match a Hands-table result (extra damage, THP, +10 ft. Speed, +1 AC, or +1 saves) — GM-adjudicated card draw.",
              label: "Deck of Fate — card-table reminder",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "The Hands table is a GM-adjudicated card-match engine with multiple possible outcomes — no single unconditional AC/Speed/damage/THP grant applies; resolve narratively at the table per the played hand.",
      },
    ],
  },
  {
    id: "warmage.subclass.darts_bullseye",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^bullseye$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["damage_roll_modifiers"],
        preset: {
          kind: "char_instance",
          idKey: "bullseye_rider",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_bullseye",
              type: "power_rider",
              parentPowerNames: ["Bullseye"],
              alertSummary:
                "On repeating a recorded d20 roll: choose one — extra 1d10 Force damage, regain a Trick Shot use, or reroll (GM/player-chosen tracker option).",
              label: "Bullseye — recorded-roll tracker reminder",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Extra damage is conditional on repeating a recorded d20 roll, and is one of three player-chosen options (not an unconditional damage bonus) — resolve narratively when the trigger condition is met.",
      },
    ],
  },
  {
    id: "warmage.subclass.bishops_siege_casting",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^siege casting$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "siege_casting",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_siege_casting",
              type: "power_rider",
              parentPowerNames: ["Siege Casting"],
              alertSummary:
                "Advantage on spell attack rolls against targets 100+ feet away; double damage to objects/structures.",
              label: "Siege Casting — range advantage reminder",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Range-gated advantage (100+ feet) has no distance-based limitation primitive in this builder — apply it manually when the target is far enough away; the double-damage-to-objects rider is likewise play-time only.",
      },
    ],
  },
  {
    id: "warmage.subclass.bishops_arcane_dominance",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^arcane dominance$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "arcane_dominance",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_arcane_dominance",
              type: "power_rider",
              parentPowerNames: ["Arcane Dominance"],
              alertSummary:
                "Bonus Action: expend spell slots with a combined level of 6+ to regain one expended Arcane Surge use.",
              label: "Arcane Dominance — spend slots to restore Arcane Surge",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Spending a combined spell-slot level (6+) to restore an Arcane Surge use has no alternateRefresh primitive for variable multi-slot costs in this builder — track manually.",
      },
    ],
  },
  {
    id: "warmage.subclass.kings_tactical_master",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^tactical master$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "tactical_master_aura",
          catalogRefId: "cat_char_aura",
          characteristics: [
            {
              id: "mod_tactical_master_aura",
              type: "aura",
              radiusFeet: 10,
              affectsSelf: false,
              affectsAllies: true,
              saveBonusConfig: { mode: "ability_modifier", ability: "Intelligence" },
              label: "Tactical Master — allies add Intelligence modifier to saves vs. spells/magic",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Bonus is limited to saving throws against spells and magical effects (not all saves) and has a minimum-of-1 floor — apply that scope/floor manually; this builder's aura save bonus doesn't model per-save-type gating.",
      },
    ],
  },
  {
    id: "warmage.subclass.pawns_multidiscipline",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^multidiscipline$/i },
    operations: [
      {
        op: "attachNamedPreset",
        preset: {
          kind: "char_instance",
          idKey: "multidiscipline",
          catalogRefId: "cat_char_power_rider",
          characteristics: [
            {
              id: "mod_multidiscipline",
              type: "power_rider",
              parentPowerNames: ["Multidiscipline"],
              alertSummary:
                "Add half your Proficiency Bonus (round down) to any saving throw that doesn't otherwise use it.",
              label: "Multidiscipline — half-proficiency on non-proficient saves",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "No per-save proficiency-aware check_roll_modifier bonus exists in this builder — apply the half-proficiency bonus to non-proficient saves manually.",
      },
    ],
  },
  {
    id: "warmage.subclass.dice_dice_of_fate",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^dice of fate$/i },
    operations: [
      {
        op: "setLimitedUses",
        uses: {
          type: "class_resource",
          classResourceKey: "dice_of_fate",
          classResourceAmount: 1,
        },
      },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Dice of Fate pool is tracked on class_resources.dice_of_fate (4 from L3, 6 from L7; long-rest recharge).",
      },
    ],
  },
  {
    id: "warmage.subclass.dice_chaos_roll",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^chaos roll$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Chaos Roll's 2d6 result table is a GM-adjudicated random effect — resolve narratively at the table; only the Magic Action cost (2 Dice of Fate) is tracked here.",
      },
    ],
  },
  {
    id: "warmage.subclass.dice_roll_the_bones",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^roll the bones$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "warmage.subclass.darts_intercepting_shot",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^intercepting shot$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "warmage.subclass.rooks_fleeting_decoy",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^fleeting decoy$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "warmage.subclass.knights_field_of_blades",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^field of blades$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
    ],
  },
  {
    id: "warmage.subclass.rooks_covert_magic",
    pack: "warmage",
    target: "subclass_feature",
    match: { subclassClassName: /warmage/i, name: /^covert magic$/i },
    operations: [
      {
        op: "attachNamedPreset",
        replaceCharacteristicTypes: ["spells_known", "uses"],
        preset: {
          kind: "char_instance",
          idKey: "covert_magic_spells",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_covert_magic_spells",
              type: "spells_known",
              alwaysPrepared: true,
              spells: COVERT_MAGIC_SPELLS.map((name) => ({
                spellId: spellNamePlaceholder(name),
                alwaysPrepared: true,
              })),
              freeCastPerLongRest: COVERT_MAGIC_SPELLS.map((name) => ({ spellName: name, count: 1 })),
              label: "Covert Magic (1 free cast each / Long Rest)",
            },
          ],
        },
      },
      {
        op: "appendDescription",
        text: "Each spell is an independent free cast per Long Rest (not a single shared use). Expending Arcane Surge to regain all uses at once is a narrative refresh — no action required, tracked manually.",
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
