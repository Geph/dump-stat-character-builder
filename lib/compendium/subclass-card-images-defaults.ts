import { withBasePath } from "@/lib/config/deploy-mode"

const subclassCardImage = (slug: string) => withBasePath(`/images/compendium/subclasses/${slug}.png`)

/** Default card art for SRD subclasses — files live under public/images/compendium/subclasses/. */
export const SRD_SUBCLASS_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Champion: subclassCardImage("champion"),
  "Circle of the Land": subclassCardImage("circle-of-the-land"),
  "College of Lore": subclassCardImage("college-of-lore"),
  "Draconic Sorcery": subclassCardImage("draconic-sorcery"),
  Evoker: subclassCardImage("evoker"),
  "Fiend Patron": subclassCardImage("fiend-patron"),
  Hunter: subclassCardImage("hunter"),
  "Life Domain": subclassCardImage("life-domain"),
  "Oath of Devotion": subclassCardImage("oath-of-devotion"),
  "Path of the Berserker": subclassCardImage("path-of-the-berserker"),
  Thief: subclassCardImage("thief"),
  "Warrior of the Open Hand": subclassCardImage("warrior-of-the-open-hand"),
}

export function defaultSubclassCardImageUrl(subclassName: string): string | null {
  return SRD_SUBCLASS_CARD_IMAGES_BY_NAME[subclassName] ?? null
}
