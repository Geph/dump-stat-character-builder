import { NECROMANCER_SPELLS_BY_LEVEL } from "@/lib/compendium/necromancer-spell-list"
import type { ImportContent } from "@/lib/import/content-schema"
import type { UsesConfig } from "@/lib/types"

/**
 * Normalize Necromancer imports:
 * - Charnel Touch must be at_level + multiply_level (never bare type "multiply_level").
 * - Thralls is a control cap + grant_creature, not a class_upgrades picker.
 * - Spellcasting player picks come from classes[].spellcasting.progression, not
 *   duplicate spellChoiceGrants on the Spellcasting feature.
 * - Pin the official Necromancer spell list so import can tag matching catalog rows.
 */

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
        return {
          ...cls,
          spell_list: spellList,
          features: (cls.features ?? []).map((feature) => {
            let nextFeature = feature
            if (/^thralls$/i.test(feature.name ?? "") && (feature.choices || feature.isChoice)) {
              const { isChoice: _c, choices: _ch, ...rest } = feature
              nextFeature = {
                ...rest,
                description: [
                  feature.description ?? "",
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
