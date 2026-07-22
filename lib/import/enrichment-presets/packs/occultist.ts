import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"

/** Cantrips Known column → incremental picks (3 → 4 at L4 → 5 at L10). */
export const OCCULTIST_CANTRIP_GRANTS = [
  { level: 0, count: 3 },
  { level: 0, count: 1, unlocksAtClassLevel: 4 },
  { level: 0, count: 1, unlocksAtClassLevel: 10 },
] as const

/** Spells Known column: 3 at L1, +1 each level through 18 (cap 20). */
export const OCCULTIST_SPELL_GRANTS = [
  { level: 1, count: 3 },
  ...Array.from({ length: 17 }, (_, i) => ({
    level: 1,
    count: 1,
    unlocksAtClassLevel: i + 2,
  })),
] as const

export const OCCULTIST_RITES_BY_LEVEL = [
  { level: 2, count: 2 },
  { level: 5, count: 3 },
  { level: 7, count: 4 },
  { level: 9, count: 5 },
  { level: 12, count: 6 },
  { level: 15, count: 7 },
  { level: 18, count: 8 },
] as const

const TRADITION_NAMES = [
  "Witch",
  "Hedge Mage",
  "Oracle",
  "Shaman",
  "Spiritualist",
  "Voidwatcher",
] as const

const WITCH_RITE_NAMES = new Set(
  [
    "Animate Broom",
    "Companion Coven",
    "Curse Specialist",
    "Familiar Swap",
    "Form of the Familiar",
    "Riding Familiar",
    "Skulking Familiar",
    "Witch's Brew",
    "Witch's Claws",
    "Witch's Hat",
    "Wicked Curse",
    "Divine Presence",
  ].map((n) => n.toLowerCase()),
)

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
  return sorted.length >= 2 && sorted[0] === 3 && sorted[1] === 4
}

function normalizeSpellcastingMechanics(mechanics: unknown[]): unknown[] {
  const ability = mechanics.find((mech) => asRecord(mech)?.kind === "spellcasting_ability")
  const nonSpellKnown = mechanics.filter((mech) => {
    const m = asRecord(mech)
    if (!m) return true
    if (m.kind === "spellcasting_ability") return false
    if (m.kind !== "spells_known") return true
    const label = String(m.spellChoiceLabel ?? "")
    return !/cantrip|spell list|spells known|occultist spell/i.test(label) && !Array.isArray(m.spellChoiceGrants)
  })
  return [
    ...(ability
      ? [ability]
      : [
          {
            kind: "spellcasting_ability",
            spellcastingAbility: "wisdom",
            sourcePhrase: "Wisdom is your spellcasting ability for your Occultist spells.",
            confidence: "high",
          },
        ]),
    ...nonSpellKnown,
    {
      kind: "spells_known",
      spellChoiceGrants: [...OCCULTIST_CANTRIP_GRANTS],
      spellChoiceLabel: "Occultist cantrips",
      sourcePhrase: "You know Occultist cantrips of your choice as shown in the Cantrips Known column.",
      confidence: "high",
    },
    {
      kind: "spells_known",
      spellChoiceGrants: [...OCCULTIST_SPELL_GRANTS],
      spellChoiceLabel: "Occultist spells",
      sourcePhrase: "You know Occultist spells of your choice as shown in the Spells Known column.",
      confidence: "high",
    },
  ]
}

