import { withBasePath } from "@/lib/config/deploy-mode"

const bundledBackgroundCardImage = (slug: string) =>
  withBasePath(`/images/compendium/backgrounds/${slug}.png`)

/**
 * Bundled background card art under public/images/compendium/backgrounds/.
 * Only names with Drive-approved masters in scripts/graphics are mapped — never remote hosts.
 */
export const SRD_BACKGROUND_CARD_IMAGES_BY_NAME: Record<string, string> = {
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
  "House Orien Heir": bundledBackgroundCardImage("house-orien-heir"),
  "House Phiarlan Heir": bundledBackgroundCardImage("house-phiarlan-heir"),
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
  Soldier: bundledBackgroundCardImage("soldier"),
  "Spirit Medium": bundledBackgroundCardImage("spirit-medium"),
  "Vampire Devotee": bundledBackgroundCardImage("vampire-devotee"),
  "Vampire Survivor": bundledBackgroundCardImage("vampire-survivor"),
  Wayfarer: bundledBackgroundCardImage("wayfarer"),
}

export function defaultBackgroundCardImageUrl(backgroundName: string): string | null {
  return SRD_BACKGROUND_CARD_IMAGES_BY_NAME[backgroundName.trim()] ?? null
}
