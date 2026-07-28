const DUMPSTAT_WOTC_BACKGROUNDS =
  "https://jeffginger.com/dumpstat/wotc/backgrounds"

const backgroundCardImage = (filename: string) =>
  `${DUMPSTAT_WOTC_BACKGROUNDS}/${encodeURIComponent(filename)}`

/**
 * Default card art for backgrounds (SRD + WOTC imports).
 * Hosted under https://jeffginger.com/dumpstat/wotc/backgrounds/
 */
export const SRD_BACKGROUND_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Acolyte: backgroundCardImage("Acolyte.jpeg"),
  Artisan: backgroundCardImage("Artisan.jpeg"),
  Charlatan: backgroundCardImage("Charlatan.jpeg"),
  Criminal: backgroundCardImage("Criminal.jpeg"),
  Entertainer: backgroundCardImage("Entertainer.jpeg"),
  Farmer: backgroundCardImage("Farmer.jpeg"),
  Guard: backgroundCardImage("Guard.jpeg"),
  Guide: backgroundCardImage("Guide.jpeg"),
  "Haunted One": backgroundCardImage("Haunted One.jpeg"),
  Hermit: backgroundCardImage("Hermit.jpeg"),
  Investigator: backgroundCardImage("Investigator.jpeg"),
  Merchant: backgroundCardImage("Merchant.jpeg"),
  "Mist Wanderer": backgroundCardImage("Mist Wanderer.jpeg"),
  Noble: backgroundCardImage("Noble.jpeg"),
  Sage: backgroundCardImage("Sage.jpeg"),
  Sailor: backgroundCardImage("Sailor.jpeg"),
  Scribe: backgroundCardImage("Scribe.jpeg"),
  Soldier: backgroundCardImage("Soldier.jpeg"),
  "Spirit Medium": backgroundCardImage("Spirit Medium.jpeg"),
  Wayfarer: backgroundCardImage("Wayfarer.jpeg"),
  // Hosted but not in wotc-backgrounds JSON yet — still map for future/house rows
  "Aberrant Heir": backgroundCardImage("Aberrent Heir.jpeg"), // host typo: Aberrent
  Archaeologist: backgroundCardImage("Archeaeologist.jpeg"), // host typo
  Carouser: backgroundCardImage("Carouser.jpeg"),
  "Chondathan Freebooter": backgroundCardImage("Chondathan Freebooter.jpeg"),
  "Dead Magic Dweller": backgroundCardImage("Dead Magic Dweller.jpeg"),
  "Dragon Cultist": backgroundCardImage("Dragon Cultist.jpeg"),
  "Emerald Enclave Caretaker": backgroundCardImage("Emerald Enclave Caretaker.jpeg"),
  "Flaming Fist Mercenary": backgroundCardImage("Flaming Fist Mercenary.jpeg"),
  "Genie Touched": backgroundCardImage("Genie Touched.jpeg"),
  Harper: backgroundCardImage("Harper.jpeg"),
  "House Agent": backgroundCardImage("House Agent.jpeg"),
  "House Cannith Heir": backgroundCardImage("House cannith Heir.jpeg"),
  "House Deneith Heir": backgroundCardImage("House Deneith Heir.jpeg"),
  "House Ghallanda Heir": backgroundCardImage("House Ghallanda Heir.jpeg"),
  "House Jorasco Heir": backgroundCardImage("House Jorasco Heir.jpeg"),
  "House Kundarak Heir": backgroundCardImage("House Kundarak Heir.jpeg"),
  "House Lyrandar Heir": backgroundCardImage("House Lyrandar Heir.jpeg"),
  "House Medani Heir": backgroundCardImage("House Medani Heir.jpeg"),
  "House Orien Heir": backgroundCardImage("House Orien Heir.jpeg"),
  "House Phiarlan Heir": backgroundCardImage("House Phiarlan Heir.jpeg"),
  "House Sivis Heir": backgroundCardImage("House Sivis Heir.jpeg"),
  "House Tharashk Heir": backgroundCardImage("House Tharashk Heir.jpeg"),
  "House Thuranni Heir": backgroundCardImage("House Thuranni Heir.jpeg"),
  "House Vadalis Heir": backgroundCardImage("House Vadalis Heir.jpeg"),
  "Ice Fisher": backgroundCardImage("Ice Fisher.jpeg"),
  Inquisitive: backgroundCardImage("Inquisitive.jpeg"),
  "Knight of the Gauntlet": backgroundCardImage("Knight of the Gauntlet.jpeg"),
  "Lords' Alliance Vassal": backgroundCardImage("Lords' Alliance Vassal.jpeg"),
  "Lorwyn Expert": backgroundCardImage("Lorwyn Expert.jpeg"),
  "Moonwell Pilgrim": backgroundCardImage("Moonwell Pilgrim.jpeg"),
  "Mulhorandi Tomb Raider": backgroundCardImage("Mulhorandi Tomb Raider.jpeg"),
  Mythalkeeper: backgroundCardImage("Mythalkeeper.jpeg"),
  "Pact Seeker": backgroundCardImage("Pact Seeker.jpeg"),
  "Purple Dragon Squire": backgroundCardImage("Purple Dragon Squire.jpeg"),
  "Rashemi Wanderer": backgroundCardImage("Rashemi Wanderer.jpeg"),
  "Shadowmoor Expert": backgroundCardImage("Sahdowmoor Expert.jpeg"), // host typo
  "Shadowmasters Exile": backgroundCardImage("Shadowmasters Exile.jpeg"),
  "Spellfire Initiate": backgroundCardImage("Spellfire Initiate.jpeg"),
  "Vampire Devotee": backgroundCardImage("Vampire Devotee.jpeg"),
  "Vampire Survivor": backgroundCardImage("Vampire Survivor.jpeg"),
  "Zhentarim Mercenary": backgroundCardImage("Zhentarim Mercenary.jpeg"),
}

export function defaultBackgroundCardImageUrl(backgroundName: string): string | null {
  return SRD_BACKGROUND_CARD_IMAGES_BY_NAME[backgroundName] ?? null
}