function inferTraditionSource(name: string, prerequisite: string | null | undefined): string | null {
  const blob = `${name} ${prerequisite ?? ""}`
  for (const tradition of TRADITION_NAMES) {
    if (new RegExp(`\\b${tradition.replace(/ /g, "\\s+")}\\b`, "i").test(blob)) {
      return tradition
    }
  }
  if (/^revelation of |^oracle'?s |^halo of mystery|^twin revelation/i.test(name)) return "Oracle"
  if (/^mystery of /i.test(prerequisite ?? "")) return "Oracle"
  if (WITCH_RITE_NAMES.has(name.toLowerCase())) return "Witch"
  if (/\b(white|black|green)\s+coven\b/i.test(prerequisite ?? "")) return "Witch"
  return null
}

function hoistNestedSubclasses(content: ImportContent): ImportContent {
  const classes = content.classes ?? []
  if (!classes.length) return content
  const cls = classes[0] as ImportContent["classes"] extends (infer C)[] | undefined
    ? C & { subclasses?: ImportContent["subclasses"] }
    : never
  const nested = Array.isArray(cls.subclasses) ? cls.subclasses : []
  if (!nested.length) return content

  const top = content.subclasses ?? []
  const byName = new Map(top.map((sc) => [String(sc.name ?? "").toLowerCase(), sc]))
  for (const sc of nested) {
    const key = String(sc.name ?? "").toLowerCase()
    if (!key) continue
    const prior = byName.get(key)
    if (!prior || (sc.features?.length ?? 0) > (prior.features?.length ?? 0)) {
      byName.set(key, { ...sc, class_name: sc.class_name || "Occultist" })
    }
  }

  const { subclasses: _drop, ...restCls } = cls
  return {
    ...content,
    classes: [{ ...restCls }, ...classes.slice(1)] as ImportContent["classes"],
    subclasses: [...byName.values()],
  }
}

/**
 * Sanitize KibblesTasty Occultist imports:
 * - Hoist nested classes[0].subclasses → top-level subclasses[]
 * - WIS full known caster (not prepared; not Investigator subclass Occultist pact magic)
 * - Incremental cantrip / spell-known grants
 * - Occult Rites: class_knacks + occult_rites_known; swappableOnRest false (level-up swap only)
 * - Tradition-gated rites → source_type subclass + tradition source_name
 */
export function sanitizeOccultistImportContent(content: ImportContent): ImportContent {
  const hasOccultist = (content.classes ?? []).some((cls) => /^occultist$/i.test(cls.name ?? ""))
  if (!hasOccultist) return content

  let next = hoistNestedSubclasses(content)

  if (next.class_resources?.length) {
    next = {
      ...next,
      class_resources: next.class_resources.map((row) => {
        if (row.resource_key !== "occult_rites_known") return row
        const uses = row.uses ?? { type: "special" as const }
        return {
          ...row,
          name: row.name || "Occult Rites Known",
          uses: {
            ...uses,
            type: "special",
            atLevelMode: uses.atLevelMode ?? "tier",
            atLevelTable:
              Array.isArray(uses.atLevelTable) && uses.atLevelTable.length
                ? uses.atLevelTable
                : [...OCCULTIST_RITES_BY_LEVEL],
          },
        }
      }),
    }
  } else {
    next = {
      ...next,
      class_resources: [
        {
          class_name: "Occultist",
          resource_key: "occult_rites_known",
          name: "Occult Rites Known",
          description:
            "The number of Occult Rites an Occultist knows. A static choice count, not a spendable pool.",
          uses: {
            type: "special",
            atLevelMode: "tier",
            atLevelTable: [...OCCULTIST_RITES_BY_LEVEL],
          },
        },
      ],
    }
  }

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/^occultist$/i.test(cls.name ?? "")) return cls
        const existing = (cls.spellcasting ?? {}) as {
          ability?: string
          caster_progression?: "full" | "half" | "third" | "pact"
          prepared?: boolean
        }
        const spellcasting = {
          ...existing,
          ability: existing.ability ?? "Wisdom",
          caster_progression: existing.caster_progression ?? ("full" as const),
          prepared: existing.prepared ?? false,
        }
        const features = (cls.features ?? []).map((feat) => {
          if (/^spellcasting$/i.test(feat.name ?? "")) {
            const mechanics = Array.isArray(feat.mechanics) ? feat.mechanics : []
            const needsNormalize =
              mechanics.length === 0 ||
              looksCumulativeCantripGrants(mechanics) ||
              !mechanics.some((m) => asRecord(m)?.kind === "spells_known")
            return {
              ...feat,
              mechanics: needsNormalize ? normalizeSpellcastingMechanics(mechanics) : mechanics,
            }
          }
          if (/^occult rites$/i.test(feat.name ?? "")) {
            const prior = feat.choices
            return {
              ...feat,
              isChoice: true,
              choices: {
                category: "Occult Rite",
                count: prior?.count ?? 2,
                options: prior?.options ?? [],
                resourceKey: "occult_rites_known",
                optionsSource: "class_knacks" as const,
                swappableOnRest: false,
                choiceCountByLevel:
                  prior &&
                  "choiceCountByLevel" in prior &&
                  Array.isArray((prior as { choiceCountByLevel?: unknown }).choiceCountByLevel)
                    ? (prior as { choiceCountByLevel: { level: number; count: number }[] })
                        .choiceCountByLevel
                    : [...OCCULTIST_RITES_BY_LEVEL],
              },
            }
          }
          return feat
        })
        return { ...cls, spellcasting, features } as typeof cls
      }),
    }
  }

  if (next.import_proposals?.custom_abilities?.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        custom_abilities: next.import_proposals.custom_abilities.map((ability) => {
          if (ability.ability_role !== "knack" && ability.ability_role != null) return ability
          const tradition = inferTraditionSource(ability.name ?? "", ability.prerequisite)
          if (!tradition) {
            return {
              ...ability,
              ability_role: ability.ability_role ?? "knack",
              source_type: ability.source_type ?? "class",
              source_name: ability.source_name || "Occultist",
            }
          }
          return {
            ...ability,
            ability_role: ability.ability_role ?? "knack",
            source_type: "subclass",
            source_name: tradition,
          }
        }),
      },
    }
  }

  // Fix Find Familiar auto-grant shape on Witch's Magic when present.
  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((sc) => {
        if (!/^witch$/i.test(sc.name ?? "") || sc.class_name !== "Occultist") return sc
        const features = (sc.features ?? []).map((feat) => {
          if (!/^witch'?s magic$/i.test(feat.name ?? "")) return feat
          const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
          const withoutFamiliarChoice = mechanics.filter((mech) => {
            const m = asRecord(mech)
            if (!m || m.kind !== "spells_known") return true
            const grants = Array.isArray(m.spellChoiceGrants) ? m.spellChoiceGrants : []
            return !grants.some((g) => {
              const row = asRecord(g)
              const names = Array.isArray(row?.spellNames) ? row!.spellNames.map(String) : []
              return names.some((n) => /find familiar/i.test(n))
            })
          })
          const hasFamiliar = withoutFamiliarChoice.some((mech) => {
            const m = asRecord(mech)
            if (!m || m.kind !== "spells_known") return false
            const names = Array.isArray(m.spellNames) ? m.spellNames.map(String) : []
            return names.some((n) => /find familiar/i.test(n))
          })
          if (!hasFamiliar) {
            withoutFamiliarChoice.unshift({
              kind: "spells_known",
              spellNames: ["Find Familiar"],
              sourcePhrase: "you learn the spell find familiar",
              confidence: "high",
            })
          }
          return { ...feat, mechanics: withoutFamiliarChoice }
        })
        return { ...sc, features }
      }),
    }
  }

  return next
}

