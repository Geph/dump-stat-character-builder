import { withBasePath } from "@/lib/config/deploy-mode"

const speciesCardImage = (slug: string) => withBasePath(`/images/compendium/species/${slug}.png`)

/**
 * Default card art for species — files live under public/images/compendium/species/.
 * Matched by species **name** on import (any source).
 * Aasimar / Changeling: plain name (and "(2024)") use 2024 art; "(2014)" uses the legacy portrait.
 * Parenthetical lineage tags (e.g. `(Bugbear)`, `(Merfolk)`) fall back to the base name.
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
  "Dhakaani Ghaal'Dar": speciesCardImage("dhakaani-ghaaldar"),
  "Dhakaani Golin'dar": speciesCardImage("dhakaani-golindar"),
  "Dhakanni Golin'dar": speciesCardImage("dhakaani-golindar"),
  "Dhakaani Guul'dar": speciesCardImage("dhakaani-guuldar"),
  "Dhakaani Guul'dar (Bugbear)": speciesCardImage("dhakaani-guuldar"),
  Dhampir: speciesCardImage("dhampir"),
  Dragonborn: speciesCardImage("dragonborn"),
  Duergar: speciesCardImage("duergar"),
  Dwarf: speciesCardImage("dwarf"),
  Eladrin: speciesCardImage("eladrin"),
  Elf: speciesCardImage("elf"),
  Fairy: speciesCardImage("fairy"),
  Giff: speciesCardImage("giff"),
  Githzerai: speciesCardImage("githzerai"),
  Gnoll: speciesCardImage("gnoll"),
  Gnome: speciesCardImage("gnome"),
  Goliath: speciesCardImage("goliath"),
  Hadozee: speciesCardImage("hadozee"),
  Halfling: speciesCardImage("halfling"),
  Hexblood: speciesCardImage("hexblood"),
  Human: speciesCardImage("human"),
  "Jhorgun'taal": speciesCardImage("jhorguntaal"),
  Kalashtar: speciesCardImage("kalashtar"),
  "Kalamer Landwalker Merfolk": speciesCardImage("kalamer-landwalker-merfolk"),
  "Kalamer Landwalker (Merfolk)": speciesCardImage("kalamer-landwalker-merfolk"),
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

/** Trailing edition year on import names, e.g. `Aasimar (2024)`. */
const SPECIES_YEAR_SUFFIX_RE = /^(.*?)\s*\(((?:19|20)\d{2})\)\s*$/

/** Trailing lineage / subtype tag, e.g. `Dhakaani Guul'dar (Bugbear)`. */
const SPECIES_PAREN_SUFFIX_RE = /^(.*?)\s*\([^)]+\)\s*$/u

export function defaultSpeciesCardImageUrl(speciesName: string): string | null {
  const trimmed = speciesName.trim()
  if (!trimmed) return null

  const exact = SPECIES_CARD_IMAGES_BY_NAME[trimmed]
  if (exact) return exact

  const yearMatch = trimmed.match(SPECIES_YEAR_SUFFIX_RE)
  if (yearMatch) {
    const base = yearMatch[1]!.trim()
    const year = yearMatch[2]!
    if (base) {
      const yearKeyed = SPECIES_CARD_IMAGES_BY_NAME[`${base} (${year})`]
      if (yearKeyed) return yearKeyed
      const baseKeyed = SPECIES_CARD_IMAGES_BY_NAME[base]
      if (baseKeyed) return baseKeyed
    }
  }

  const parenMatch = trimmed.match(SPECIES_PAREN_SUFFIX_RE)
  if (parenMatch) {
    const base = parenMatch[1]!.trim()
    if (base) {
      const baseKeyed = SPECIES_CARD_IMAGES_BY_NAME[base]
      if (baseKeyed) return baseKeyed
    }
  }

  return null
}
