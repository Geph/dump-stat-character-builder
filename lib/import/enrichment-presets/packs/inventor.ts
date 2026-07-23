import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"

/** Upgrades column: 1 at 3rd → 9 at 19th. */
export const INVENTOR_UPGRADES_BY_LEVEL = [
  { level: 3, count: 1 },
  { level: 5, count: 2 },
  { level: 7, count: 3 },
  { level: 9, count: 4 },
  { level: 11, count: 5 },
  { level: 13, count: 6 },
  { level: 15, count: 7 },
  { level: 17, count: 8 },
  { level: 19, count: 9 },
] as const

/** Runesmith: runes marked at once — 2 at 1st → 5 at 14th. */
export const INVENTOR_RUNES_MARKED_BY_LEVEL = [
  { level: 1, count: 2 },
  { level: 3, count: 3 },
  { level: 5, count: 4 },
  { level: 14, count: 5 },
] as const

/**
 * Spells Known (KibblesTasty Inventor): 3 at 2nd, +1 on odd levels through 19 (cap 12).
 * Incremental grants — not cumulative totals.
 */
export const INVENTOR_SPELL_GRANTS = [
  { level: 1, count: 3 },
  ...[3, 5, 7, 9, 11, 13, 15, 17, 19].map((unlocksAtClassLevel) => ({
    level: 1,
    count: 1,
    unlocksAtClassLevel,
  })),
] as const

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

export function isKibblesInventor(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => /^inventor$/i.test(cls.name ?? ""))
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
      byName.set(key, { ...sc, class_name: sc.class_name || "Inventor" })
    }
  }

  const { subclasses: _drop, ...restCls } = cls
  return {
    ...content,
    classes: [{ ...restCls }, ...classes.slice(1)] as ImportContent["classes"],
    subclasses: [...byName.values()],
  }
}

function looksCumulativeSpellGrants(mechanics: unknown[]): boolean {
  const counts: number[] = []
  for (const mech of mechanics) {
    const m = asRecord(mech)
    if (!m || m.kind !== "spells_known") continue
    const label = String(m.spellChoiceLabel ?? "")
    if (label && !/spell/i.test(label)) continue
    for (const g of Array.isArray(m.spellChoiceGrants) ? m.spellChoiceGrants : []) {
      const row = asRecord(g)
      if (row && typeof row.count === "number" && row.level !== 0) counts.push(row.count)
    }
  }
  const sorted = [...counts].sort((a, b) => a - b)
  // Cumulative absolute totals look like 3,4,5… without unlocksAtClassLevel deltas of 1.
  return sorted.length >= 3 && sorted[0] === 3 && sorted[1] === 4 && sorted[2] === 5
}

function normalizeSpellcastingMechanics(mechanics: unknown[]): unknown[] {
  const ability = mechanics.find((mech) => asRecord(mech)?.kind === "spellcasting_ability")
  const nonSpellKnown = mechanics.filter((mech) => {
    const m = asRecord(mech)
    if (!m) return true
    if (m.kind === "spellcasting_ability") return false
    if (m.kind !== "spells_known") return true
    const label = String(m.spellChoiceLabel ?? "")
    return !/spell list|spells known|inventor spell/i.test(label) && !Array.isArray(m.spellChoiceGrants)
  })
  return [
    ...(ability
      ? [ability]
      : [
          {
            kind: "spellcasting_ability",
            spellcastingAbility: "intelligence",
            sourcePhrase: "Intelligence is your spellcasting ability for your Inventor spells.",
            confidence: "high",
          },
        ]),
    ...nonSpellKnown,
    {
      kind: "spells_known",
      spellChoiceGrants: [...INVENTOR_SPELL_GRANTS],
      spellChoiceLabel: "Inventor spells",
      sourcePhrase: "You know Inventor spells of your choice as shown in the Spells Known column.",
      confidence: "high",
    },
  ]
}

