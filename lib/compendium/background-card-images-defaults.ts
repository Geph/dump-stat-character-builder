import { withBasePath } from "@/lib/config/deploy-mode"

const bundledBackgroundCardImage = (slug: string) =>
  withBasePath(`/images/compendium/backgrounds/${slug}.png`)

/**
 * Bundled background card art under public/images/compendium/backgrounds/.
 * Matched by background **name** (any source label) — never remote dumpstat hosts.
 * Names without a local file stay blank until art is uploaded.
 */
export const SRD_BACKGROUND_CARD_IMAGES_BY_NAME: Record<string, string> = {
  "Aberrant Heir": bundledBackgroundCardImage("aberrant-heir"),
  Acolyte: bundledBackgroundCardImage("acolyte"),
  Archaeologist: bundledBackgroundCardImage("archaeologist"),
  Artisan: bundledBackgroundCardImage("artisan"),
  Carouser: bundledBackgroundCardImage("carouser"),
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
  Inquisitive: bundledBackgroundCardImage("inquisitive"),
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
  "Spirit Medium": bundledBackgroundCardImage("spirit-medium"),
  "Vampire Devotee": bundledBackgroundCardImage("vampire-devotee"),
  "Vampire Survivor": bundledBackgroundCardImage("vampire-survivor"),
  Wayfarer: bundledBackgroundCardImage("wayfarer"),
}

export function defaultBackgroundCardImageUrl(backgroundName: string): string | null {
  return SRD_BACKGROUND_CARD_IMAGES_BY_NAME[backgroundName.trim()] ?? null
}
