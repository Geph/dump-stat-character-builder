/**
 * Curated Kibbles'Tasty species / background presentation (icons + source details).
 * Sourced from the local default load set.
 */
export type KibblesRowPresentation = {
  icon?: string | null
  creator_url: string
}

export const KIBBLES_CREATOR_URL = "https://www.kthomebrew.com/"

export const KIBBLES_SPECIES_PRESENTATION: Record<string, KibblesRowPresentation> = {
  Augmented: { icon: "mechanical-arm", creator_url: KIBBLES_CREATOR_URL },
  "Awakened Undead": { icon: "surprised-skull", creator_url: KIBBLES_CREATOR_URL },
  Farling: { icon: "alien-bug", creator_url: KIBBLES_CREATOR_URL },
  Ironwrought: { icon: "robot-helmet", creator_url: KIBBLES_CREATOR_URL },
  Warped: { icon: "tentacles-skull", creator_url: KIBBLES_CREATOR_URL },
}

export const KIBBLES_BACKGROUND_PRESENTATION: Record<string, KibblesRowPresentation> = {
  Apothecary: { icon: "cauldron", creator_url: KIBBLES_CREATOR_URL },
  Engineer: { icon: "monkey-wrench", creator_url: KIBBLES_CREATOR_URL },
  Tinker: { icon: "screwdriver", creator_url: KIBBLES_CREATOR_URL },
}

export const KIBBLES_SPECIES_ICONS_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(KIBBLES_SPECIES_PRESENTATION)
    .filter(([, value]) => typeof value.icon === "string" && value.icon.trim())
    .map(([name, value]) => [name, value.icon!.trim()]),
)

export function applyKibblesRowPresentation<T extends Record<string, unknown>>(
  row: T,
  presentationByName: Record<string, KibblesRowPresentation>,
  options?: { overwrite?: boolean },
): T {
  const name = String(row.name ?? "").trim()
  const presentation = presentationByName[name]
  if (!presentation) return row

  const overwrite = options?.overwrite === true
  const next: Record<string, unknown> = { ...row }
  if (typeof presentation.icon === "string" && presentation.icon.trim()) {
    if (overwrite || !(typeof next.icon === "string" && next.icon.trim())) {
      next.icon = presentation.icon.trim()
    }
  }
  if (presentation.creator_url) {
    if (overwrite || !(typeof next.creator_url === "string" && next.creator_url.trim())) {
      next.creator_url = presentation.creator_url
    }
  }
  return next as T
}
