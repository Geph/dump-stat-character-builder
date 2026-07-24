import type { ImportContent } from "@/lib/import/content-schema"
import { buildQuarryClassResource } from "@/lib/import/enrichment-presets/builders"

/** LaserLlama Alternate Ranger Knacks Known column. */
export const ALTERNATE_RANGER_KNACKS_KNOWN_BY_LEVEL = [
  { level: 1, count: 1 },
  { level: 2, count: 2 },
  { level: 3, count: 3 },
  { level: 6, count: 4 },
  { level: 9, count: 5 },
  { level: 12, count: 6 },
  { level: 14, count: 7 },
  { level: 16, count: 8 },
  { level: 19, count: 9 },
  { level: 20, count: 10 },
] as const

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

export function isAlternateRangerImport(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => {
    const name = cls.name ?? ""
    if (/alternate\s+ranger/i.test(name)) return true
    // LaserLlama paste often titles the class "Ranger" but ships Quarry Die + Knacks.
    if (!/^ranger$/i.test(name)) return false
    const keys = new Set((content.class_resources ?? []).map((r) => r.resource_key))
    return keys.has("quarry_die") && keys.has("knacks_known")
  })
}

function isLaserLlamaRangerKnackRow(ability: {
  ability_role?: string | null
  definition?: string | null
  source_name?: string | null
}): boolean {
  if (/^(alternate\s+)?ranger$/i.test(ability.source_name ?? "")) return true
  if (ability.ability_role === "knack" && /ranger\s+knack/i.test(ability.definition ?? "")) {
    return true
  }
  return false
}

/**
 * Promote LaserLlama Ranger knack library rows onto Alternate Ranger
 * (never leave source_name "Ranger" — that attaches to SRD Ranger).
 */
export function sanitizeLaserLlamaRangerKnacksImportContent(content: ImportContent): ImportContent {
  const proposals = content.import_proposals?.custom_abilities
  if (!proposals?.length) return content

  const next = proposals.map((ability) => {
    if (!isLaserLlamaRangerKnackRow(ability)) return ability
    return {
      ...ability,
      ability_role: "knack" as const,
      source_type: ability.source_type ?? ("class" as const),
      source_name: "Alternate Ranger",
      eligible_classes: (() => {
        const eligible = [...(ability.eligible_classes ?? [])]
        if (!eligible.some((name) => /alternate\s+ranger/i.test(name))) {
          eligible.push("Alternate Ranger")
        }
        return eligible
      })(),
    }
  })

  return {
    ...content,
    import_proposals: {
      ...content.import_proposals,
      custom_abilities: next,
    },
  }
}

function renameToAlternateRanger(content: ImportContent): ImportContent {
  const rename = (value: string | null | undefined) =>
    value && /^ranger$/i.test(value) ? "Alternate Ranger" : value

  return {
    ...content,
    classes: (content.classes ?? []).map((cls) => ({
      ...cls,
      name: rename(cls.name) ?? cls.name,
    })),
    subclasses: (content.subclasses ?? []).map((sc) => ({
      ...sc,
      class_name: rename(sc.class_name) ?? sc.class_name,
    })),
    class_resources: (content.class_resources ?? []).map((row) => ({
      ...row,
      class_name: rename(row.class_name) ?? row.class_name,
    })),
    spells: (content.spells ?? []).map((spell) => ({
      ...spell,
      classes: (spell.classes ?? []).map((c) => rename(c) ?? c),
    })),
  }
}

