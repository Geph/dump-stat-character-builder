import type { WeaponSheetAppliedModifier } from "@/lib/compendium/weapon-sheet-context"
import type { Feat } from "@/lib/types"

/** Apply presentation only after weapon eligibility has been resolved. */
export function groupFeatWeaponBadges(
  modifiers: WeaponSheetAppliedModifier[],
  feats: Pick<Feat, "id" | "name" | "description">[],
): WeaponSheetAppliedModifier[] {
  const byId = new Map(feats.map((feat) => [feat.id, feat]))
  const grouped = new Map<string, WeaponSheetAppliedModifier>()
  const result: WeaponSheetAppliedModifier[] = []
  for (const modifier of modifiers) {
    const feat = modifier.sourceType === "feat" && modifier.sourceId
      ? byId.get(modifier.sourceId)
      : undefined
    if (!feat) {
      result.push(modifier)
      continue
    }
    const fullDescription = feat.description?.trim()
    const detail = modifier.name === modifier.description
      ? modifier.description
      : `${modifier.name}: ${modifier.description}`
    const existing = grouped.get(feat.id)
    if (existing) {
      if (!fullDescription) existing.description += `\n\n${detail}`
      continue
    }
    const badge = { ...modifier, name: feat.name, description: fullDescription || detail }
    grouped.set(feat.id, badge)
    result.push(badge)
  }
  return result
}
