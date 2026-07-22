import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"

/** Hexes Known column → incremental cantrip picks (not cumulative counts per tier). */
export const WITCH_HEX_GRANTS = [
  { level: 0, count: 2 },
  { level: 0, count: 1, unlocksAtClassLevel: 2 },
  { level: 0, count: 1, unlocksAtClassLevel: 5 },
  { level: 0, count: 1, unlocksAtClassLevel: 9 },
  { level: 0, count: 1, unlocksAtClassLevel: 13 },
  { level: 0, count: 1, unlocksAtClassLevel: 17 },
] as const

export const WITCH_CANTRIP_GRANTS = [
  { level: 0, count: 2 },
  { level: 0, count: 1, unlocksAtClassLevel: 4 },
  { level: 0, count: 1, unlocksAtClassLevel: 10 },
] as const

export const WITCH_GRAND_HEX_BY_LEVEL = [
  { level: 11, count: 1 },
  { level: 13, count: 2 },
  { level: 15, count: 3 },
  { level: 17, count: 4 },
] as const

type MechanicRow = Record<string, unknown>

function asRecord(value: unknown): MechanicRow | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as MechanicRow) : null
}

function remapGrandHexResourceKey(key: string): string {
  if (/^grand_hexes(?:_known)?$/i.test(key)) return "grand_hexes"
  return key
}

function looksCumulativeCantripGrants(mechanics: unknown[]): boolean {
  const counts: number[] = []
  for (const mech of mechanics) {
    const m = asRecord(mech)
    if (!m || m.kind !== "spells_known") continue
    const grants = Array.isArray(m.spellChoiceGrants) ? m.spellChoiceGrants : []
    for (const g of grants) {
      const row = asRecord(g)
      if (!row || row.level !== 0) continue
      if (typeof row.count === "number") counts.push(row.count)
    }
  }
  // Multiple cantrip grants with increasing absolute counts (2,3,4…) instead of +1 increments.
  const sorted = [...counts].sort((a, b) => a - b)
  return sorted.length >= 3 && sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4
}

function normalizeHexesMechanics(mechanics: unknown[]): unknown[] {
  const nonHex = mechanics.filter((mech) => {
    const m = asRecord(mech)
    if (!m || m.kind !== "spells_known") return true
    const label = String(m.spellChoiceLabel ?? "")
    return !/^hexes?$/i.test(label)
  })
  return [
    ...nonHex,
    {
      kind: "spells_known",
      spellChoiceGrants: [...WITCH_HEX_GRANTS],
      spellChoiceLabel: "Hexes",
      sourcePhrase:
        "You know Hexes of your choice from the Witch spell list (Hex:… cantrips); count scales on the Hexes column.",
      confidence: "high",
    },
  ]
}

function normalizeSpellcastingMechanics(mechanics: unknown[]): unknown[] {
  const ability = mechanics.find((mech) => asRecord(mech)?.kind === "spellcasting_ability")
  const prepared = mechanics.find((mech) => {
    const m = asRecord(mech)
    if (!m || m.kind !== "spells_known") return false
    const grants = Array.isArray(m.spellChoiceGrants) ? m.spellChoiceGrants : []
    return grants.some((g) => asRecord(g)?.level === 1)
  })
  const next: unknown[] = []
  if (ability) next.push(ability)
  next.push({
    kind: "spells_known",
    spellChoiceGrants: [...WITCH_CANTRIP_GRANTS],
    spellChoiceLabel: "Witch cantrips",
    sourcePhrase: "You know cantrips from the Witch spell list (not Hexes).",
    confidence: "high",
  })
  if (prepared) next.push(prepared)
  else {
    next.push({
      kind: "spells_known",
      spellChoiceGrants: [{ level: 1, count: 2 }],
      spellChoiceLabel: "Witch spell list",
      sourcePhrase: "To start, choose two level 1 spells from the Witch spell list.",
      confidence: "medium",
    })
  }
  return next
}

/**
 * Sanitize Mage Hand Press Witch imports:
 * - CHA full prepared caster on classes[].spellcasting
 * - grand_hexes_known → grand_hexes
 * - Strip Abominable Familiar auto-grant from Grand Hex feature mechanics
 * - Collapse cumulative Hex/cantrip spells_known into incremental grants
 * - Grand Hex choices.resourceKey = grand_hexes
 */
