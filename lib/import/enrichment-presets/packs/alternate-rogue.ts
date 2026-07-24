import type { ImportContent } from "@/lib/import/content-schema"

/** LaserLlama Alternate Rogue Exploits Known column. */
export const ALTERNATE_ROGUE_EXPLOITS_KNOWN_BY_LEVEL = [
  { level: 2, count: 2 },
  { level: 5, count: 3 },
  { level: 7, count: 4 },
  { level: 9, count: 5 },
  { level: 11, count: 6 },
  { level: 13, count: 7 },
  { level: 17, count: 8 },
] as const

/** Exploit Dice pool counts (die size is dieSidesByLevel). */
export const ALTERNATE_ROGUE_EXPLOIT_DICE_BY_LEVEL = [
  { level: 2, count: 2 },
  { level: 5, count: 3 },
  { level: 11, count: 4 },
  { level: 17, count: 5 },
] as const

export const ALTERNATE_ROGUE_EXPLOIT_DIE_SIDES_BY_LEVEL = [
  { level: 2, count: 4 },
  { level: 5, count: 6 },
  { level: 11, count: 8 },
  { level: 17, count: 10 },
] as const

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

export function isAlternateRogueImport(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => {
    const name = cls.name ?? ""
    if (/alternate\s+rogue/i.test(name)) return true
    if (!/^rogue$/i.test(name)) return false
    const keys = new Set((content.class_resources ?? []).map((r) => r.resource_key))
    return keys.has("exploits_known") && keys.has("exploit_dice")
  })
}

function titleCaseExploit(name: string): string {
  const small = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"])
  return name
    .trim()
    .split(/\s+/)
    .map((part, index) => {
      if (!part) return part
      const lower = part.toLowerCase()
      if (index > 0 && small.has(lower)) return lower
      return lower[0]!.toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

/** Parse subclass signature-exploit HTML tables into level → exploit names. */
export function parseSignatureExploitTable(
  description: string,
): { level: number; names: string[] }[] {
  const rows: { level: number; names: string[] }[] = []
  const re =
    /<tr>\s*<td[^>]*>\s*(\d+)(?:st|nd|rd|th)?\s*<\/td>\s*<td[^>]*>\s*([^<]+)\s*<\/td>\s*<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(description))) {
    const level = Number(match[1])
    const names = match[2]
      .split(/,/)
      .map((part) => titleCaseExploit(part))
      .filter(Boolean)
    if (level > 0 && names.length) rows.push({ level, names })
  }
  return rows
}

function renameToAlternateRogue(content: ImportContent): ImportContent {
  const rename = (value: string | null | undefined) =>
    value && /^rogue$/i.test(value) ? "Alternate Rogue" : value

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
  }
}

