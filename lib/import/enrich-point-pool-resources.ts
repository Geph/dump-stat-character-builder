import { usesPointPoolSpellcasting } from "@/lib/character/point-pool-spellcasting"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import type { Feature, UsesConfig } from "@/lib/types"

const POINT_POOL_RESOURCE_KEYS = new Set(["sorcery_points", "spell_limit"])

/** Prefix sorcery_points / spell_limit for homebrew point-pool classes (not SRD Sorcerer). */
export function remapPointPoolResourceKey(className: string, resourceKey: string): string {
  if (className === "Sorcerer" || !POINT_POOL_RESOURCE_KEYS.has(resourceKey)) return resourceKey
  return prefixedResourceKey(slugClassPrefix(className), resourceKey)
}

function hasSorcerousRegeneration(features: Feature[]): boolean {
  return features.some((feature) => /^sorcerous regeneration$/i.test(feature.name.trim()))
}

function withSorcerousRegenerationRecharge(uses: UsesConfig): UsesConfig {
  const recharges = [...(uses.recharges ?? (uses.recharge ? [{ rest: uses.recharge }] : []))]
  const hasShort = recharges.some((rule) => "rest" in rule && rule.rest === "short_rest")
  if (!hasShort) {
    recharges.push({
      rest: "short_rest",
      amountFormula: "half_class_level_round_up",
      maxPerLongRest: 1,
    })
  }
  return { ...uses, recharges, recharge: undefined }
}

/** Align imported class_resources keys and Sorcerous Regeneration recharge with point-pool spellcasting. */
export function enrichPointPoolClassResources(
  className: string,
  spellcasting: unknown,
  features: Feature[],
  resources: ClassResourceImportRow[],
): ClassResourceImportRow[] {
  const hasPointPool =
    usesPointPoolSpellcasting(spellcasting as import("@/lib/types").DndClass["spellcasting"]) ||
    /alternate sorcerer/i.test(className)

  if (!hasPointPool) return resources

  const sorcerousRegen = hasSorcerousRegeneration(features)

  return resources.map((row) => {
    if (row.class_name !== className) return row
    const resourceKey = remapPointPoolResourceKey(className, row.resource_key)
    let uses = row.uses
    if (
      sorcerousRegen &&
      /sorcery\s*points?/i.test(row.name) &&
      resourceKey.endsWith("sorcery_points")
    ) {
      uses = withSorcerousRegenerationRecharge(uses)
    }
    if (resourceKey === row.resource_key && uses === row.uses) return row
    return { ...row, resource_key: resourceKey, uses }
  })
}
