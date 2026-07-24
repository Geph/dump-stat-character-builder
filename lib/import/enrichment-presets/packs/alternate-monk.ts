import type { ImportContent } from "@/lib/import/content-schema"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"

/** LaserLlama Alternate Monk Techniques Known column. */
export const ALTERNATE_MONK_TECHNIQUES_KNOWN_BY_LEVEL = [
  { level: 2, count: 3 },
  { level: 5, count: 4 },
  { level: 7, count: 5 },
  { level: 9, count: 6 },
  { level: 11, count: 7 },
  { level: 13, count: 8 },
  { level: 15, count: 9 },
  { level: 18, count: 10 },
] as const

/** Way of the Brawler Exploits Known column. */
export const ALTERNATE_MONK_BRAWLER_EXPLOITS_KNOWN_BY_LEVEL = [
  { level: 3, count: 2 },
  { level: 5, count: 3 },
  { level: 7, count: 4 },
  { level: 11, count: 5 },
  { level: 15, count: 6 },
  { level: 19, count: 7 },
] as const

const KI_KEY = prefixedResourceKey(slugClassPrefix("Alternate Monk"), "ki_points")

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

export function isAlternateMonkImport(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => {
    const name = cls.name ?? ""
    if (/alternate\s+monk/i.test(name)) return true
    // Paste sometimes titles the class "Monk" but ships Ki + Techniques Known + Traditions.
    if (!/^monk$/i.test(name)) return false
    const keys = new Set((content.class_resources ?? []).map((r) => r.resource_key))
    return keys.has("techniques_known") || keys.has("ki") || keys.has("ki_points")
  })
}

function isLaserLlamaMonkTechniqueRow(ability: {
  ability_role?: string | null
  definition?: string | null
  source_name?: string | null
  execution?: string | null
  eligible_classes?: string[] | null
}): boolean {
  // Shared exploit library rows have Execution + multi-class eligible_classes — never techniques.
  if (ability.execution?.trim() && (ability.eligible_classes?.length ?? 0) >= 2) return false
  if (/^(alternate\s+)?monk$/i.test(ability.source_name ?? "")) {
    const def = `${ability.definition ?? ""}`
    if (/mystic\s+technique|monk\s+technique|\bki\b/i.test(def)) return true
    if (ability.ability_role === "knack" && !/exploit/i.test(def)) return true
  }
  if (ability.ability_role === "knack" && /mystic\s+technique|monk\s+technique/i.test(ability.definition ?? "")) {
    return true
  }
  return false
}

/**
 * Promote LaserLlama Mystic Technique rows onto Alternate Monk
 * (never leave source_name "Monk" — that attaches to SRD Monk).
 */
