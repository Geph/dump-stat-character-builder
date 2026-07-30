import type { CharacterClassDetail } from "@/lib/character/character-classes"

/** +PB to one creature's temp HP when granted by a psionic power (Transcended Mind). */
export function perfectedEnhancementBonus(params: {
  classDetails: CharacterClassDetail[]
  proficiencyBonus: number
}): number {
  const known = params.classDetails.some((entry) =>
    ((entry.subclass?.features ?? []) as { name?: string; level?: number }[]).some(
      (feature) =>
        /^perfected enhancement$/i.test(feature.name ?? "") &&
        (feature.level == null || feature.level <= (entry.row.level ?? 1)),
    ),
  )
  if (!known) return 0
  return Math.max(0, params.proficiencyBonus)
}

export function isPsionicPowerAbilityRole(role: string | null | undefined): boolean {
  return role === "psionic_power"
}
