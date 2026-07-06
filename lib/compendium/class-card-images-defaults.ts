import { withBasePath } from "@/lib/config/deploy-mode"

const classCardImage = (slug: string) => withBasePath(`/images/compendium/classes/${slug}.png`)

/** Default card art for SRD classes — files live under public/images/compendium/classes/. */
export const SRD_CLASS_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Barbarian: classCardImage("barbarian"),
  Bard: classCardImage("bard"),
  Cleric: classCardImage("cleric"),
  Druid: classCardImage("druid"),
  Fighter: classCardImage("fighter"),
  Monk: classCardImage("monk"),
  Paladin: classCardImage("paladin"),
  Ranger: classCardImage("ranger"),
  Rogue: classCardImage("rogue"),
  Sorcerer: classCardImage("sorcerer"),
  Warlock: classCardImage("warlock"),
  Wizard: classCardImage("wizard"),
}

export function defaultClassCardImageUrl(className: string): string | null {
  return SRD_CLASS_CARD_IMAGES_BY_NAME[className] ?? null
}
