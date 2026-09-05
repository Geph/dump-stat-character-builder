import { NECROMANCER_SPELLS_BY_LEVEL } from "@/lib/compendium/necromancer-spell-list"
import type { ImportContent } from "@/lib/import/content-schema"
import { MHP_CLASS_PRESENTATION } from "@/lib/seed-packs/mage-hand-press/class-presentation"
import type { UsesConfig } from "@/lib/types"

/**
 * Normalize Necromancer imports:
 * - Charnel Touch must be at_level + multiply_level (never bare type "multiply_level").
 * - Thralls is a control cap + grant_creature, not a class_upgrades picker.
 * - Spellcasting player picks come from classes[].spellcasting.progression, not
 *   duplicate spellChoiceGrants on the Spellcasting feature.
 * - Pin the official Necromancer spell list so import can tag matching catalog rows.
 */

const THRALL_COUNT_BY_LEVEL = [
  { level: 2, count: 1 },
  { level: 7, count: 3 },
  { level: 11, count: 4 },
  { level: 15, count: 5 },
  { level: 19, count: 6 },
] as const

const IMPROVED_THRALL_OPTIONS = [
  {
    name: "Avoidance",
    description:
      "If a thrall is subjected to an effect that allows a save for half damage, it takes no damage on a success and half damage on a failure.",
  },
  {
    name: "Necrotic Damage",
    description:
      "When a thrall deals Bludgeoning, Piercing, or Slashing damage, it can deal Necrotic damage instead.",
  },
  {
    name: "Turn Immunity",
    description:
      "Thralls have Immunity to the Charmed and Frightened conditions and to effects that turn Undead.",
  },
] as const

function classHasAuthoredSpellProgression(cls: {
  spellcasting?: { progression?: { cantrips?: number; prepared?: number }[] } | null
}): boolean {
  return (cls.spellcasting?.progression ?? []).some(
    (row) => (row.cantrips ?? 0) > 0 || (row.prepared ?? 0) > 0,
  )
}

function stripRedundantSpellcastingChoiceGrants<
  T extends {
    mechanics?: Array<{ kind?: string; spellChoiceGrants?: unknown; spellNames?: unknown[] }>
    linkedModifiers?: Array<{
      characteristics?: Array<{ type?: string; choiceGrants?: unknown; spells?: unknown[] }>
    }>
  },
>(feature: T): T {
  const mechanics = Array.isArray(feature.mechanics)
    ? feature.mechanics
        .map((mechanic) => {
          if (mechanic.kind !== "spells_known" || mechanic.spellChoiceGrants == null) {
            return mechanic
          }
          const { spellChoiceGrants: _grants, ...rest } = mechanic
          if (Array.isArray(rest.spellNames) && rest.spellNames.length > 0) return rest
          return null
        })
        .filter((row): row is NonNullable<typeof row> => row != null)
    : feature.mechanics

  const linkedModifiers = Array.isArray(feature.linkedModifiers)
    ? feature.linkedModifiers.map((mod) => {
        if (!Array.isArray(mod.characteristics)) return mod
        return {
          ...mod,
          characteristics: mod.characteristics
            .map((char) => {
              if (char.type !== "spells_known" || char.choiceGrants == null) return char
              const { choiceGrants: _grants, ...rest } = char
              if (Array.isArray(rest.spells) && rest.spells.length > 0) return rest
              return null
            })
            .filter((row): row is NonNullable<typeof row> => row != null),
        }
      })
    : feature.linkedModifiers

  return { ...feature, mechanics, linkedModifiers }
}

function stampThrallsGrantCount<
  T extends {
    mechanics?: Array<{ kind?: string; choiceCountByLevel?: unknown }>
    linkedModifiers?: Array<{
      characteristics?: Array<{ type?: string; countByLevel?: unknown }>
    }>
  },
>(feature: T): T {
  const mechanics = Array.isArray(feature.mechanics)
    ? feature.mechanics.map((mechanic) => {
        if (mechanic.kind !== "grant_creature") return mechanic
        if (Array.isArray(mechanic.choiceCountByLevel) && mechanic.choiceCountByLevel.length) {
          return mechanic
        }
        return { ...mechanic, choiceCountByLevel: [...THRALL_COUNT_BY_LEVEL] }
      })
    : feature.mechanics
  const linkedModifiers = Array.isArray(feature.linkedModifiers)
    ? feature.linkedModifiers.map((instance) => {
        if (!Array.isArray(instance.characteristics)) return instance
        return {
          ...instance,
          characteristics: instance.characteristics.map((char) => {
            if (char.type !== "grant_creature") return char
            if (Array.isArray(char.countByLevel) && char.countByLevel.length) return char
            return { ...char, countByLevel: [...THRALL_COUNT_BY_LEVEL] }
          }),
        }
      })
    : feature.linkedModifiers
  if (mechanics === feature.mechanics && linkedModifiers === feature.linkedModifiers) {
    return feature
  }
  return { ...feature, mechanics, linkedModifiers }
}

