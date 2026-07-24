import type { ImportContent } from "@/lib/import/content-schema"
import { parseSignatureExploitTable } from "@/lib/import/enrichment-presets/packs/alternate-rogue"

/** LaserLlama Alternate Fighter Exploits Known column. */
export const ALTERNATE_FIGHTER_EXPLOITS_KNOWN_BY_LEVEL = [
  { level: 2, count: 2 },
  { level: 3, count: 3 },
  { level: 5, count: 4 },
  { level: 7, count: 5 },
  { level: 9, count: 6 },
  { level: 11, count: 7 },
  { level: 13, count: 8 },
  { level: 15, count: 9 },
  { level: 17, count: 10 },
  { level: 19, count: 11 },
] as const

/** Exploit Dice pool counts (die size is dieSidesByLevel). */
export const ALTERNATE_FIGHTER_EXPLOIT_DICE_BY_LEVEL = [
  { level: 2, count: 2 },
  { level: 4, count: 3 },
  { level: 8, count: 4 },
  { level: 12, count: 5 },
  { level: 16, count: 6 },
] as const

export const ALTERNATE_FIGHTER_EXPLOIT_DIE_SIDES_BY_LEVEL = [
  { level: 2, count: 6 },
  { level: 5, count: 8 },
  { level: 11, count: 10 },
  { level: 17, count: 12 },
] as const

/** Fighting Styles Known column (grant_feat count scales via scaledClassFeatGrantCount). */
export const ALTERNATE_FIGHTER_FIGHTING_STYLES_BY_LEVEL = [
  { level: 1, count: 1 },
  { level: 6, count: 2 },
  { level: 12, count: 3 },
  { level: 18, count: 4 },
] as const

/** Runecarver / Sylvan Archer / Tinker "Known" progressions. */
export const ALTERNATE_FIGHTER_SUBCLASS_CATALOG_BY_LEVEL = [
  { level: 3, count: 2 },
  { level: 7, count: 3 },
  { level: 10, count: 4 },
  { level: 15, count: 5 },
  { level: 18, count: 6 },
] as const

const SUBCLASS_CATALOG_FEATURES: {
  subclass: RegExp
  feature: RegExp
  category: string
  sources: RegExp
}[] = [
  {
    subclass: /^runecarver$/i,
    feature: /^rune carving$/i,
    category: "Rune",
    sources: /^runecarver$/i,
  },
  {
    subclass: /^sylvan archer$/i,
    feature: /^enchanted shots$/i,
    category: "Enchanted Shot",
    sources: /^sylvan archer$/i,
  },
  {
    subclass: /^tinker$/i,
    feature: /^inventive arsenal$/i,
    category: "Schematic",
    sources: /^tinker$/i,
  },
]

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

export function isAlternateFighterImport(content: ImportContent): boolean {
  return (content.classes ?? []).some((cls) => {
    const name = cls.name ?? ""
    if (/alternate\s+fighter/i.test(name)) return true
    if (!/^fighter$/i.test(name)) return false
    const keys = new Set((content.class_resources ?? []).map((r) => r.resource_key))
    const hasMartial = (cls.features ?? []).some((f) => /^martial exploits$/i.test(f.name ?? ""))
    return hasMartial && keys.has("exploits_known") && keys.has("exploit_dice")
  })
}

function renameToAlternateFighter(content: ImportContent): ImportContent {
  const rename = (value: string | null | undefined) =>
    value && /^fighter$/i.test(value) ? "Alternate Fighter" : value

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
  const hasRelentless = (content.classes ?? []).some((cls) =>
    (cls.features ?? []).some((f) => /^relentless$/i.test(f.name ?? "")),
  )

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
        !table.some((t) => t.level === 16 && t.count === 6) ||
        !table.some((t) => t.level === 2 && t.count === 2)

      return {
        ...row,
        class_name: "Alternate Fighter",
        resource_key: "exploit_dice",
        uses: {
          ...uses,
          type: "at_level" as const,
          atLevelMode: "tier" as const,
          atLevelTable: needsFill ? [...ALTERNATE_FIGHTER_EXPLOIT_DICE_BY_LEVEL] : table,
          dieSidesByLevel:
            Array.isArray(uses.dieSidesByLevel) && (uses.dieSidesByLevel as unknown[]).length
              ? (uses.dieSidesByLevel as { level: number; count: number }[])
              : [...ALTERNATE_FIGHTER_EXPLOIT_DIE_SIDES_BY_LEVEL],
          recharges,
          ...(hasRelentless ? { rechargeOnInitiative: true as const } : {}),
        },
      }
    }

    if (key === "exploits_known") {
      return {
        ...row,
        class_name: "Alternate Fighter",
        resource_key: key,
        uses: {
          type: "special" as const,
          atLevelMode: "tier" as const,
          atLevelTable:
            Array.isArray(uses.atLevelTable) && (uses.atLevelTable as unknown[]).length
              ? (uses.atLevelTable as { level: number; count: number }[])
              : [...ALTERNATE_FIGHTER_EXPLOITS_KNOWN_BY_LEVEL],
        },
      }
    }

    return {
      ...row,
      class_name: "Alternate Fighter",
      resource_key: key,
    }
  })

  return { ...content, class_resources: resources }
}

