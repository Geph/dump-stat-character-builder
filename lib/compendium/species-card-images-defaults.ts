import { withBasePath } from "@/lib/config/deploy-mode"

const speciesCardImage = (slug: string) => withBasePath(`/images/compendium/species/${slug}.png`)

/**
 * Default card art for species — files live under public/images/compendium/species/.
 * Matched by species **name** on import (any source).
 *
 * Aasimar / Changeling:
 * - plain name and "(2024)" → 2024 PHB/Eberron art (`aasimar` / `changeling`)
 * - "(2022)" → MotM portrait (`*-2022`; formerly mislabeled 2014)
 * - "(2014)" aliases MotM art until distinct Volo’s-era portraits are added
 *
 * Parenthetical lineage tags (e.g. `(Bugbear)`, `(Merfolk)`) fall back to the base name.
 * Lookup is case-insensitive so import capitalization drifts still resolve.
 */
export const SPECIES_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Aarakocra: speciesCardImage("aarakocra"),
  Aasimar: speciesCardImage("aasimar"),
  "Aasimar (2014)": speciesCardImage("aasimar-2022"),
  "Aasimar (2022)": speciesCardImage("aasimar-2022"),
  "Aasimar (2024)": speciesCardImage("aasimar"),
  "Air Genasi": speciesCardImage("air-genasi"),
  "Astral Elf": speciesCardImage("astral-elf"),
  Autognome: speciesCardImage("autognome"),
  Boggart: speciesCardImage("boggarts"),
  Boggarts: speciesCardImage("boggarts"),
  Bugbear: speciesCardImage("bugbear"),
  Centaur: speciesCardImage("centaur"),
  Changeling: speciesCardImage("changeling"),
  "Changeling (2014)": speciesCardImage("changeling-2022"),
  "Changeling (2022)": speciesCardImage("changeling-2022"),
  "Changeling (2024)": speciesCardImage("changeling"),
  "Deep Gnome": speciesCardImage("deep-gnome"),
  // Import uses lowercase apostrophe-d (Ghaal'dar); keep capital-D as a legacy alias.
  "Dhakaani Ghaal'dar": speciesCardImage("dhakaani-ghaaldar"),
  "Dhakaani Ghaal'Dar": speciesCardImage("dhakaani-ghaaldar"),
  "Dhakaani Ghaal'dar (Hobgoblin)": speciesCardImage("dhakaani-ghaaldar"),
  "Dhakaani Golin'dar": speciesCardImage("dhakaani-golindar"),
  "Dhakanni Golin'dar": speciesCardImage("dhakaani-golindar"),
  "Dhakaani Golin'dar (Goblin)": speciesCardImage("dhakaani-golindar"),
  "Dhakaani Guul'dar": speciesCardImage("dhakaani-guuldar"),
  "Dhakaani Guul'dar (Bugbear)": speciesCardImage("dhakaani-guuldar"),
  Dhampir: speciesCardImage("dhampir"),
  Dragonborn: speciesCardImage("dragonborn"),
  Duergar: speciesCardImage("duergar"),
  Dwarf: speciesCardImage("dwarf"),
  "Earth Genasi": speciesCardImage("earth-genasi"),
  Eladrin: speciesCardImage("eladrin"),
  Elf: speciesCardImage("elf"),
  Fairy: speciesCardImage("fairy"),
  Firbolg: speciesCardImage("firbolg"),
  "Fire Genasi": speciesCardImage("fire-genasi"),
  Flamekin: speciesCardImage("flamekin"),
  "Genasi: Air": speciesCardImage("air-genasi"),
  "Genasi: Earth": speciesCardImage("earth-genasi"),
  "Genasi: Fire": speciesCardImage("fire-genasi"),
  "Genasi: Water": speciesCardImage("water-genasi"),
  Giff: speciesCardImage("giff"),
  Githyanki: speciesCardImage("githyanki"),
  Githzerai: speciesCardImage("githzerai"),
  Gnoll: speciesCardImage("gnoll"),
  Gnome: speciesCardImage("gnome"),
  Goblin: speciesCardImage("goblin-2022"),
  "Goblin (2014)": speciesCardImage("goblin-2022"),
  "Goblin (2022)": speciesCardImage("goblin-2022"),
  Goliath: speciesCardImage("goliath"),
  Hadozee: speciesCardImage("hadozee"),
  Halfling: speciesCardImage("halfling"),
  Hexblood: speciesCardImage("hexblood"),
  Human: speciesCardImage("human"),
  "Jhorgun'taal": speciesCardImage("jhorguntaal"),
  "Jhorgun'taal (Half-Orc)": speciesCardImage("jhorguntaal"),
  Kalashtar: speciesCardImage("kalashtar"),
  "Kalamer Landwalker Merfolk": speciesCardImage("kalamer-landwalker-merfolk"),
  "Kalamer Landwalker (Merfolk)": speciesCardImage("kalamer-landwalker-merfolk"),
  Khoravar: speciesCardImage("khoravar"),
  Kithkin: speciesCardImage("kithkin"),
  "Lorwyn Changeling": speciesCardImage("lorwyn-changeling"),
  "Lorwyn Elf": speciesCardImage("lorwyn-elf"),
  "Lorwyn Fairy": speciesCardImage("lorwyn-fairy"),
  Lupin: speciesCardImage("lupin"),
  Orc: speciesCardImage("orc"),
  Plasmoid: speciesCardImage("plasmoid"),
  Reborn: speciesCardImage("reborn"),
  Rimekin: speciesCardImage("rimekin"),
  Ruinbound: speciesCardImage("ruinbound"),
  Sahuagin: speciesCardImage("sahuagin"),
  Shifter: speciesCardImage("shifter"),
  Tabaxi: speciesCardImage("tabaxi"),
  "Thri-kreen": speciesCardImage("thri-kreen"),
  Tiefling: speciesCardImage("tiefling"),
  Warforged: speciesCardImage("warforged"),
  "Water Genasi": speciesCardImage("water-genasi"),
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

