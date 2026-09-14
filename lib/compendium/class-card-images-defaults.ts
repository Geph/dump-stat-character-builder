import {
  maybeFilterDefaultCardImageUrl,
  type DefaultCardImageAvailability,
} from "@/lib/compendium/available-card-art"
import { withBasePath } from "@/lib/config/deploy-mode"

const classCardImage = (slug: string) => withBasePath(`/images/compendium/classes/${slug}.png`)

/**
 * Default card art for classes — files live under public/images/compendium/classes/.
 * SRD names always resolve when bundled. Mage Hand Press class portraits ship with
 * the seed pack. Kibbles Inventor / Occultist / Psion / Warden (and Artificer)
 * assign when the PNG is present locally (or already tracked historically).
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
  // Mage Hand Press base classes
  Alchemist: classCardImage("alchemist"),
  Captain: classCardImage("captain"),
  Craftsman: classCardImage("craftsman"),
  Dancer: classCardImage("dancer"),
  Gunslinger: classCardImage("gunslinger"),
  Investigator: classCardImage("investigator"),
  Martyr: classCardImage("martyr"),
  Necromancer: classCardImage("necromancer"),
  Vagabond: classCardImage("vagabond"),
  Warmage: classCardImage("warmage"),
  Witch: classCardImage("witch"),
  "Warden (Mage Hand Press)": classCardImage("warden"),
}

export function defaultClassCardImageUrl(
  className: string,
  options?: DefaultCardImageAvailability,
): string | null {
  return maybeFilterDefaultCardImageUrl(
    SRD_CLASS_CARD_IMAGES_BY_NAME[className] ?? null,
    options?.requireAvailable !== false,
  )
}
