import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"

/** Primal Manifestations Known column (2 at 3rd → 7 at 18th). */
export const KIBBLES_WARDEN_MANIFESTATIONS_BY_LEVEL = [
  { level: 3, count: 2 },
  { level: 6, count: 3 },
  { level: 9, count: 4 },
  { level: 12, count: 5 },
  { level: 15, count: 6 },
  { level: 18, count: 7 },
] as const

/** Endurance Die Size column (d8 → d10 → d12). */
export const KIBBLES_WARDEN_DIE_SIZE_BY_LEVEL = [
  { level: 2, count: 8 },
  { level: 5, count: 10 },
  { level: 11, count: 12 },
] as const

type Row = Record<string, unknown>

function asRecord(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null
}

/** KibblesTasty Warden (Endurance Dice) — not Mage Hand Press Warden (Interrupt / Survive). */
export function isKibblesTastyWarden(content: ImportContent): boolean {
  const cls = (content.classes ?? []).find((c) => /^warden$/i.test(c.name ?? ""))
  if (!cls) return false
  const featureNames = (cls.features ?? []).map((f) => f.name ?? "")
  if (featureNames.some((n) => /^interrupt$/i.test(n) || /^survive$/i.test(n))) return false
  if (
    featureNames.some(
      (n) =>
        /^endurance dice$/i.test(n) ||
        /^mystic bulwark$/i.test(n) ||
        /^primal manifestations$/i.test(n),
    )
  ) {
    return true
  }
  return (content.class_resources ?? []).some(
    (r) =>
      r.resource_key === "endurance_dice" ||
      r.resource_key === "endurance_die_size" ||
      r.resource_key === "primal_manifestations" ||
      r.resource_key === "primal_manifestations_known",
  )
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
      byName.set(key, { ...sc, class_name: sc.class_name || "Warden" })
    }
  }

  const { subclasses: _drop, ...restCls } = cls
  return {
    ...content,
    classes: [{ ...restCls }, ...classes.slice(1)] as ImportContent["classes"],
    subclasses: [...byName.values()],
  }
}

function ensureResources(content: ImportContent): ImportContent {
  const endurance = (content.class_resources ?? []).find((r) => r.resource_key === "endurance_dice")
  const enduranceUses = asRecord(endurance?.uses) ?? {}
  const dieSidesFromPool = Array.isArray(enduranceUses.dieSidesByLevel)
    ? (enduranceUses.dieSidesByLevel as { level: number; count: number }[])
    : [...KIBBLES_WARDEN_DIE_SIZE_BY_LEVEL]

  const without = (content.class_resources ?? []).filter(
    (r) =>
      r.resource_key !== "primal_manifestations_known" &&
      r.resource_key !== "primal_manifestations" &&
      r.resource_key !== "endurance_die_size",
  )

  const knownLegacy = (content.class_resources ?? []).find(
    (r) => r.resource_key === "primal_manifestations_known" || r.resource_key === "primal_manifestations",
  )
  const knownUses = asRecord(knownLegacy?.uses) ?? {}
  const knownTable =
    Array.isArray(knownUses.atLevelTable) && knownUses.atLevelTable.length
      ? knownUses.atLevelTable
      : [...KIBBLES_WARDEN_MANIFESTATIONS_BY_LEVEL]

  const dieSizeLegacy = (content.class_resources ?? []).find(
    (r) => r.resource_key === "endurance_die_size",
  )
  const dieSizeUses = asRecord(dieSizeLegacy?.uses) ?? {}
  const dieSizeTable =
    Array.isArray(dieSizeUses.atLevelTable) && dieSizeUses.atLevelTable.length
      ? dieSizeUses.atLevelTable
      : dieSidesFromPool

  const latestDie = [...dieSizeTable].sort(
    (a, b) => Number(asRecord(a)?.level ?? 0) - Number(asRecord(b)?.level ?? 0),
  )
  const last = asRecord(latestDie[latestDie.length - 1])
  const dieType =
    (typeof dieSizeUses.dieType === "string" && dieSizeUses.dieType) ||
    (typeof last?.count === "number" ? `d${last.count}` : "d12")

  return {
    ...content,
    class_resources: [
      ...without,
      {
        class_name: "Warden",
        resource_key: "endurance_die_size",
        name: dieSizeLegacy?.name || "Endurance Die Size",
        description:
          dieSizeLegacy?.description ||
          "Die type (d8 → d10 → d12) rolled when spending Endurance Dice. Scales on the class level table; not a spendable pool.",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: dieSizeTable as { level: number; count: number }[],
          dieType: dieType as "d8" | "d10" | "d12",
          dieSidesByLevel: dieSizeTable as { level: number; count: number }[],
        },
      },
      {
        class_name: "Warden",
        resource_key: "primal_manifestations",
        name: knownLegacy?.name?.replace(/\s+Known$/i, "") || "Primal Manifestations",
        description:
          knownLegacy?.description ||
          "Number of Primal Manifestations the Warden knows. A choice count, not a spendable pool. Swap one when you gain a Warden level.",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: knownTable as { level: number; count: number }[],
        },
      },
    ],
  }
}

