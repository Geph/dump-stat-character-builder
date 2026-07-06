import { withBasePath } from "@/lib/config/deploy-mode"

const speciesCardImage = (slug: string) => withBasePath(`/images/compendium/species/${slug}.png`)

/** Default card art for species — files live under public/images/compendium/species/. */
export const SPECIES_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Aarakocra: speciesCardImage("aarakocra"),
  Aasimar: speciesCardImage("aasimar"),
  Centaur: speciesCardImage("centaur"),
  Changeling: speciesCardImage("changeling"),
  Dhampir: speciesCardImage("dhampir"),
  Dragonborn: speciesCardImage("dragonborn"),
  Dwarf: speciesCardImage("dwarf"),
  Elf: speciesCardImage("elf"),
  Gnome: speciesCardImage("gnome"),
  Goliath: speciesCardImage("goliath"),
  Halfling: speciesCardImage("halfling"),
  Hexblood: speciesCardImage("hexblood"),
  Human: speciesCardImage("human"),
  Kalashtar: speciesCardImage("kalashtar"),
  Khoravar: speciesCardImage("khoravar"),
  Lupin: speciesCardImage("lupin"),
  Orc: speciesCardImage("orc"),
  Reborn: speciesCardImage("reborn"),
  Shifter: speciesCardImage("shifter"),
  Tabaxi: speciesCardImage("tabaxi"),
  Tiefling: speciesCardImage("tiefling"),
  Warforged: speciesCardImage("warforged"),
}

/** SRD 2024 species that ship with bundled card art. */
export const SRD_SPECIES_CARD_IMAGE_NAMES = [
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Goliath",
  "Halfling",
  "Human",
  "Orc",
  "Tiefling",
] as const

export function defaultSpeciesCardImageUrl(speciesName: string): string | null {
  return SPECIES_CARD_IMAGES_BY_NAME[speciesName] ?? null
}
