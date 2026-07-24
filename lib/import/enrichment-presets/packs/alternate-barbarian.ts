import type { ImportContent } from "@/lib/import/content-schema"

/** LaserLlama Alternate Barbarian Exploits Known column. */
export const ALTERNATE_BARBARIAN_EXPLOITS_KNOWN_BY_LEVEL = [
  { level: 2, count: 2 },
  { level: 5, count: 3 },
  { level: 7, count: 4 },
  { level: 9, count: 5 },
  { level: 11, count: 6 },
  { level: 13, count: 7 },
  { level: 17, count: 8 },
] as const

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

export function isAlternateBarbarianImport(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => /alternate\s+barbarian/i.test(cls.name ?? ""))
}

function remapResources(content: ImportContent): ImportContent {
  const resources = (content.class_resources ?? []).map((row) => {
    const key = row.resource_key === "rages" ? "rage" : row.resource_key
    const uses = asRecord(row.uses) ?? {}
    const table = Array.isArray(uses.atLevelTable)
      ? (uses.atLevelTable as { level: number; count: number }[]).filter((t) => t.level < 20 || t.count < 50)
      : undefined

    if (key === "rage") {
      type Recharge = { rest: "short_rest" | "long_rest"; amount?: number | null }
      const recharges: Recharge[] = Array.isArray(uses.recharges)
        ? (uses.recharges as Recharge[]).map((r) => ({
            rest: r.rest === "short_rest" ? "short_rest" : "long_rest",
            ...(r.amount != null ? { amount: r.amount } : {}),
          }))
        : []
      const hasShort = recharges.some((r) => r.rest === "short_rest")
      const hasLong = recharges.some((r) => r.rest === "long_rest")
      if (!hasShort) recharges.push({ rest: "short_rest", amount: 1 })
      else {
        const idx = recharges.findIndex((r) => r.rest === "short_rest")
        if (idx >= 0 && recharges[idx].amount == null) {
          recharges[idx] = { ...recharges[idx], amount: 1 }
        }
      }
      if (!hasLong) recharges.push({ rest: "long_rest" })

      return {
        ...row,
        class_name: "Alternate Barbarian",
        resource_key: "rage",
        name: row.name === "Rages" ? "Rage" : row.name,
        description:
          row.description?.replace(/placeholder count of 100/i, "freeUseAfterLevel 20") ??
          "Number of times you can enter a Rage. Regain one use on a short rest, all uses on a long rest. Unlimited at 20th level.",
        uses: {
          ...uses,
          type: "at_level" as const,
          atLevelMode: "tier" as const,
          atLevelTable: table?.length
            ? table
            : [
                { level: 1, count: 2 },
                { level: 4, count: 3 },
                { level: 8, count: 4 },
                { level: 12, count: 5 },
                { level: 17, count: 6 },
              ],
          recharges,
          freeUseAfterLevel: 20,
        },
      }
    }

    if (key === "exploits_known") {
      return {
        ...row,
        class_name: "Alternate Barbarian",
        resource_key: key,
        uses: {
          type: "special" as const,
          atLevelMode: "tier" as const,
          atLevelTable:
            Array.isArray(uses.atLevelTable) && (uses.atLevelTable as unknown[]).length
              ? (uses.atLevelTable as { level: number; count: number }[])
              : [...ALTERNATE_BARBARIAN_EXPLOITS_KNOWN_BY_LEVEL],
        },
      }
    }

    return {
      ...row,
      class_name: "Alternate Barbarian",
      resource_key: key,
    }
  })

  return { ...content, class_resources: resources }
}

function wireSavageExploits(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+barbarian/i.test(cls.name ?? "")) return cls
      const features = (cls.features ?? []).map((feat) => {
        if (!/^savage exploits$/i.test(feat.name ?? "")) return feat
        const choices = feat.choices ?? {
          category: "Exploit",
          count: 2,
          options: [],
        }
        return {
          ...feat,
          isChoice: true,
          choices: {
            ...choices,
            category: choices.category || "Exploit",
            count: choices.count > 0 ? choices.count : 2,
            resourceKey: "exploits_known",
            optionsSource: "class_knacks" as const,
            swappableOnRest: false,
            choiceCountByLevel:
              choices.choiceCountByLevel?.length
                ? choices.choiceCountByLevel
                : [...ALTERNATE_BARBARIAN_EXPLOITS_KNOWN_BY_LEVEL],
            options: choices.options ?? [],
          },
          // Drop mistaken uses mechanic on the picker shell — the die pool is class_resources.
          mechanics: (feat.mechanics ?? []).filter((m) => (m as { kind?: string }).kind !== "uses"),
        }
      })
      return { ...cls, features }
    }),
  }
}

function wireAsiAndPrimalChampion(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+barbarian/i.test(cls.name ?? "")) return cls
      const features = (cls.features ?? []).map((feat) => {
        if (/^ability score improvement$/i.test(feat.name ?? "")) {
          const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
          if (!mechanics.some((m) => (m as { kind?: string }).kind === "grant_feat")) {
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
 * Promote LaserLlama exploit library rows so class_knacks pickers resolve them.
 * Shared libraries use eligible_classes; Alternate Barbarian/Rogue must match bare class names.
 * Do not touch Beastheart Infernal/Nature exploit leaves (subclass source_type).
 */
export function sanitizeLaserLlamaExploitsImportContent(content: ImportContent): ImportContent {
  const proposals = content.import_proposals?.custom_abilities
  if (!proposals?.length) return content

  const next = proposals.map((ability) => {
    const eligible = [...(ability.eligible_classes ?? [])]
    const hasBarb = eligible.some((name) => /^barbarian$/i.test(name))
    const hasAltBarb = eligible.some((name) => /alternate\s+barbarian/i.test(name))
    if (hasBarb && !hasAltBarb) eligible.push("Alternate Barbarian")

    const hasRogue = eligible.some((name) => /^rogue$/i.test(name))
    const hasAltRogue = eligible.some((name) => /alternate\s+rogue/i.test(name))
    if (hasRogue && !hasAltRogue) eligible.push("Alternate Rogue")

    const hasFighter = eligible.some((name) => /^fighter$/i.test(name))
    const hasAltFighter = eligible.some((name) => /alternate\s+fighter/i.test(name))
    if (hasFighter && !hasAltFighter) eligible.push("Alternate Fighter")

    // LaserLlama shared exploit rows list eligible martial classes (+ Execution).
    // Skip subclass-gated lists (Beastheart Infernal/Nature) even if they say "exploit".
    const isSharedExploitLibraryRow =
      (hasBarb ||
        hasRogue ||
        hasFighter ||
        (eligible.length >= 2 && Boolean(ability.execution?.trim()))) &&
      ability.source_type !== "subclass"

    if (!isSharedExploitLibraryRow) return ability

    return {
      ...ability,
      ability_role: ability.ability_role ?? ("knack" as const),
      eligible_classes: eligible.length ? eligible : ability.eligible_classes,
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

/**
 * Sanitize LaserLlama Alternate Barbarian imports:
 * - rage resource (not rages) + freeUseAfterLevel 20 (not count 100)
 * - Savage Exploits → class_knacks + exploits_known
 * - ASI / Primal Champion mechanics
 */
export function sanitizeAlternateBarbarianImportContent(content: ImportContent): ImportContent {
  if (!isAlternateBarbarianImport(content)) return content
  let next = sanitizeLaserLlamaExploitsImportContent(content)
  next = remapResources(next)
  next = wireSavageExploits(next)
  next = wireAsiAndPrimalChampion(next)
  return next
}