function wireMartialExploitsAndClassFeatures(content: ImportContent): ImportContent {
  if (!content.classes?.length) return content
  const exploitsKnownTable =
    content.class_resources?.find((r) => r.resource_key === "exploits_known")?.uses?.atLevelTable ??
    [...ALTERNATE_FIGHTER_EXPLOITS_KNOWN_BY_LEVEL]

  return {
    ...content,
    classes: content.classes.map((cls) => {
      if (!/alternate\s+fighter/i.test(cls.name ?? "")) return cls
      const features = (cls.features ?? []).map((feat) => {
        if (/^martial exploits$/i.test(feat.name ?? "")) {
          const choices = feat.choices ?? {
            category: "Martial Exploit",
            count: 2,
            options: [],
          }
          return {
            ...feat,
            isChoice: true,
            choices: {
              ...choices,
              category: choices.category || "Martial Exploit",
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

        if (/^fighting style$/i.test(feat.name ?? "")) {
          const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
          if (!mechanics.some((m) => asRecord(m)?.kind === "grant_feat")) {
            mechanics.push({
              kind: "grant_feat",
              featCategories: ["Fighting Style"],
              featCount: 1,
              sourcePhrase: "you learn one Fighting Style of your choice",
              confidence: "high",
            })
          }
          return { ...feat, mechanics }
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
      if (!/alternate\s+fighter/i.test(sc.class_name ?? "")) return sc
      const features = (sc.features ?? []).map((feat) => {
        if (!/exploits$/i.test(feat.name ?? "")) return feat
        if (/^martial exploits$/i.test(feat.name ?? "")) return feat
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
              sourcePhrase: `At Fighter level ${row.level}, you learn the signature Exploit ${abilityName}.`,
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

function abilityToOption(ability: {
  name?: string | null
  description?: string | null
  definition?: string | null
  prerequisite?: string | null
}): { name: string; description: string; prerequisite?: string | null } {
  return {
    name: ability.name ?? "",
    description: ability.description || ability.definition || "",
    prerequisite: ability.prerequisite ?? null,
  }
}

/**
 * Runecarver / Sylvan Archer / Tinker / Quartermaster catalogs must not use
 * eligible_classes Alternate Fighter — that pollutes Martial Exploits knacks.
 * Wire Known pickers as inline choices.options (Beastheart Infernal pattern).
 */
function sanitizeSubclassCatalogs(content: ImportContent): ImportContent {
  const proposals = content.import_proposals?.custom_abilities
  if (!proposals?.length && !content.subclasses?.length) return content

  const catalogSources = [/^(runecarver|sylvan archer|tinker|quartermaster)$/i]
  const nextAbilities = (proposals ?? []).map((ability) => {
    const isCatalog =
      ability.source_type === "subclass" &&
      catalogSources.some((re) => re.test(ability.source_name ?? ""))
    if (!isCatalog) return ability
    const { ability_role: _role, ...rest } = ability
    return {
      ...rest,
      source_type: "subclass" as const,
      source_name: ability.source_name,
      eligible_classes: null,
    }
  })

  let next: ImportContent = {
    ...content,
    import_proposals: {
      ...content.import_proposals,
      custom_abilities: nextAbilities,
    },
  }

  if (!next.subclasses?.length) return next

  next = {
    ...next,
    subclasses: next.subclasses.map((sc) => {
      if (!/alternate\s+fighter/i.test(sc.class_name ?? "")) return sc
      const features = (sc.features ?? []).map((feat) => {
        const match = SUBCLASS_CATALOG_FEATURES.find(
          (row) => row.subclass.test(sc.name ?? "") && row.feature.test(feat.name ?? ""),
        )
        if (!match) {
          // Master at Arms: bonus Fighting Style that does not consume Styles Known.
          if (
            /^master at arms$/i.test(sc.name ?? "") &&
            /^advanced technique$/i.test(feat.name ?? "")
          ) {
            const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
            if (!mechanics.some((m) => asRecord(m)?.kind === "grant_feat")) {
              mechanics.push({
                kind: "grant_feat",
                featCategories: ["Fighting Style"],
                featCount: 1,
                sourcePhrase: "You learn an additional Fighting Style of your choice",
                confidence: "high",
              })
            }
            return { ...feat, mechanics }
          }
          return feat
        }

        const options = nextAbilities
          .filter(
            (a) =>
              a.source_type === "subclass" &&
              match.sources.test(a.source_name ?? "") &&
              Boolean(a.name?.trim()),
          )
          .map((a) => abilityToOption(a))

        if (!options.length && !(feat.choices?.options?.length)) return feat

        const prior = feat.choices
        return {
          ...feat,
          isChoice: true,
          choices: {
            category: match.category,
            count: prior?.count && prior.count > 0 ? prior.count : 2,
            options: prior?.options?.length ? prior.options : options,
            swappableOnRest: false,
            choiceCountByLevel:
              prior?.choiceCountByLevel?.length
                ? prior.choiceCountByLevel
                : [...ALTERNATE_FIGHTER_SUBCLASS_CATALOG_BY_LEVEL],
          },
        }
      })
      return { ...sc, features }
    }),
  }

  return next
}

export function sanitizeAlternateFighterImportContent(content: ImportContent): ImportContent {
  if (!isAlternateFighterImport(content)) return content
  let next = renameToAlternateFighter(content)
  next = remapResources(next)
  next = wireMartialExploitsAndClassFeatures(next)
  next = wireSubclassSignatureExploits(next)
  next = sanitizeSubclassCatalogs(next)
  return next
}