export function sanitizeLaserLlamaMonkTechniquesImportContent(content: ImportContent): ImportContent {
  const proposals = content.import_proposals?.custom_abilities
  if (!proposals?.length) return content

  const next = proposals.map((ability) => {
    if (!isLaserLlamaMonkTechniqueRow(ability)) return ability
    return {
      ...ability,
      ability_role: "knack" as const,
      source_type: ability.source_type ?? ("class" as const),
      source_name: "Alternate Monk",
      eligible_classes: (() => {
        const eligible = [...(ability.eligible_classes ?? [])]
        if (!eligible.some((name) => /alternate\s+monk/i.test(name))) {
          eligible.push("Alternate Monk")
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

function renameToAlternateMonk(content: ImportContent): ImportContent {
  const rename = (value: string | null | undefined) =>
    value && /^monk$/i.test(value) ? "Alternate Monk" : value

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
      classes: (spell.classes ?? []).map((name) => rename(name) ?? name),
    })),
  }
}

function remapKiKeyInMechanics(mechanics: unknown[] | undefined): unknown[] | undefined {
  if (!mechanics?.length) return mechanics
  return mechanics.map((m) => {
    const row = asRecord(m)
    if (!row) return m
    const next = { ...row }
    for (const field of ["classResourceKey", "restoreResourceKey", "spendResourceKey", "resourceKey"] as const) {
      const value = next[field]
      if (typeof value === "string" && /^(ki|ki_points|focus_points)$/i.test(value)) {
        next[field] = KI_KEY
      }
    }
    return next
  })
}

function remapResources(content: ImportContent): ImportContent {
  const resources = (content.class_resources ?? []).map((row) => {
    const rawKey = row.resource_key
    const key =
      rawKey === "ki" || rawKey === "ki_points" || rawKey === "focus_points" ? KI_KEY : rawKey
    const uses = asRecord(row.uses) ?? {}

    if (key === KI_KEY) {
      type Recharge = { rest: "short_rest" | "long_rest"; amount?: number | null }
      const recharges: Recharge[] = Array.isArray(uses.recharges)
        ? (uses.recharges as Recharge[]).map((r) => ({
            rest: r.rest === "short_rest" ? "short_rest" : "long_rest",
            ...(r.amount != null ? { amount: r.amount } : {}),
          }))
        : []
      if (!recharges.some((r) => r.rest === "short_rest")) recharges.push({ rest: "short_rest" })
      if (!recharges.some((r) => r.rest === "long_rest")) recharges.push({ rest: "long_rest" })

      return {
        ...row,
        class_name: "Alternate Monk",
        resource_key: KI_KEY,
        name: row.name?.trim() || "Ki",
        description:
          row.description ??
          "Spiritual power pool equal to your Monk level + Proficiency Bonus + 1. Spent to fuel Mystic Techniques, Flurry of Blows, and other features. Regained on a short or long rest (meditate for at least 30 minutes of the rest).",
        uses: {
          ...uses,
          type: "at_level" as const,
          atLevelMode: "tier" as const,
          atLevelTable: Array.isArray(uses.atLevelTable)
            ? (uses.atLevelTable as { level: number; count: number }[])
            : [
                { level: 2, count: 5 },
                { level: 3, count: 6 },
                { level: 4, count: 7 },
                { level: 5, count: 9 },
                { level: 6, count: 10 },
                { level: 7, count: 11 },
                { level: 8, count: 12 },
                { level: 9, count: 14 },
                { level: 10, count: 15 },
                { level: 11, count: 16 },
                { level: 12, count: 17 },
                { level: 13, count: 19 },
                { level: 14, count: 20 },
                { level: 15, count: 21 },
                { level: 16, count: 22 },
                { level: 17, count: 24 },
                { level: 18, count: 25 },
                { level: 19, count: 26 },
                { level: 20, count: 27 },
              ],
          recharges,
        },
      }
    }

    if (key === "martial_arts_die") {
      const table = Array.isArray(uses.atLevelTable)
        ? (uses.atLevelTable as { level: number; count: number }[])
        : Array.isArray(uses.dieSidesByLevel)
          ? (uses.dieSidesByLevel as { level: number; count: number }[])
          : [
              { level: 1, count: 6 },
              { level: 5, count: 8 },
              { level: 11, count: 10 },
              { level: 17, count: 12 },
            ]
      const { atLevelTable: _drop, ...restUses } = uses
      return {
        ...row,
        class_name: "Alternate Monk",
        resource_key: "martial_arts_die",
        uses: {
          ...restUses,
          type: "special" as const,
          dieSidesByLevel: table,
        },
      }
    }

    if (key === "techniques_known") {
      return {
        ...row,
        class_name: "Alternate Monk",
        resource_key: key,
        uses: {
          type: "special" as const,
          atLevelMode: "tier" as const,
          atLevelTable:
            Array.isArray(uses.atLevelTable) && (uses.atLevelTable as unknown[]).length
              ? (uses.atLevelTable as { level: number; count: number }[])
              : [...ALTERNATE_MONK_TECHNIQUES_KNOWN_BY_LEVEL],
        },
      }
    }

    if (key === "exploit_dice" || key === "exploits_known" || key === "exploit_degree") {
      return {
        ...row,
        class_name: "Alternate Monk",
        subclass_name: row.subclass_name ?? "Way of the Brawler",
        resource_key: key,
        uses:
          key === "exploits_known"
            ? {
                type: "special" as const,
                atLevelMode: "tier" as const,
                atLevelTable:
                  Array.isArray(uses.atLevelTable) && (uses.atLevelTable as unknown[]).length
                    ? (uses.atLevelTable as { level: number; count: number }[])
                    : [...ALTERNATE_MONK_BRAWLER_EXPLOITS_KNOWN_BY_LEVEL],
              }
            : key === "exploit_degree"
              ? {
                  type: "special" as const,
                  atLevelMode: "tier" as const,
                  atLevelTable: Array.isArray(uses.atLevelTable)
                    ? (uses.atLevelTable as { level: number; count: number }[])
                    : [
                        { level: 3, count: 1 },
                        { level: 7, count: 2 },
                        { level: 15, count: 3 },
                      ],
                }
              : {
                  ...uses,
                  type: "at_level" as const,
                  atLevelMode: "tier" as const,
                  recharges: Array.isArray(uses.recharges)
                    ? uses.recharges
                    : [{ rest: "short_rest" as const }, { rest: "long_rest" as const }],
                },
      }
    }

    return {
      ...row,
      class_name: "Alternate Monk",
      resource_key: key,
    }
  })

  return { ...content, class_resources: resources }
}

function wireMysticTechniquesAndKiFeatures(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  const techniquesTable =
    content.class_resources?.find((r) => r.resource_key === "techniques_known")?.uses?.atLevelTable ??
    [...ALTERNATE_MONK_TECHNIQUES_KNOWN_BY_LEVEL]

  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+monk/i.test(cls.name ?? "")) return cls
      const features = (cls.features ?? []).map((feat) => {
        const withKiMechanics = {
          ...feat,
          mechanics: remapKiKeyInMechanics(feat.mechanics as unknown[] | undefined) as typeof feat.mechanics,
        }
        if (/^mystic techniques$/i.test(feat.name ?? "")) {
          const choices = withKiMechanics.choices ?? {
            category: "Mystic Technique",
            count: 3,
            options: [],
          }
          return {
            ...withKiMechanics,
            isChoice: true,
            choices: {
              ...choices,
              category: choices.category || "Mystic Technique",
              count: choices.count > 0 ? choices.count : 3,
              resourceKey: "techniques_known",
              optionsSource: "class_knacks" as const,
              swappableOnRest: false,
              choiceCountByLevel:
                choices.choiceCountByLevel?.length
                  ? choices.choiceCountByLevel
                  : [...techniquesTable],
              options: choices.options ?? [],
            },
          }
        }
        if (/^ability score improvement$/i.test(feat.name ?? "")) {
          const mechanics = Array.isArray(withKiMechanics.mechanics)
            ? [...withKiMechanics.mechanics]
            : []
          if (!mechanics.some((m) => asRecord(m)?.kind === "grant_feat")) {
            mechanics.push({
              kind: "grant_feat",
              featCategories: ["General"],
              sourcePhrase:
                "you can increase one of your ability scores by 2, or two of your ability scores by 1",
              confidence: "high",
            })
          }
          return { ...withKiMechanics, mechanics }
        }
        return withKiMechanics
      })
      return { ...cls, features }
    }),
    subclasses: (content.subclasses ?? []).map((sc) => {
      if (!/alternate\s+monk/i.test(sc.class_name ?? "")) return sc
      return {
        ...sc,
        features: (sc.features ?? []).map((feat) => ({
          ...feat,
          mechanics: remapKiKeyInMechanics(feat.mechanics as unknown[] | undefined) as typeof feat.mechanics,
        })),
      }
    }),
  }
}

