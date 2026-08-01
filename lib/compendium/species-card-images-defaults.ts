import { withBasePath } from "@/lib/config/deploy-mode"

const speciesCardImage = (slug: string) => withBasePath(`/images/compendium/species/${slug}.png`)

/**
 * Default card art for species — files live under public/images/compendium/species/.
 * Matched by species **name** on import (any source).
 * Aasimar / Changeling: plain name (and "(2024)") use 2024 art; "(2014)" uses the legacy portrait.
 */
export const SPECIES_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Aarakocra: speciesCardImage("aarakocra"),
  Aasimar: speciesCardImage("aasimar"),
  "Aasimar (2014)": speciesCardImage("aasimar-2014"),
  "Aasimar (2024)": speciesCardImage("aasimar"),
  "Astral Elf": speciesCardImage("astral-elf"),
  Autognome: speciesCardImage("autognome"),
  Bugbear: speciesCardImage("bugbear"),
  Centaur: speciesCardImage("centaur"),
  Changeling: speciesCardImage("changeling"),
  "Changeling (2014)": speciesCardImage("changeling-2014"),
  "Changeling (2024)": speciesCardImage("changeling"),
  "Deep Gnome": speciesCardImage("deep-gnome"),
  Dhampir: speciesCardImage("dhampir"),
  Dragonborn: speciesCardImage("dragonborn"),
  Dwarf: speciesCardImage("dwarf"),
  Eladrin: speciesCardImage("eladrin"),
  Elf: speciesCardImage("elf"),
  Giff: speciesCardImage("giff"),
  Githzerai: speciesCardImage("githzerai"),
  Gnome: speciesCardImage("gnome"),
  Goliath: speciesCardImage("goliath"),
  Hadozee: speciesCardImage("hadozee"),
  Halfling: speciesCardImage("halfling"),
  Hexblood: speciesCardImage("hexblood"),
  Human: speciesCardImage("human"),
  Kalashtar: speciesCardImage("kalashtar"),
  Khoravar: speciesCardImage("khoravar"),
  Lupin: speciesCardImage("lupin"),
  Orc: speciesCardImage("orc"),
  Plasmoid: speciesCardImage("plasmoid"),
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
  return SPECIES_CARD_IMAGES_BY_NAME[speciesName.trim()] ?? null
}
