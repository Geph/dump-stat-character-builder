export type PsionElement = "cold" | "fire" | "lightning"

const ELEMENT_ALIASES: Record<string, PsionElement> = {
  cold: "cold",
  fire: "fire",
  lightning: "lightning",
  ice: "cold",
  frost: "cold",
  flame: "fire",
  thunder: "lightning",
  shock: "lightning",
}

/** Resolve Elemental Mind (or similar) build-time element specialization from feature picks. */
export function resolveSpecializedElement(
  featureChoicePicks: Record<string, string[]> | null | undefined,
): PsionElement | null {
  if (!featureChoicePicks) return null

  for (const [key, picks] of Object.entries(featureChoicePicks)) {
    if (!/special/i.test(key) && !/element/i.test(key) && !/primordial/i.test(key)) continue
    const pick = picks[0]?.trim().toLowerCase()
    if (!pick) continue
    for (const [alias, element] of Object.entries(ELEMENT_ALIASES)) {
      if (pick.includes(alias)) return element
    }
  }

  for (const picks of Object.values(featureChoicePicks)) {
    const pick = picks[0]?.trim().toLowerCase()
    if (!pick) continue
    if (/specializ/i.test(pick)) {
      for (const [alias, element] of Object.entries(ELEMENT_ALIASES)) {
        if (pick.includes(alias)) return element
      }
    }
  }

  return null
}

export function elementMatchesSpecialization(
  specialized: PsionElement | null,
  featureElement: PsionElement | string | null | undefined,
): boolean {
  if (!specialized || !featureElement) return false
  const normalized =
    typeof featureElement === "string"
      ? ELEMENT_ALIASES[featureElement.trim().toLowerCase()] ?? null
      : featureElement
  return normalized === specialized
}

/** Whether a psi cost should be waived for the character's element specialization. */
export function shouldWaivePsiCostForSpecialization(params: {
  specializedElement: PsionElement | null
  featureElement: PsionElement | string | null | undefined
  waiveWhenSpecializedElement?: PsionElement | null
}): boolean {
  if (!params.waiveWhenSpecializedElement) return false
  return (
    params.specializedElement === params.waiveWhenSpecializedElement &&
    elementMatchesSpecialization(params.specializedElement, params.featureElement ?? params.waiveWhenSpecializedElement)
  )
}