function ensureUpgradesResource(content: ImportContent): ImportContent {
  const prior = (content.class_resources ?? []).find((r) => r.resource_key === "upgrades")
  const priorUses = asRecord(prior?.uses) ?? {}
  const table =
    Array.isArray(priorUses.atLevelTable) && priorUses.atLevelTable.length
      ? priorUses.atLevelTable
      : [...INVENTOR_UPGRADES_BY_LEVEL]
  const without = (content.class_resources ?? []).filter((r) => r.resource_key !== "upgrades")
  return {
    ...content,
    class_resources: [
      ...without,
      {
        class_name: "Inventor",
        resource_key: "upgrades",
        name: prior?.name || "Upgrades",
        description:
          prior?.description ||
          "Number of specialization upgrades known. A choice count from your subclass upgrade list (plus generic options), not a spendable pool.",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: table as { level: number; count: number }[],
        },
      },
    ],
  }
}

function hasRunesmith(content: ImportContent): boolean {
  return (content.subclasses ?? []).some((sc) => /^runesmith$/i.test(sc.name ?? ""))
}

function ensureRunesMarkedResource(content: ImportContent): ImportContent {
  if (!hasRunesmith(content)) return content
  const prior = (content.class_resources ?? []).find((r) => r.resource_key === "runes_marked")
  const priorUses = asRecord(prior?.uses) ?? {}
  const table =
    Array.isArray(priorUses.atLevelTable) && priorUses.atLevelTable.length
      ? priorUses.atLevelTable
      : [...INVENTOR_RUNES_MARKED_BY_LEVEL]
  const without = (content.class_resources ?? []).filter((r) => r.resource_key !== "runes_marked")
  return {
    ...content,
    class_resources: [
      ...without,
      {
        class_name: "Inventor",
        subclass_name: "Runesmith",
        resource_key: "runes_marked",
        name: prior?.name || "Runes Marked",
        description:
          prior?.description ||
          "Special cap on how many runes a Runesmith can have marked at once. Not a spendable pool — remade during a long rest.",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: table as { level: number; count: number }[],
        },
      },
    ],
  }
}

function foldSpellNotesIntoDescription(content: ImportContent): ImportContent {
  if (!content.spells?.length) return content
  return {
    ...content,
    spells: content.spells.map((spell) => {
      const row = spell as typeof spell & { note?: string | null }
      const note = typeof row.note === "string" ? row.note.trim() : ""
      if (!note) return spell
      const { note: _drop, ...rest } = row
      const noteHtml = `<p><em>Import note: ${note}</em></p>`
      const desc = rest.description
      if (desc && /Import note:/i.test(desc)) return rest
      return {
        ...rest,
        description: desc ? `${noteHtml}${desc}` : noteHtml,
      }
    }),
  }
}

function normalizeTruncationMarkers(content: ImportContent): ImportContent {
  const rewrite = (text: string | null | undefined): string | null | undefined => {
    if (!text) return text
    if (/\[Source ends mid-entry\]/i.test(text)) return text
    if (!/SOURCE TEXT TRUNCATED|cuts off mid-sentence|not included in this extraction pass/i.test(text)) {
      return text
    }
    // Prefer keeping the leading supplied sentence(s) before a bracketed note.
    const stripped = text.replace(/\s*\[[^\]]*(?:TRUNCATED|cuts off|not included)[^\]]*\]\s*/gi, " ").trim()
    if (!stripped) return "[Source ends mid-entry]"
    if (/\[Source ends mid-entry\]/i.test(stripped)) return stripped
    return `${stripped} [Source ends mid-entry]`
  }

  const mapFeatures = <T extends { description?: string | null }>(features: T[]): T[] =>
    features.map((feat) => ({ ...feat, description: rewrite(feat.description) ?? feat.description }))

  return {
    ...content,
    classes: content.classes?.map((cls) => ({
      ...cls,
      features: mapFeatures(cls.features ?? []),
    })),
    subclasses: content.subclasses?.map((sc) => ({
      ...sc,
      features: mapFeatures(sc.features ?? []),
    })),
  }
}

