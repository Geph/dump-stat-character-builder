import {
  maybeFilterDefaultCardImageUrl,
  type DefaultCardImageAvailability,
} from "@/lib/compendium/available-card-art"
import { withBasePath } from "@/lib/config/deploy-mode"

const bundledBackgroundCardImage = (slug: string) =>
  withBasePath(`/images/compendium/backgrounds/${slug}.png`)

/**
 * Background card art under public/images/compendium/backgrounds/.
 * Only names with masters in `scripts/background-card-sources` are mapped — never remote hosts.
 * PHB / Eberron / Ravenloft / Planescape art applies on import when present locally;
 * GitHub only ships SRD + Kibbles backgrounds (see bundled-card-art allowlist).
 */
export const SRD_BACKGROUND_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Acolyte: bundledBackgroundCardImage("acolyte"),
  Apothecary: bundledBackgroundCardImage("apothecary"),
  Archaeologist: bundledBackgroundCardImage("archaeologist"),
  Artisan: bundledBackgroundCardImage("artisan"),
  Carouser: bundledBackgroundCardImage("carouser"),
  Charlatan: bundledBackgroundCardImage("charlatan"),
  Criminal: bundledBackgroundCardImage("criminal"),
  Entertainer: bundledBackgroundCardImage("entertainer"),
  Farmer: bundledBackgroundCardImage("farmer"),
  Engineer: bundledBackgroundCardImage("engineer"),
  "Gate Guardian": bundledBackgroundCardImage("gate-warden"),
  "Gate Warden": bundledBackgroundCardImage("gate-warden"),
  Guard: bundledBackgroundCardImage("guard"),
  Guide: bundledBackgroundCardImage("guide"),
  "Haunted One": bundledBackgroundCardImage("haunted-one"),
  Hermit: bundledBackgroundCardImage("hermit"),
  "House Agent": bundledBackgroundCardImage("house-agent"),
  "House Deneith Heir": bundledBackgroundCardImage("house-deneith-heir"),
  "House Ghallanda Heir": bundledBackgroundCardImage("house-ghallanda-heir"),
  "House Jorasco Heir": bundledBackgroundCardImage("house-jorasco-heir"),
  "House Kundarak Heir": bundledBackgroundCardImage("house-kundarak-heir"),
  "House Lyrandar Heir": bundledBackgroundCardImage("house-lyrandar-heir"),
  "House Medani Heir": bundledBackgroundCardImage("house-medani-heir"),
  "House Orien Heir": bundledBackgroundCardImage("house-orien-heir"),
  "House Phiarlan Heir": bundledBackgroundCardImage("house-phiarlan-heir"),
  "House Tharashk": bundledBackgroundCardImage("house-tharashk-heir"),
  "House Tharashk Heir": bundledBackgroundCardImage("house-tharashk-heir"),
  "House Thuranni Heir": bundledBackgroundCardImage("house-thuranni-heir"),
  "House Thurani Heir": bundledBackgroundCardImage("house-thuranni-heir"),
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
  Tinker: bundledBackgroundCardImage("tinker"),
  "Vampire Devotee": bundledBackgroundCardImage("vampire-devotee"),
  "Vampire Survivor": bundledBackgroundCardImage("vampire-survivor"),
  Wayfarer: bundledBackgroundCardImage("wayfarer"),
}

const BACKGROUND_CARD_IMAGES_BY_NAME_LOWER = new Map(
  Object.entries(SRD_BACKGROUND_CARD_IMAGES_BY_NAME).map(([name, url]) => [name.toLowerCase(), url]),
)

export function defaultBackgroundCardImageUrl(
  backgroundName: string,
  options?: DefaultCardImageAvailability,
): string | null {
  const trimmed = backgroundName.trim()
  if (!trimmed) return null
  const mapped =
    SRD_BACKGROUND_CARD_IMAGES_BY_NAME[trimmed] ??
    BACKGROUND_CARD_IMAGES_BY_NAME_LOWER.get(trimmed.toLowerCase()) ??
    null
  return maybeFilterDefaultCardImageUrl(mapped, options?.requireAvailable !== false)
}
