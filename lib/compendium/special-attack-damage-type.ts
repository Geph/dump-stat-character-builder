import type { SpecialAttackCharacteristic } from "@/lib/compendium/characteristic-modifiers"

export function specialAttackChoosesDamageType(
  attack: Pick<SpecialAttackCharacteristic, "chooseDamageType" | "damageTypes">,
): boolean {
  return Boolean(attack.chooseDamageType) && (attack.damageTypes?.length ?? 0) > 1
}

/** Card / roll label for authored types. Choice attacks use "or"; combined types use the first. */
export function formatSpecialAttackDamageTypes(
  types: readonly string[] | null | undefined,
  chooseOne?: boolean | null,
): string {
  const cleaned = (types ?? []).map((type) => type.trim()).filter(Boolean)
  if (!cleaned.length) return ""
  if (!chooseOne || cleaned.length === 1) return cleaned[0] ?? ""
  if (cleaned.length === 2) return `${cleaned[0]} or ${cleaned[1]}`
  return `${cleaned.slice(0, -1).join(", ")}, or ${cleaned[cleaned.length - 1]}`
}
