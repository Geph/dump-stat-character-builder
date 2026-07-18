import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import {
  resolveTierCountAtLevel,
  resolveUsesAtLevel,
  type ResolveUsesContext,
} from "@/lib/compendium/resolve-uses-config"

/** Highest Psi Limit cap across class levels (KibblesTasty Psion per-activation augment cap). */
export function resolvePsiLimit(
  classDetails: CharacterClassDetail[],
  ctx: ResolveUsesContext = {},
): number | null {
  let best: number | null = null
  for (const entry of classDetails) {
    if (!entry.class) continue
    const resources = resolveClassResourcesForClass(entry.class)
    const psiLimit = resources.find((resource) => resource.id === "psi_limit")
    if (!psiLimit) continue
    const fromUses = resolveUsesAtLevel(psiLimit.uses, entry.row.level, ctx)
    const fromTable =
      psiLimit.uses.type === "special"
        ? resolveTierCountAtLevel(psiLimit.uses.atLevelTable, entry.row.level)
        : null
    const max = fromUses ?? fromTable
    if (max != null && (best == null || max > best)) best = max
  }
  return best
}