function stampImprovedThrallsCompanionScope<
  T extends {
    description?: string | null
    isChoice?: boolean
    choices?: {
      category?: string
      count?: number
      applyTo?: "self" | "companion"
      applyToCompanionFeature?: string | null
      options?: { name: string; description: string }[]
    }
    mechanics?: Array<{ kind?: string; conditions?: string[] }>
  },
>(feature: T): T {
  const existingOptions = feature.choices?.options ?? []
  const options =
    existingOptions.length > 0
      ? existingOptions
      : IMPROVED_THRALL_OPTIONS.map((option) => ({ ...option }))
  const mechanics = Array.isArray(feature.mechanics) ? [...feature.mechanics] : []
  if (!mechanics.some((row) => row.kind === "condition_immunity")) {
    mechanics.push({
      kind: "condition_immunity",
      conditions: ["Charmed", "Frightened"],
    })
  }
  return {
    ...feature,
    isChoice: false,
    choices: {
      category: feature.choices?.category || "Improved Thralls",
      count: 0,
      applyTo: "companion",
      applyToCompanionFeature: "Thralls",
      options,
    },
    mechanics,
  }
}

export function sanitizeNecromancerImportContent(content: ImportContent): ImportContent {
  const hasNecromancer = (content.classes ?? []).some((cls) => /necromancer/i.test(cls.name ?? ""))
  if (!hasNecromancer) return content

  let next: ImportContent = { ...content }

  const fixCharnel = <T extends { resource_key?: string; uses?: UsesConfig & { multiplier?: number } }>(
    row: T,
  ): T => {
    if (row.resource_key !== "charnel_touch") return row
    const uses = row.uses
    if (!uses) return row
    const looksWrong =
      (uses as { type?: string }).type === "multiply_level" ||
      (typeof (uses as { multiplier?: number }).multiplier === "number" &&
        uses.atLevelMode !== "multiply_level")
    if (!looksWrong && uses.type === "at_level" && uses.atLevelMode === "multiply_level") {
      return row
    }
    if (!looksWrong) return row
    const mult = (uses as { multiplier?: number }).multiplier ?? uses.atLevelTable?.[0]?.count ?? 5
    return {
      ...row,
      uses: {
        type: "at_level",
        atLevelMode: "multiply_level",
        atLevelTable: [{ level: 1, count: mult }],
        recharges: uses.recharges?.length ? uses.recharges : [{ rest: "long_rest" }],
      },
    }
  }

  if (next.class_resources?.length) {
    next = {
      ...next,
      class_resources: next.class_resources.map((row) => fixCharnel(row)),
    }
  }
  if (next.import_proposals?.class_resources?.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        class_resources: next.import_proposals.class_resources.map((row) => fixCharnel(row)),
      },
    }
  }

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/necromancer/i.test(cls.name ?? "")) return cls
        const officialList = Object.values(NECROMANCER_SPELLS_BY_LEVEL).flat()
        const existingList = (cls.spell_list ?? []).map((name) => String(name).trim()).filter(Boolean)
        const spellList = [...new Set([...existingList, ...officialList])]
        const presentation = MHP_CLASS_PRESENTATION.Necromancer
        return {
          ...cls,
          spell_list: spellList,
          card_blurb: cls.card_blurb?.trim() || presentation.card_blurb,
          creator_url: cls.creator_url?.trim() || presentation.creator_url,
          features: (cls.features ?? []).map((feature) => {
            let nextFeature = feature
            if (/^thralls$/i.test(feature.name ?? "")) {
              nextFeature = stampThrallsGrantCount(nextFeature)
            }
            if (/^improved thralls$/i.test(feature.name ?? "")) {
              nextFeature = stampImprovedThrallsCompanionScope(nextFeature)
            }
            if (/^thralls$/i.test(nextFeature.name ?? "") && (nextFeature.choices || nextFeature.isChoice)) {
              const { isChoice: _c, choices: _ch, ...rest } = nextFeature
              nextFeature = {
                ...rest,
                description: [
                  nextFeature.description ?? "",
                  "Thralls / CR Total are control caps (special resources), not a pick-N upgrade catalog. Choose thrall types via grant_creature / creatures[] (Skeleton, Spirit, Zombie, …).",
                ]
                  .filter(Boolean)
                  .join("\n\n")
                  .trim(),
              }
            }
            if (
              /^spellcasting$/i.test(nextFeature.name ?? "") &&
              classHasAuthoredSpellProgression(cls)
            ) {
              nextFeature = stripRedundantSpellcastingChoiceGrants(nextFeature)
            }
            return nextFeature
          }),
        }
      }),
    }
  }

  return next
}