/**
 * Sanitize KibblesTasty Warden imports:
 * - Remap primal_manifestations_known → primal_manifestations
 * - Ensure endurance_die_size special resource (pairs with endurance_dice)
 * - Primal Manifestations: class_knacks + resourceKey primal_manifestations; level-up swap only
 * - Warden Bond stays a short unlock blurb (bonds live in subclasses[])
 * - Manifestations are ability_role knack custom_abilities
 */
export function sanitizeKibblesWardenImportContent(content: ImportContent): ImportContent {
  if (!isKibblesTastyWarden(content)) return content

  let next = hoistNestedSubclasses(content)
  next = ensureResources(next)

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/^warden$/i.test(cls.name ?? "")) return cls
        const features = (cls.features ?? []).map((feat) => {
          if (/^warden bond$/i.test(feat.name ?? "")) {
            const { isChoice: _i, choices: _c, ...rest } = feat
            return rest
          }
          if (/^primal manifestations$/i.test(feat.name ?? "")) {
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
                category: "Primal Manifestation",
                count: prior?.count ?? 2,
                options: prior?.options ?? [],
                resourceKey: "primal_manifestations",
                optionsSource: "class_knacks" as const,
                swappableOnRest: false,
                choiceCountByLevel: priorCount?.length
                  ? priorCount
                  : [...KIBBLES_WARDEN_MANIFESTATIONS_BY_LEVEL],
              },
            }
          }
          return feat
        })
        return { ...cls, features }
      }),
    }
  }

  if (next.import_proposals?.custom_abilities?.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        custom_abilities: next.import_proposals.custom_abilities.map((ability) => {
          if (ability.ability_role != null && ability.ability_role !== "knack") return ability
          return {
            ...ability,
            ability_role: "knack",
            source_type: ability.source_type ?? "class",
            source_name: ability.source_name || "Warden",
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
        class_name: sc.class_name || "Warden",
      })),
    }
  }

  return next
}

export const KIBBLES_WARDEN_PRESETS: EnrichmentPreset[] = [
  {
    id: "kibbles_warden.class.warden_bond",
    pack: "kibbles_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^warden bond$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Warden Bond is the subclass unlock (Elemental Soul, Beasthide, Elderheart, Stoneblood, Sunwatcher, Ironbound, Dreadwing, Timetwister, Astral Guardian, Bone Binder). Short blurb only — bond features live in subclasses[] with class_name Warden. Do not emit stub isChoice options naming each bond, and do not emit \"Warden Bond Feature\" rows as base-class features.",
      },
    ],
  },
  {
    id: "kibbles_warden.class.primal_manifestations",
    pack: "kibbles_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^primal manifestations$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Primal Manifestations use optionsSource class_knacks + class_resources.primal_manifestations (special; never primal_manifestations_known). Swap one manifestation when you gain a Warden level — swappableOnRest false. Emit each manifestation as import_proposals.custom_abilities with ability_role knack. Distinct from Mage Hand Press Warden (Interrupt / Survive).",
      },
    ],
  },
  {
    id: "kibbles_warden.class.empowered_endurance",
    pack: "kibbles_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^empowered endurance$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Dump Stat sets endurance_dice uses.rechargeOnInitiative: 1 when this feature is present (regain one die on Initiative if none remain). Do not set initiative recharge from the level table alone.",
      },
    ],
  },
  {
    id: "kibbles_warden.class.endurance_dice",
    pack: "kibbles_warden",
    target: "class_feature",
    match: { className: /warden/i, name: /^endurance dice$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Endurance Dice column → class_resources.endurance_dice (at_level pool + dieSidesByLevel). Also emit endurance_die_size as a special die-size resource (d8→d10→d12). Not Mage Hand Press Interrupt.",
      },
    ],
  },
]