export function sanitizeWitchImportContent(content: ImportContent): ImportContent {
  const hasWitch = (content.classes ?? []).some((cls) => /^witch$/i.test(cls.name ?? ""))
  if (!hasWitch) return content

  let next: ImportContent = { ...content }

  if (next.class_resources?.length) {
    next = {
      ...next,
      class_resources: next.class_resources.map((row) => {
        const key = remapGrandHexResourceKey(row.resource_key ?? "")
        if (key === row.resource_key) return row
        return {
          ...row,
          resource_key: key,
          name: /grand/i.test(row.name ?? "") ? "Grand Hexes" : row.name,
        }
      }),
    }
  }

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/^witch$/i.test(cls.name ?? "")) return cls
        const existingSpellcasting = (cls.spellcasting ?? {}) as {
          ability?: string
          caster_progression?: "full" | "half" | "third" | "pact"
          prepared?: boolean
        }
        const spellcasting = {
          ...existingSpellcasting,
          ability: existingSpellcasting.ability ?? "Charisma",
          caster_progression: existingSpellcasting.caster_progression ?? ("full" as const),
          prepared: existingSpellcasting.prepared ?? true,
        }
        const features = (cls.features ?? []).map((feat) => {
          if (/^hexes$/i.test(feat.name ?? "")) {
            const mechanics = Array.isArray(feat.mechanics) ? feat.mechanics : []
            return {
              ...feat,
              mechanics: normalizeHexesMechanics(mechanics),
            }
          }
          if (/^spellcasting$/i.test(feat.name ?? "")) {
            const mechanics = Array.isArray(feat.mechanics) ? feat.mechanics : []
            return {
              ...feat,
              mechanics: looksCumulativeCantripGrants(mechanics)
                ? normalizeSpellcastingMechanics(mechanics)
                : mechanics,
            }
          }
          if (/^grand hex$/i.test(feat.name ?? "")) {
            const mechanics = Array.isArray(feat.mechanics)
              ? feat.mechanics.filter((mech) => {
                  const m = asRecord(mech)
                  if (!m || m.kind !== "grant_creature") return true
                  const names = Array.isArray(m.creatureNames) ? m.creatureNames.map(String) : []
                  return !names.some((n) => /abominable familiar/i.test(n))
                })
              : []
            const prior = feat.choices
            const restChoices = prior ? { ...prior } : {}
            return {
              ...feat,
              isChoice: true,
              mechanics,
              choices: {
                category: "Grand Hex",
                count: 1,
                options: prior?.options ?? [],
                swappableOnRest: false,
                ...restChoices,
                resourceKey: "grand_hexes",
                choiceCountByLevel: prior && "choiceCountByLevel" in prior && Array.isArray((prior as { choiceCountByLevel?: unknown }).choiceCountByLevel)
                  ? (prior as { choiceCountByLevel: { level: number; count: number }[] }).choiceCountByLevel
                  : [...WITCH_GRAND_HEX_BY_LEVEL],
              },
            }
          }
          return feat
        })
        return { ...cls, spellcasting, features } as typeof cls
      }),
    }
  }

  return next
}

export const WITCH_PRESETS: EnrichmentPreset[] = [
  {
    id: "witch.class.spellcasting",
    pack: "witch",
    target: "class_feature",
    match: { className: /^witch$/i, name: /^spellcasting$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Witch is a Charisma full prepared caster (classes[].spellcasting). Hexes are separate Hex:… cantrips and do not count against cantrips known. Prepared Spells scale from the class table — do not invent a second slot progression.",
      },
    ],
  },
  {
    id: "witch.class.hexes",
    pack: "witch",
    target: "class_feature",
    match: { className: /^witch$/i, name: /^hexes$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Hexes are Witch cantrips named Hex:… chosen via spells_known + class_resources.hexes_known (special cap). Not custom_abilities / class_knacks. Prefer Hex: Misfortune and Hex: Ruin at level 1.",
      },
    ],
  },
  {
    id: "witch.class.grand_hex",
    pack: "witch",
    target: "class_feature",
    match: { className: /^witch$/i, name: /^grand hex$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Grand Hex",
          count: 1,
          options: [],
          optionsSource: undefined,
          resourceKey: "grand_hexes",
          choiceCountByLevel: [...WITCH_GRAND_HEX_BY_LEVEL],
          swappableOnRest: false,
        },
      },
      {
        op: "appendDescription",
        text: "Grand Hex options stay on this feature (isChoice). Resource key is grand_hexes (not grand_hexes_known). Abominable Familiar is an option that grants the companion — do not auto-grant it on the feature.",
      },
    ],
  },
  {
    id: "witch.class.cackle",
    pack: "witch",
    target: "class_feature",
    match: { className: /^witch$/i, name: /^cackle$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Extends one Hex duration by 1 round (target in range) — play-time; requires a Verbal component.",
      },
    ],
  },
  {
    id: "witch.class.hexmaster",
    pack: "witch",
    target: "class_feature",
    match: { className: /^witch$/i, name: /^hexmaster$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Force one Hex save to fail (CHA mod uses / long rest; restore 1 use by expending a spell slot). Keep usesAbility CHA phrasing.",
      },
    ],
  },
  {
    id: "witch.class.vengeful_curse",
    pack: "witch",
    target: "class_feature",
    match: { className: /^witch$/i, name: /^vengeful curse$/i },
    operations: [
      { op: "setActivation", activation: { reaction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "long_rest" }],
        },
      },
    ],
  },
  {
    id: "witch.class.familiar",
    pack: "witch",
    target: "class_feature",
    match: { className: /^witch$/i, name: /^familiar$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Find Familiar always prepared (cast in 10 minutes without slot/components). Special forms use creatures[] / SRD familiar options via grant_creature choice list.",
      },
    ],
  },
  {
    id: "witch.subclass.remedy",
    pack: "witch",
    target: "subclass_feature",
    match: { subclassClassName: /^witch$/i, name: /^remedy$/i },
    operations: [
      { op: "setActivation", activation: { action: true, bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Remedy Dice pool is class_resources.remedy_dice (multiply_level, long rest) — expend dice to heal; CHA mod caps dice spent per use.",
      },
    ],
  },
]
