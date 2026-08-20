import { filterAvailableDefaultCardImageUrl } from "@/lib/compendium/available-card-art"
import { withBasePath } from "@/lib/config/deploy-mode"

const classCardImage = (slug: string) => withBasePath(`/images/compendium/classes/${slug}.png`)

/**
 * Default card art for classes — files live under public/images/compendium/classes/.
 * Includes SRD / 2024 PHB plus Artificer, KibblesTasty Inventor / Occultist / Psion / Warden.
 */
export const SRD_CLASS_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Artificer: classCardImage("artificer"),
  Barbarian: classCardImage("barbarian"),
  Bard: classCardImage("bard"),
  Cleric: classCardImage("cleric"),
  Druid: classCardImage("druid"),
  Fighter: classCardImage("fighter"),
  Inventor: classCardImage("inventor"),
  Monk: classCardImage("monk"),
  Occultist: classCardImage("occultist"),
  Paladin: classCardImage("paladin"),
  Psion: classCardImage("psion"),
  Ranger: classCardImage("ranger"),
  Rogue: classCardImage("rogue"),
  Sorcerer: classCardImage("sorcerer"),
  Warlock: classCardImage("warlock"),
  Wizard: classCardImage("wizard"),
  // KibblesTasty Warden — bare name (legacy rows) and collision-labeled seed name.
  Warden: classCardImage("warden-kibbles"),
  "Warden (Kibbles Tasty)": classCardImage("warden-kibbles"),
}

export function defaultClassCardImageUrl(className: string): string | null {
  return filterAvailableDefaultCardImageUrl(SRD_CLASS_CARD_IMAGES_BY_NAME[className] ?? null)
}