function remapResources(content: ImportContent): ImportContent {
  let resources = (content.class_resources ?? []).map((row) => {
    if (row.resource_key !== "quarry_die") {
      return { ...row, class_name: "Alternate Ranger" }
    }
    const uses = asRecord(row.uses) ?? {}
    const fromTable = Array.isArray(uses.atLevelTable)
      ? (uses.atLevelTable as { level: number; count: number }[])
      : []
    const fromDie = Array.isArray(uses.dieSidesByLevel)
      ? (uses.dieSidesByLevel as { level: number; count: number }[])
      : []
    const dieSides = fromDie.length ? fromDie : fromTable
    return {
      ...row,
      class_name: "Alternate Ranger",
      resource_key: "quarry_die",
      name: row.name || "Quarry Die",
      description:
        row.description ||
        "Die size for Ranger's Quarry bonus damage (d4→d12). Not a spendable pool.",
      uses: {
        type: "special" as const,
        atLevelMode: "tier" as const,
        dieSidesByLevel: dieSides.length
          ? dieSides
          : [
              { level: 2, count: 4 },
              { level: 6, count: 6 },
              { level: 10, count: 8 },
              { level: 14, count: 10 },
              { level: 18, count: 12 },
            ],
      },
    }
  })

  if (!resources.some((r) => r.resource_key === "quarry")) {
    resources = [buildQuarryClassResource("Alternate Ranger") as (typeof resources)[number], ...resources]
  } else {
    resources = resources.map((row) => {
      if (row.resource_key !== "quarry") return row
      type Recharge = { rest: "short_rest" | "long_rest"; amount?: number | null }
      type Override = { atClassLevel: number; recharges: Recharge[] }
      const uses = asRecord(row.uses) ?? {}
      const recharges: Recharge[] = Array.isArray(uses.recharges)
        ? (uses.recharges as Recharge[]).map((r) => ({
            rest: r.rest === "short_rest" ? "short_rest" : "long_rest",
            ...(r.amount != null ? { amount: r.amount } : {}),
          }))
        : []
      const overrides: Override[] = Array.isArray(uses.rechargeOverrides)
        ? (uses.rechargeOverrides as Override[]).map((o) => ({
            atClassLevel: Number(o.atClassLevel),
            recharges: (o.recharges ?? []).map((r) => ({
              rest: r.rest === "short_rest" ? "short_rest" : "long_rest",
              ...(r.amount != null ? { amount: r.amount } : {}),
            })),
          }))
        : []
      if (!overrides.some((o) => o.atClassLevel === 10)) {
        overrides.push({
          atClassLevel: 10,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        })
      }
      const restoreBySpellSlot =
        asRecord(uses.restoreBySpellSlot) ?? { minSpellLevel: 1, restores: 1 }
      return {
        ...row,
        class_name: "Alternate Ranger",
        uses: {
          type: "ability_modifier" as const,
          abilityModifier: "WIS" as const,
          recharges: recharges.length
            ? recharges
            : [{ rest: "short_rest" as const, amount: 1 }, { rest: "long_rest" as const }],
          restoreBySpellSlot: {
            minSpellLevel: Number(restoreBySpellSlot.minSpellLevel ?? 1),
            restores: Number(restoreBySpellSlot.restores ?? 1),
          },
          rechargeOverrides: overrides,
        },
      }
    })
  }

  resources = resources.map((row) => {
    if (row.resource_key !== "knacks_known") return row
    const uses = asRecord(row.uses) ?? {}
    return {
      ...row,
      class_name: "Alternate Ranger",
      uses: {
        type: "special" as const,
        atLevelMode: "tier" as const,
        atLevelTable:
          Array.isArray(uses.atLevelTable) && (uses.atLevelTable as unknown[]).length
            ? (uses.atLevelTable as { level: number; count: number }[])
            : [...ALTERNATE_RANGER_KNACKS_KNOWN_BY_LEVEL],
      },
    }
  })

  return { ...content, class_resources: resources }
}

function wireKnacksAndQuarryFeatures(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  const knacksTable =
    content.class_resources?.find((r) => r.resource_key === "knacks_known")?.uses?.atLevelTable ??
    [...ALTERNATE_RANGER_KNACKS_KNOWN_BY_LEVEL]

  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+ranger/i.test(cls.name ?? "")) return cls
      const features = (cls.features ?? []).map((feat) => {
        if (/^knacks$/i.test(feat.name ?? "")) {
          const choices = feat.choices ?? {
            category: "Knack",
            count: 1,
            options: [],
          }
          return {
            ...feat,
            isChoice: true,
            choices: {
              ...choices,
              category: choices.category || "Knack",
              count: choices.count > 0 ? choices.count : 1,
              resourceKey: "knacks_known",
              optionsSource: "class_knacks" as const,
              swappableOnRest: false,
              choiceCountByLevel:
                choices.choiceCountByLevel?.length
                  ? choices.choiceCountByLevel
                  : [...knacksTable],
              options: choices.options ?? [],
            },
          }
        }
        if (/^(ranger'?s\s+)?quarry$/i.test(feat.name ?? "")) {
          const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
          const withoutLooseUses = mechanics.filter((m) => {
            const row = asRecord(m)
            if (row?.kind !== "uses") return true
            // Drop WIS-mod feature-local uses when class_resources.quarry owns the pool.
            return row.classResourceKey === "quarry"
          })
          if (!withoutLooseUses.some((m) => asRecord(m)?.kind === "uses")) {
            withoutLooseUses.unshift({
              kind: "uses",
              classResourceKey: "quarry",
              classResourceCost: 1,
              sourcePhrase:
                "You can use this feature a number of times equal to your Wisdom modifier (minimum of once)",
              confidence: "high",
            })
          }
          return { ...feat, mechanics: withoutLooseUses }
        }
        if (/^ability score improvement$/i.test(feat.name ?? "")) {
          const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
          if (!mechanics.some((m) => asRecord(m)?.kind === "grant_feat")) {
            mechanics.push({
              kind: "grant_feat",
              featCategories: ["General"],
              sourcePhrase:
                "you can increase one of your ability scores by 2, or two of your ability scores by 1",
              confidence: "high",
            })
          }
          return { ...feat, mechanics }
        }
        return feat
      })
      return { ...cls, features }
    }),
  }
}