function remapResources(content: ImportContent): ImportContent {
  const resources = (content.class_resources ?? []).map((row) => {
    const key = row.resource_key
    const uses = asRecord(row.uses) ?? {}

    if (key === "exploit_dice") {
      type Recharge = { rest: "short_rest" | "long_rest"; amount?: number | null }
      const recharges: Recharge[] = Array.isArray(uses.recharges)
        ? (uses.recharges as Recharge[]).map((r) => ({
            rest: r.rest === "short_rest" ? "short_rest" : "long_rest",
            ...(r.amount != null ? { amount: r.amount } : {}),
          }))
        : []
      if (!recharges.some((r) => r.rest === "short_rest")) recharges.push({ rest: "short_rest" })
      if (!recharges.some((r) => r.rest === "long_rest")) recharges.push({ rest: "long_rest" })

      const table = Array.isArray(uses.atLevelTable)
        ? (uses.atLevelTable as { level: number; count: number }[])
        : []
      const needsFill =
        !table.some((t) => t.level === 17 && t.count === 5) ||
        !table.some((t) => t.level === 2 && t.count === 2)

      return {
        ...row,
        class_name: "Alternate Rogue",
        resource_key: "exploit_dice",
        uses: {
          ...uses,
          type: "at_level" as const,
          atLevelMode: "tier" as const,
          atLevelTable: needsFill ? [...ALTERNATE_ROGUE_EXPLOIT_DICE_BY_LEVEL] : table,
          dieSidesByLevel:
            Array.isArray(uses.dieSidesByLevel) && (uses.dieSidesByLevel as unknown[]).length
              ? (uses.dieSidesByLevel as { level: number; count: number }[])
              : [...ALTERNATE_ROGUE_EXPLOIT_DIE_SIDES_BY_LEVEL],
          recharges,
        },
      }
    }

    if (key === "exploits_known") {
      return {
        ...row,
        class_name: "Alternate Rogue",
        resource_key: key,
        uses: {
          type: "special" as const,
          atLevelMode: "tier" as const,
          atLevelTable:
            Array.isArray(uses.atLevelTable) && (uses.atLevelTable as unknown[]).length
              ? (uses.atLevelTable as { level: number; count: number }[])
              : [...ALTERNATE_ROGUE_EXPLOITS_KNOWN_BY_LEVEL],
        },
      }
    }

    if (key === "divine_favor" || key === "divine_limit") {
      return {
        ...row,
        class_name: "Alternate Rogue",
        subclass_name: row.subclass_name ?? "Avenger",
        resource_key: key,
        uses:
          key === "divine_limit"
            ? {
                type: "special" as const,
                atLevelMode: "tier" as const,
                atLevelTable: Array.isArray(uses.atLevelTable)
                  ? (uses.atLevelTable as { level: number; count: number }[])
                  : [
                      { level: 3, count: 1 },
                      { level: 7, count: 2 },
                      { level: 13, count: 3 },
                      { level: 19, count: 4 },
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
      class_name: "Alternate Rogue",
      resource_key: key,
    }
  })

  return { ...content, class_resources: resources }
}

function wireDeviousExploitsAndClassFeatures(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  const exploitsKnownTable =
    content.class_resources?.find((r) => r.resource_key === "exploits_known")?.uses?.atLevelTable ??
    [...ALTERNATE_ROGUE_EXPLOITS_KNOWN_BY_LEVEL]

  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+rogue/i.test(cls.name ?? "")) return cls
      const features = (cls.features ?? []).map((feat) => {
        if (/^devious exploits$/i.test(feat.name ?? "")) {
          const choices = feat.choices ?? {
            category: "Devious Exploit",
            count: 2,
            options: [],
          }
          return {
            ...feat,
            isChoice: true,
            choices: {
              ...choices,
              category: choices.category || "Devious Exploit",
              count: choices.count > 0 ? choices.count : 2,
              resourceKey: "exploits_known",
              optionsSource: "class_knacks" as const,
              swappableOnRest: false,
              choiceCountByLevel:
                choices.choiceCountByLevel?.length
                  ? choices.choiceCountByLevel
                  : [...exploitsKnownTable],
              options: choices.options ?? [],
            },
            mechanics: (feat.mechanics ?? []).filter((m) => asRecord(m)?.kind !== "uses"),
          }
        }

        // Extraction often mashes "Expertise, Uncanny Dodge" into one L6 row; Uncanny Dodge is the real feature.
        if (/^expertise\s*\(\s*uncanny dodge\s*\)$/i.test(feat.name ?? "")) {
          return {
            ...feat,
            name: "Uncanny Dodge",
            description:
              feat.description?.replace(
                /\[Extraction note:[^\]]*\]/gi,
                "",
              ) ?? feat.description,
          }
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

function wireSubclassSignatureExploits(content: ImportContent): ImportContent {
  if (!content.subclasses?.length) return content

  return {
    ...content,
    subclasses: content.subclasses.map((sc) => {
      if (!/alternate\s+rogue/i.test(sc.class_name ?? "")) return sc
      const features = (sc.features ?? []).map((feat) => {
        if (!/exploits$/i.test(feat.name ?? "")) return feat
        if (/^devious exploits$/i.test(feat.name ?? "")) return feat
        const parsed = parseSignatureExploitTable(feat.description ?? "")
        if (!parsed.length) return feat

        const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
        const existing = new Set(
          mechanics
            .filter((m) => asRecord(m)?.kind === "grant_custom_ability")
            .flatMap((m) => {
              const names = asRecord(m)?.abilityNames
              return Array.isArray(names) ? names.map(String) : []
            }),
        )

        for (const row of parsed) {
          for (const abilityName of row.names) {
            if (existing.has(abilityName)) continue
            existing.add(abilityName)
            mechanics.push({
              kind: "grant_custom_ability",
              abilityNames: [abilityName],
              sourcePhrase: `At Rogue level ${row.level}, you learn the signature Exploit ${abilityName}.`,
              confidence: "high",
            })
          }
        }

        return { ...feat, mechanics }
      })
      return { ...sc, features }
    }),
  }
}

/**
 * Saboteur explosives must not use eligible_classes Alternate Rogue —
 * that would pollute Devious Exploits class_knacks. Keep them subclass-sourced.
 */
function sanitizeSaboteurExplosives(content: ImportContent): ImportContent {
  const proposals = content.import_proposals?.custom_abilities
  if (!proposals?.length) return content

  const next = proposals.map((ability) => {
    const isSaboteurBomb =
      /^saboteur$/i.test(ability.source_name ?? "") ||
      (ability.source_type === "subclass" &&
        /explosive|bomb|charge|dust/i.test(`${ability.name} ${ability.definition ?? ""}`))
    if (!isSaboteurBomb) return ability

    // Drop class eligibility so class_knacks (Devious Exploits) ignores these rows.
    return {
      ...ability,
      ability_role: ability.ability_role ?? ("knack" as const),
      source_type: "subclass" as const,
      source_name: ability.source_name || "Saboteur",
      eligible_classes: null,
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

export function sanitizeAlternateRogueImportContent(content: ImportContent): ImportContent {
  if (!isAlternateRogueImport(content)) return content
  let next = renameToAlternateRogue(content)
  next = remapResources(next)
  next = wireDeviousExploitsAndClassFeatures(next)
  next = wireSubclassSignatureExploits(next)
  next = sanitizeSaboteurExplosives(next)
  return next
}
