import type { ImportContent } from "@/lib/import/content-schema"

/** LaserLlama Alternate Sorcerer Metamagics Known column. */
export const ALTERNATE_SORCERER_METAMAGICS_BY_LEVEL = [
  { level: 2, count: 2 },
  { level: 5, count: 3 },
  { level: 9, count: 4 },
  { level: 14, count: 5 },
  { level: 19, count: 6 },
] as const

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

export function isAlternateSorcererImport(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => /alternate\s+sorcerer/i.test(cls.name ?? ""))
}

function isLaserLlamaMetamagicRow(ability: {
  ability_role?: string | null
  definition?: string | null
  source_name?: string | null
}): boolean {
  const role = String(ability.ability_role ?? "")
  if (role === "metamagic") return true
  if (/^(alternate\s+)?sorcerer$/i.test(ability.source_name ?? "")) return true
  return /metamagic\s+option/i.test(ability.definition ?? "")
}

function normalizeMetamagicAbilities(content: ImportContent): ImportContent {
  const proposals = content.import_proposals?.custom_abilities
  if (!proposals?.length) return content

  const next = proposals.map((ability) => {
    if (!isLaserLlamaMetamagicRow(ability)) return ability

    const definition =
      ability.definition && /metamagic\s+option/i.test(ability.definition)
        ? ability.definition
        : ability.definition
          ? `${ability.definition.replace(/\s+$/, "")} Metamagic option.`
          : "Metamagic option."

    return {
      ...ability,
      ability_role: "knack" as const,
      source_type: ability.source_type ?? "class",
      source_name: "Alternate Sorcerer",
      definition,
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

function wireMetamagicFeature(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content

  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+sorcerer/i.test(cls.name ?? "")) return cls
      const features = (cls.features ?? []).map((feat) => {
        if (!/^metamagic$/i.test(feat.name ?? "")) return feat
        const choices = feat.choices ?? {
          category: "Metamagic",
          count: 2,
          options: [],
        }
        return {
          ...feat,
          isChoice: true,
          choices: {
            ...choices,
            category: choices.category || "Metamagic",
            count: choices.count > 0 ? choices.count : 2,
            resourceKey: "metamagics_known",
            optionsSource: "class_knacks" as const,
            swappableOnRest: false,
            choiceCountByLevel:
              choices.choiceCountByLevel?.length
                ? choices.choiceCountByLevel
                : [...ALTERNATE_SORCERER_METAMAGICS_BY_LEVEL],
            options: choices.options ?? [],
          },
        }
      })
      return { ...cls, features }
    }),
  }
}

function stripSubclassFeaturePlaceholders(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+sorcerer/i.test(cls.name ?? "")) return cls
      return {
        ...cls,
        features: (cls.features ?? []).filter(
          (feat) => !/^subclass feature$/i.test(feat.name ?? ""),
        ),
      }
    }),
  }
}

function ensureMetamagicsKnownResource(content: ImportContent): ImportContent {
  const resources = [...(content.class_resources ?? [])]
  const existing = resources.find((r) => r.resource_key === "metamagics_known")
  const uses = asRecord(existing?.uses) ?? {}
  const table =
    Array.isArray(uses.atLevelTable) && uses.atLevelTable.length
      ? uses.atLevelTable
      : [...ALTERNATE_SORCERER_METAMAGICS_BY_LEVEL]

  const without = resources.filter((r) => r.resource_key !== "metamagics_known")
  without.push({
    class_name: "Alternate Sorcerer",
    resource_key: "metamagics_known",
    name: existing?.name ?? "Metamagics Known",
    description:
      existing?.description ??
      "Number of Metamagic options you know. Scales at 2nd, 5th, 9th, 14th, and 19th level.",
    uses: {
      type: "special",
      atLevelMode: "tier",
      atLevelTable: table as { level: number; count: number }[],
    },
  })

  return { ...content, class_resources: without }
}

/**
 * Sanitize LaserLlama Alternate Sorcerer imports:
 * - Metamagic library → ability_role knack + source_name Alternate Sorcerer
 * - Metamagic feature → class_knacks + metamagics_known
 * - Strip "Subclass Feature" placeholders
 */
export function sanitizeAlternateSorcererImportContent(content: ImportContent): ImportContent {
  if (!isAlternateSorcererImport(content)) {
    // Metamagic-only paste (no class row) still needs role/source normalization.
    const hasMetamagicLib = (content.import_proposals?.custom_abilities ?? []).some((a) =>
      isLaserLlamaMetamagicRow(a),
    )
    if (!hasMetamagicLib) return content
    return normalizeMetamagicAbilities(content)
  }

  let next = content
  next = stripSubclassFeaturePlaceholders(next)
  next = ensureMetamagicsKnownResource(next)
  next = wireMetamagicFeature(next)
  next = normalizeMetamagicAbilities(next)
  return next
}