function ensureJusticarSavantChoice(content: ImportContent): ImportContent {
  if (!content.subclasses?.length) return content
  return {
    ...content,
    subclasses: content.subclasses.map((sc) => {
      if (!/^relicsmith$/i.test(sc.name ?? "")) return sc
      const ordained = (sc.features ?? []).find((f) => /^ordained path$/i.test(f.name ?? ""))
      const options = ordained?.choices?.options
      if (!options?.length) return sc
      const features = (sc.features ?? []).map((feat) => {
        if (!/^justicar savant$/i.test(feat.name ?? "")) return feat
        if (feat.choices?.options?.length) return feat
        return {
          ...feat,
          isChoice: true,
          choices: {
            category: "Ordained Path",
            count: 1,
            options,
          },
        }
      })
      return { ...sc, features }
    }),
  }
}

/**
 * Sanitize KibblesTasty Inventor imports:
 * - Upgrades = special choice count (never a spendable at_level pool)
 * - Specialization Upgrade: class_upgrades + resourceKey upgrades; level-up swap only
 * - INT half caster with Spells Known (prepared: false) + incremental spellChoiceGrants
 * - Inventor Specialization unlock blurb (no stub picker); specializations in subclasses[]
 * - Upgrade leaves keep ability_role upgrade; generic Shield/Tool stay source_type class
 * - Strip "Inventor Specialization feature" placeholder base-class rows
 * - Runesmith: subclass-scoped runes_marked special cap; Twin Flares truncation stays marked
 * - Relicsmith Justicar Savant: additional Ordained Path pick
 * - Fold non-schema spell note fields into description so stub provenance survives import
 */
export function sanitizeInventorImportContent(content: ImportContent): ImportContent {
  if (!isKibblesInventor(content)) return content

  let next = hoistNestedSubclasses(content)
  next = ensureUpgradesResource(next)
  next = ensureRunesMarkedResource(next)
  next = foldSpellNotesIntoDescription(next)
  next = normalizeTruncationMarkers(next)
  next = ensureJusticarSavantChoice(next)

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/^inventor$/i.test(cls.name ?? "")) return cls
        const existing = (cls.spellcasting ?? {}) as {
          ability?: string
          caster_progression?: "full" | "half" | "third" | "pact"
          prepared?: boolean
        }
        const spellcasting = {
          ...existing,
          ability: existing.ability ?? "Intelligence",
          caster_progression: existing.caster_progression ?? ("half" as const),
          prepared: existing.prepared ?? false,
        }
        const features = (cls.features ?? [])
          .filter((feat) => !/^inventor specialization feature$/i.test(feat.name ?? ""))
          .map((feat) => {
            if (/^inventor specialization$/i.test(feat.name ?? "")) {
              const { isChoice: _i, choices: _c, ...rest } = feat
              return rest
            }
            if (/^spellcasting$/i.test(feat.name ?? "")) {
              const mechanics = Array.isArray(feat.mechanics) ? feat.mechanics : []
              const needsNormalize =
                mechanics.length === 0 ||
                looksCumulativeSpellGrants(mechanics) ||
                !mechanics.some((m) => asRecord(m)?.kind === "spells_known")
              return {
                ...feat,
                mechanics: needsNormalize ? normalizeSpellcastingMechanics(mechanics) : mechanics,
              }
            }
            if (isUpgradeSelectionFeature(feat.name ?? "", feat.description ?? "")) {
              const prior = feat.choices
              const priorCount =
                prior &&
                "choiceCountByLevel" in prior &&
                Array.isArray((prior as { choiceCountByLevel?: unknown }).choiceCountByLevel)
                  ? (prior as { choiceCountByLevel: { level: number; count: number }[] })
                      .choiceCountByLevel
                  : null
              return {
                ...feat,
                isChoice: true,
                choices: {
                  category: "Upgrade",
                  count: prior?.count ?? 1,
                  options: prior?.options ?? [],
                  resourceKey: "upgrades",
                  optionsSource: "class_upgrades" as const,
                  swappableOnRest: false,
                  choiceCountByLevel: priorCount?.length
                    ? priorCount
                    : [...INVENTOR_UPGRADES_BY_LEVEL],
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
          if (ability.ability_role != null && ability.ability_role !== "upgrade") return ability
          const isGeneric =
            /^shield proficiency$/i.test(ability.name ?? "") ||
            /^tool proficiency$/i.test(ability.name ?? "")
          if (isGeneric) {
            return {
              ...ability,
              ability_role: "upgrade",
              source_type: "class",
              source_name: "Inventor",
            }
          }
          return {
            ...ability,
            ability_role: "upgrade",
            source_type: ability.source_type ?? "subclass",
            source_name: ability.source_name ?? null,
          }
        }),
      },
    }
  }

  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((sc) => ({
        ...sc,
        class_name: sc.class_name || "Inventor",
      })),
    }
  }

  // Golemsmith: ensure grant_creature names match creatures[] when present
  if (next.subclasses?.length && next.creatures?.length) {
    const golemNames = (next.creatures ?? [])
      .filter((c) => /golem/i.test(c.name ?? ""))
      .map((c) => c.name!)
      .filter(Boolean)
    if (golemNames.length) {
      next = {
        ...next,
        subclasses: next.subclasses.map((sc) => {
          if (!/^golemsmith$/i.test(sc.name ?? "")) return sc
          const features = (sc.features ?? []).map((feat) => {
            if (!/^mechanical golem$/i.test(feat.name ?? "")) return feat
            const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
            const without = mechanics.filter((m) => asRecord(m)?.kind !== "grant_creature")
            without.unshift({
              kind: "grant_creature",
              creatureNames: golemNames,
              creatureChoiceOptions: golemNames,
              sourcePhrase: "you forge a mechanical golem",
              confidence: "high",
            })
            return { ...feat, mechanics: without }
          })
          return { ...sc, features }
        }),
      }
    }
  }

  return next
}

