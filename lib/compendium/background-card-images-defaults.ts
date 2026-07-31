import { withBasePath } from "@/lib/config/deploy-mode"

const DUMPSTAT_WOTC_BACKGROUNDS =
  "https://jeffginger.com/dumpstat/wotc/backgrounds"

const bundledBackgroundCardImage = (slug: string) =>
  withBasePath(`/images/compendium/backgrounds/${slug}.png`)

const hostedBackgroundCardImage = (filename: string) =>
  `${DUMPSTAT_WOTC_BACKGROUNDS}/${encodeURIComponent(filename)}`

/**
 * Prefer optimized local card art when present under public/images/compendium/backgrounds/.
 * Hosted dumpstat URLs remain as fallbacks for names without a bundled file.
 */
export const SRD_BACKGROUND_CARD_IMAGES_BY_NAME: Record<string, string> = {
  // Bundled (PHB / Eberron / Planescape / Ravenloft — optimized via scripts/background-card-sources)
  "Aberrant Heir": bundledBackgroundCardImage("aberrant-heir"),
  Acolyte: bundledBackgroundCardImage("acolyte"),
  Archaeologist: bundledBackgroundCardImage("archaeologist"),
  Artisan: bundledBackgroundCardImage("artisan"),
  Charlatan: bundledBackgroundCardImage("charlatan"),
  Criminal: bundledBackgroundCardImage("criminal"),
  Entertainer: bundledBackgroundCardImage("entertainer"),
  Farmer: bundledBackgroundCardImage("farmer"),
  "Gate Warden": bundledBackgroundCardImage("gate-warden"),
  Guard: bundledBackgroundCardImage("guard"),
  Guide: bundledBackgroundCardImage("guide"),
  "Haunted One": bundledBackgroundCardImage("haunted-one"),
  Hermit: bundledBackgroundCardImage("hermit"),
  "House Agent": bundledBackgroundCardImage("house-agent"),
  "House Cannith Heir": bundledBackgroundCardImage("house-cannith-heir"),
  "House Deneith Heir": bundledBackgroundCardImage("house-deneith-heir"),
  "House Ghallanda Heir": bundledBackgroundCardImage("house-ghallanda-heir"),
  "House Jorasco Heir": bundledBackgroundCardImage("house-jorasco-heir"),
  "House Kundarak Heir": bundledBackgroundCardImage("house-kundarak-heir"),
  "House Lyrandar Heir": bundledBackgroundCardImage("house-lyrandar-heir"),
  "House Medani Heir": bundledBackgroundCardImage("house-medani-heir"),
  "House Orien Heir": bundledBackgroundCardImage("house-orien-heir"),
  "House Phiarlan Heir": bundledBackgroundCardImage("house-phiarlan-heir"),
  "House Sivis Heir": bundledBackgroundCardImage("house-sivis-heir"),
  "House Tharashk Heir": bundledBackgroundCardImage("house-tharashk-heir"),
  "House Thuranni Heir": bundledBackgroundCardImage("house-thuranni-heir"),
  "House Vadalis Heir": bundledBackgroundCardImage("house-vadalis-heir"),
  Investigator: bundledBackgroundCardImage("investigator"),
  Merchant: bundledBackgroundCardImage("merchant"),
  "Mist Wanderer": bundledBackgroundCardImage("mist-wanderer"),
  Noble: bundledBackgroundCardImage("noble"),
  "Planar Philosopher": bundledBackgroundCardImage("planar-philosopher"),
  Sage: bundledBackgroundCardImage("sage"),
  Sailor: bundledBackgroundCardImage("sailor"),
  Scribe: bundledBackgroundCardImage("scribe"),
  "Shadowmoor Expert": bundledBackgroundCardImage("shadowmoor-expert"),
  Soldier: bundledBackgroundCardImage("soldier"),
  Wayfarer: bundledBackgroundCardImage("wayfarer"),

  // Hosted-only fallbacks (no bundled source yet)
  Carouser: hostedBackgroundCardImage("Carouser.jpeg"),
  "Chondathan Freebooter": hostedBackgroundCardImage("Chondathan Freebooter.jpeg"),
  "Dead Magic Dweller": hostedBackgroundCardImage("Dead Magic Dweller.jpeg"),
  "Dragon Cultist": hostedBackgroundCardImage("Dragon Cultist.jpeg"),
  "Emerald Enclave Caretaker": hostedBackgroundCardImage("Emerald Enclave Caretaker.jpeg"),
  "Flaming Fist Mercenary": hostedBackgroundCardImage("Flaming Fist Mercenary.jpeg"),
  "Genie Touched": hostedBackgroundCardImage("Genie Touched.jpeg"),
  Harper: hostedBackgroundCardImage("Harper.jpeg"),
  "Ice Fisher": hostedBackgroundCardImage("Ice Fisher.jpeg"),
  Inquisitive: hostedBackgroundCardImage("Inquisitive.jpeg"),
  "Knight of the Gauntlet": hostedBackgroundCardImage("Knight of the Gauntlet.jpeg"),
  "Lords' Alliance Vassal": hostedBackgroundCardImage("Lords' Alliance Vassal.jpeg"),
  "Lorwyn Expert": hostedBackgroundCardImage("Lorwyn Expert.jpeg"),
  "Moonwell Pilgrim": hostedBackgroundCardImage("Moonwell Pilgrim.jpeg"),
  "Mulhorandi Tomb Raider": hostedBackgroundCardImage("Mulhorandi Tomb Raider.jpeg"),
  Mythalkeeper: hostedBackgroundCardImage("Mythalkeeper.jpeg"),
  "Pact Seeker": hostedBackgroundCardImage("Pact Seeker.jpeg"),
  "Purple Dragon Squire": hostedBackgroundCardImage("Purple Dragon Squire.jpeg"),
  "Rashemi Wanderer": hostedBackgroundCardImage("Rashemi Wanderer.jpeg"),
  "Shadowmasters Exile": hostedBackgroundCardImage("Shadowmasters Exile.jpeg"),
  "Spellfire Initiate": hostedBackgroundCardImage("Spellfire Initiate.jpeg"),
  "Spirit Medium": hostedBackgroundCardImage("Spirit Medium.jpeg"),
  "Vampire Devotee": hostedBackgroundCardImage("Vampire Devotee.jpeg"),
  "Vampire Survivor": hostedBackgroundCardImage("Vampire Survivor.jpeg"),
  "Zhentarim Mercenary": hostedBackgroundCardImage("Zhentarim Mercenary.jpeg"),
}

export function defaultBackgroundCardImageUrl(backgroundName: string): string | null {
  return SRD_BACKGROUND_CARD_IMAGES_BY_NAME[backgroundName] ?? null
}
