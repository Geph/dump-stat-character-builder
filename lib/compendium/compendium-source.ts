/** Compendium source label for privately entered Player's Handbook content (not in SRD seed). */
export const PHB_SOURCE = "Player's Handbook"

export function isPhbSource(source: string | null | undefined): boolean {
  return source === PHB_SOURCE
}

/**
 * Non-SRD species modifier presets in `enrich-custom-species.ts` are keyed by species
 * and trait names (e.g. `Changeling::Shape-Shifter`). Create compendium species rows
 * locally with matching trait names; any non-SRD source label works.
 *
 * Non-SRD feat presets in `custom-feat-modifier-presets.ts` are keyed by feat name
 * (e.g. `Actor`, `Fey Touched`). Create compendium feat rows locally with matching names.
 */
