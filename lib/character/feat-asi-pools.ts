import { isAsiFeat, ASI_POINTS_PER_PICK } from "@/lib/builder/asi-allocation"
import type { AbilityScorePoolGrant } from "@/lib/builder/ability-score-pools"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  effectiveLinkedModifiers,
  resolveLinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Feat } from "@/lib/types"

/**
 * ASI pools carried on a feat's linked modifiers (Ability Score Improvement = 2 points;
 * half-feats = usually 1). Falls back to a 2-point pool when the feat is named ASI but the
 * modifiers were not enriched yet. When a catalog is provided, resolve catalog-only refs
 * the same way the builder does.
 */
export function collectAsiPoolsFromFeat(
  feat: Feat,
  allocationKeyPrefix: string,
  catalog: ModifierCatalogEntry[] = [],
): AbilityScorePoolGrant[] {
  const grants: AbilityScorePoolGrant[] = []
  const sourceLabel = `Feat · ${feat.name}`
  const instances = effectiveLinkedModifiers(feat.linkedModifiers, feat.modifierRefs, catalog)

  for (const instance of instances) {
    const { characteristics } = resolveLinkedModifierInstance(instance, catalog)
    for (const mod of characteristics) {
      if (mod.type !== "ability_scores" || mod.mode !== "asi_pool") continue
      grants.push({
        allocationKey: `${allocationKeyPrefix}::ref::${instance.catalogRefId ?? "ability_scores"}::${mod.id}`,
        label: mod.label?.trim() || sourceLabel,
        sourceLabel,
        points: mod.points ?? ASI_POINTS_PER_PICK,
        ...(mod.allowedAbilities?.length
          ? { allowedAbilities: mod.allowedAbilities as AbilityScoreKey[] }
          : {}),
      })
    }
  }

  if (!grants.length && isAsiFeat(feat)) {
    grants.push({
      allocationKey: `${allocationKeyPrefix}::asi`,
      label: "Ability Score Improvement",
      sourceLabel,
      points: ASI_POINTS_PER_PICK,
    })
  }

  return grants
}