/**
 * Bounty Hunter Martial Exploits must NOT use optionsSource class_knacks —
 * that pool is shared with Ranger Knacks. Prefer inline choices.options
 * (Beastheart Infernal/Nature pattern). When options are empty but a Fighter
 * exploit library is present in the same paste, fill from eligible Fighter rows.
 */
function wireBountyHunterMartialExploits(content: ImportContent): ImportContent {
  if (!content.subclasses?.length) return content

  const fighterExploits = (content.import_proposals?.custom_abilities ?? []).filter((a) => {
    const eligible = a.eligible_classes ?? []
    return (
      Boolean(a.execution?.trim()) &&
      eligible.some((name) => /^fighter$/i.test(name)) &&
      a.source_type !== "subclass"
    )
  })

  const exploitsKnownTable =
    content.class_resources?.find(
      (r) => r.resource_key === "exploits_known" && /bounty hunter/i.test(r.subclass_name ?? ""),
    )?.uses?.atLevelTable ?? [
      { level: 3, count: 2 },
      { level: 5, count: 3 },
      { level: 7, count: 4 },
      { level: 11, count: 5 },
      { level: 15, count: 6 },
      { level: 19, count: 7 },
    ]

  return {
    ...content,
    subclasses: content.subclasses.map((sc) => {
      if (!/^bounty hunter$/i.test(sc.name ?? "")) return sc
      if (!/alternate\s+ranger/i.test(sc.class_name ?? "")) return sc
      const features = (sc.features ?? []).map((feat) => {
        if (!/^martial exploits$/i.test(feat.name ?? "")) return feat
        const prior = feat.choices
        const priorOptions = prior?.options ?? []
        const options =
          priorOptions.length > 0
            ? priorOptions
            : fighterExploits.map((a) => ({
                name: a.name,
                description: a.description || a.definition || "",
                prerequisite: a.prerequisite ?? null,
              }))
        const { optionsSource: _drop, ...restChoices } = (prior ?? {
          category: "Martial Exploit",
          count: 2,
          options: [],
        }) as {
          optionsSource?: string
          category?: string
          count?: number
          options?: { name: string; description?: string; prerequisite?: string | null }[]
          resourceKey?: string
          choiceCountByLevel?: { level: number; count: number }[]
          swappableOnRest?: boolean
        }
        return {
          ...feat,
          isChoice: true,
          choices: {
            ...restChoices,
            category: restChoices.category || "Martial Exploit",
            count: restChoices.count && restChoices.count > 0 ? restChoices.count : 2,
            resourceKey: "exploits_known",
            swappableOnRest: false,
            choiceCountByLevel:
              restChoices.choiceCountByLevel?.length
                ? restChoices.choiceCountByLevel
                : [...exploitsKnownTable],
            options,
          },
        }
      })
      return { ...sc, features }
    }),
  }
}

/**
 * Sanitize LaserLlama Alternate Ranger imports:
 * - Rename bare "Ranger" → Alternate Ranger (PHB collision)
 * - quarry + quarry_die (dieSidesByLevel) + knacks_known
 * - Knacks → class_knacks; Bounty Hunter Martial Exploits → inline options
 * - Knack library source_name Alternate Ranger
 */
export function sanitizeAlternateRangerImportContent(content: ImportContent): ImportContent {
  if (!isAlternateRangerImport(content)) return content
  let next = sanitizeLaserLlamaRangerKnacksImportContent(content)
  next = renameToAlternateRanger(next)
  next = remapResources(next)
  next = wireKnacksAndQuarryFeatures(next)
  next = wireBountyHunterMartialExploits(next)
  return next
}
