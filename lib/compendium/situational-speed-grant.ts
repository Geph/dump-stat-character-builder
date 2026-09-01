import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { expandLegacyLimitations } from "@/lib/compendium/modifier-limitations"

/** Spend-a-die / this-turn speed — not a standing Speed-box grant. */
export const SITUATIONAL_SPEED_GRANT_RE =
  /\[maneuver\]|\buntil the end of (?:your|the) (?:current )?turn\b/i

export function looksLikeSituationalSpeedGrant(
  featureName: string | null | undefined,
  text: string | null | undefined,
): boolean {
  return SITUATIONAL_SPEED_GRANT_RE.test(`${featureName ?? ""} ${text ?? ""}`)
}

function taggedSourceHaystack(mod: CharacteristicModifier): string {
  const tagged = (
    mod as CharacteristicModifier & {
      _contributionSource?: { label?: string; source?: string }
    }
  )._contributionSource
  return [mod.label, tagged?.label, tagged?.source].filter(Boolean).join(" ")
}

/**
 * True when a speed modifier is a maneuver / this-turn rider with no sheet toggle.
 * Those belong on the action card, not the always-on Speed overlay.
 */
export function isUngatedSituationalSpeedGrant(mod: CharacteristicModifier): boolean {
  if (mod.type !== "speed") return false
  if (expandLegacyLimitations(mod).some((entry) => entry.kind === "sheet_toggle")) return false
  return looksLikeSituationalSpeedGrant(taggedSourceHaystack(mod), "")
}