function isUpgradeSelectionFeature(name: string, description: string): boolean {
  if (/^specialization upgrade$/i.test(name)) return true
  if (/upgrade/i.test(name)) return true
  return /\b(?:select|choose)\s+an?\s+upgrade\b/i.test(description)
}

export const INVENTOR_PRESETS: EnrichmentPreset[] = [
  {
    id: "inventor.class.specialization",
    pack: "inventor",
    target: "class_feature",
    match: { className: /inventor/i, name: /^inventor specialization$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Inventor Specialization is the subclass unlock. Put specializations in top-level subclasses[] — do not nest under classes[0].subclasses and do not emit stub isChoice options naming each specialization. Do not emit \"Inventor Specialization feature\" placeholder rows at 3rd/5th/14th — those features live on the subclass.",
      },
    ],
  },
  {
    id: "inventor.class.specialization_upgrade",
    pack: "inventor",
    target: "class_feature",
    match: { className: /inventor/i, name: /^specialization upgrade$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Specialization Upgrade uses optionsSource class_upgrades + class_resources.upgrades (special choice count). Each upgrade is import_proposals.custom_abilities with ability_role upgrade; section headers are not ability rows. Generic Shield Proficiency / Tool Proficiency use source_type class / Inventor. Swap on level-up only (swappableOnRest false).",
      },
    ],
  },
  {
    id: "inventor.class.spellcasting",
    pack: "inventor",
    target: "class_feature",
    match: { className: /inventor/i, name: /^spellcasting$/i },
    operations: [
      {
        op: "appendDescription",
        text: "KibblesTasty Inventor is an Intelligence half caster with Spells Known (not prepared). Spells Known scales 3 at 2nd → 12 at 19th via incremental spellChoiceGrants. Distinct from Artificer prepared casting.",
      },
    ],
  },
  {
    id: "inventor.subclass.runesmith_marks",
    pack: "inventor",
    target: "subclass_feature",
    match: { className: /inventor/i, name: /^runic marks$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Runes Marked is class_resources.runes_marked (special + subclass_name Runesmith; 2→5). Not a spendable pool. Base runes live on Runic Effects; additional runes come from upgrades.",
      },
    ],
  },
]
