import type { ImportContent } from "@/lib/import/content-schema"
import type { UsesConfig } from "@/lib/types"

/**
 * Normalize Necromancer imports:
 * - Charnel Touch must be at_level + multiply_level (never bare type "multiply_level").
 * - Thralls is a control cap + grant_creature, not a class_upgrades picker.
 */
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
        return {
          ...cls,
          features: (cls.features ?? []).map((feature) => {
            if (!/^thralls$/i.test(feature.name ?? "")) return feature
            if (!feature.choices && !feature.isChoice) return feature
            const { isChoice: _c, choices: _ch, ...rest } = feature
            return {
              ...rest,
              description: [
                feature.description ?? "",
                "Thralls / CR Total are control caps (special resources), not a pick-N upgrade catalog. Choose thrall types via grant_creature / creatures[] (Skeleton, Spirit, Zombie, …).",
              ]
                .filter(Boolean)
                .join("\n\n")
                .trim(),
            }
          }),
        }
      }),
    }
  }

  return next
}
