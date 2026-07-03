import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"

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
    const max = resolveUsesAtLevel(psiLimit.uses, entry.row.level, ctx)
    if (max != null && (best == null || max > best)) best = max
  }
  return best
}