/**
 * Way of the Brawler Savage Exploits must NOT use optionsSource class_knacks —
 * that pool is shared with Mystic Techniques. Prefer inline choices.options from
 * LaserLlama exploits eligible for Brawler (same pattern as Bounty Hunter / Beastheart).
 */
function wireBrawlerSavageExploits(content: ImportContent): ImportContent {
  if (!content.subclasses?.length) return content

  const brawlerExploits = (content.import_proposals?.custom_abilities ?? []).filter((a) => {
    const eligible = a.eligible_classes ?? []
    return (
      Boolean(a.execution?.trim()) &&
      eligible.some((name) => /^brawler$/i.test(name)) &&
      a.source_type !== "subclass"
    )
  })

  const exploitsKnownTable =
    content.class_resources?.find(
      (r) =>
        r.resource_key === "exploits_known" && /brawler/i.test(r.subclass_name ?? ""),
    )?.uses?.atLevelTable ?? [...ALTERNATE_MONK_BRAWLER_EXPLOITS_KNOWN_BY_LEVEL]

  return {
    ...content,
    subclasses: content.subclasses.map((sc) => {
      if (!/^way of the brawler$/i.test(sc.name ?? "")) return sc
      if (!/alternate\s+monk/i.test(sc.class_name ?? "")) return sc
      const features = (sc.features ?? []).map((feat) => {
        if (!/^savage exploits$/i.test(feat.name ?? "")) return feat
        const prior = feat.choices
        const priorOptions = prior?.options ?? []
        const options =
          priorOptions.length > 0
            ? priorOptions
            : brawlerExploits.map((a) => ({
                name: a.name,
                description: a.description || a.definition || "",
                prerequisite: a.prerequisite ?? null,
              }))
        const { optionsSource: _drop, ...restChoices } = (prior ?? {
          category: "Savage Exploit",
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
            category: restChoices.category || "Savage Exploit",
            count: (restChoices.count ?? 0) > 0 ? restChoices.count! : 2,
            resourceKey: "exploits_known",
            swappableOnRest: false,
            choiceCountByLevel:
              restChoices.choiceCountByLevel?.length
                ? restChoices.choiceCountByLevel
                : [...exploitsKnownTable],
            options,
          },
          mechanics: (feat.mechanics ?? []).filter((m) => asRecord(m)?.kind !== "uses"),
        }
      })
      return { ...sc, features }
    }),
  }
}

export function sanitizeAlternateMonkImportContent(content: ImportContent): ImportContent {
  if (!isAlternateMonkImport(content)) return content
  let next = renameToAlternateMonk(content)
  next = remapResources(next)
  next = wireMysticTechniquesAndKiFeatures(next)
  next = wireBrawlerSavageExploits(next)
  return next
}