export const OCCULTIST_PRESETS: EnrichmentPreset[] = [
  {
    id: "occultist.class.spellcasting",
    pack: "occultist",
    target: "class_feature",
    match: { className: /occultist/i, name: /^spellcasting$/i },
    operations: [
      {
        op: "appendDescription",
        text: "KibblesTasty Occultist is a Wisdom full caster with Spells Known (not prepared). Cantrips Known and Spells Known scale from the Occultist table via incremental spellChoiceGrants. Distinct from Mage Hand Press Witch and from Investigator's Occultist archetype (pact magic).",
      },
    ],
  },
  {
    id: "occultist.class.occult_rites",
    pack: "occultist",
    target: "class_feature",
    match: { className: /occultist/i, name: /^occult rites$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Occult Rites use optionsSource class_knacks + class_resources.occult_rites_known (special). Swap one rite when you gain an Occultist level — not on a rest. Tradition-specific rites stay ability_role knack with source_type subclass / tradition name (Witch, Hedge Mage, Oracle, Shaman, Spiritualist, Voidwatcher); prerequisites still gate level/coven/mystery.",
      },
    ],
  },
  {
    id: "occultist.class.occult_tradition",
    pack: "occultist",
    target: "class_feature",
    match: { className: /occultist/i, name: /^occult tradition$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Occult Tradition is the subclass unlock (Witch, Hedge Mage, Oracle, Shaman, Spiritualist, Voidwatcher). Put traditions in top-level subclasses[] — do not nest under classes[0].subclasses and do not stub isChoice options naming each tradition.",
      },
    ],
  },
]