const SPECIES_CARD_IMAGES_BY_NAME_LOWER = new Map(
  Object.entries(SPECIES_CARD_IMAGES_BY_NAME).map(([name, url]) => [name.toLowerCase(), url]),
)

function lookupSpeciesCardImage(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  return (
    SPECIES_CARD_IMAGES_BY_NAME[trimmed] ??
    SPECIES_CARD_IMAGES_BY_NAME_LOWER.get(trimmed.toLowerCase()) ??
    null
  )
}

/** Import labels like `Genasi: Air` → also try `Air Genasi`. */
const SPECIES_COLON_LABEL_RE = /^(.+?):\s*(.+)$/u

export function defaultSpeciesCardImageUrl(speciesName: string): string | null {
  const trimmed = speciesName.trim()
  if (!trimmed) return null

  const exact = lookupSpeciesCardImage(trimmed)
  if (exact) return exact

  const colonMatch = trimmed.match(SPECIES_COLON_LABEL_RE)
  if (colonMatch) {
    const left = colonMatch[1]!.trim()
    const right = colonMatch[2]!.trim()
    if (left && right) {
      const flipped = lookupSpeciesCardImage(`${right} ${left}`)
      if (flipped) return flipped
    }
  }

  const yearMatch = trimmed.match(SPECIES_YEAR_SUFFIX_RE)
  if (yearMatch) {
    const base = yearMatch[1]!.trim()
    const year = yearMatch[2]!
    if (base) {
      const yearKeyed = lookupSpeciesCardImage(`${base} (${year})`)
      if (yearKeyed) return yearKeyed
      // MotM rows were formerly tagged (2014); accept either year for that portrait.
      if (year === "2014") {
        const motm = lookupSpeciesCardImage(`${base} (2022)`)
        if (motm) return motm
      } else if (year === "2022") {
        const legacyTag = lookupSpeciesCardImage(`${base} (2014)`)
        if (legacyTag) return legacyTag
        // Single-edition MotM names (e.g. Goblin) may only have a plain-name portrait.
        // Skip when a distinct 2024 portrait exists (Aasimar / Changeling).
        if (!lookupSpeciesCardImage(`${base} (2024)`)) {
          const baseKeyed = lookupSpeciesCardImage(base)
          if (baseKeyed) return baseKeyed
        }
      } else if (year === "2024") {
        // Plain name is the 2024 portrait for Aasimar / Changeling.
        const baseKeyed = lookupSpeciesCardImage(base)
        if (baseKeyed) return baseKeyed
      }
      // Do not fall back to a different edition's art for other year tags.
      return null
    }
  }

  const parenMatch = trimmed.match(SPECIES_PAREN_SUFFIX_RE)
  if (parenMatch) {
    const base = parenMatch[1]!.trim()
    if (base) {
      const baseKeyed = lookupSpeciesCardImage(base)
      if (baseKeyed) return baseKeyed
    }
  }

  return null
}
