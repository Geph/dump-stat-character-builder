import {
  maybeFilterDefaultCardImageUrl,
  type DefaultCardImageAvailability,
} from "@/lib/compendium/available-card-art"
import { withBasePath } from "@/lib/config/deploy-mode"

const spellCardImage = (slug: string) => withBasePath(`/images/compendium/spells/${slug}.png`)

/** Slug for bundled spell card art filenames under public/images/compendium/spells/. */
export function spellNameToCardImageSlug(spellName: string): string {
  return spellName
    .trim()
    .toLowerCase()
    // ASCII + typographic apostrophes (Kibbles uses U+2019 in names like Trary’s …)
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Display-name → output slug when the filename differs from a naive kebab-case of the name
 * (typos in masters, plural/singular import variants, shortened titles).
 */
const SPELL_CARD_IMAGE_SLUG_OVERRIDES: Record<string, string> = {
  "Dancing Objects (Animate Object)": "dancing-object-animate-object",
}

/** Spell names with bundled card art (SRD and homebrew-ready name matching). */
export const BUNDLED_SPELL_CARD_IMAGE_NAMES = [
  "Acid Splash",
  "Aether Lance",
  "Aether Storm",
  "Arcane Ablation",
  "Arcane Infusion",
  "Arcane Weapon",
  "Arctic Breath",
  "Awaken Rope",
  "Beam of Annihilation",
  "Blade Ward",
  "Bond Item",
  "Booming Blade",
  "Chill Touch",
  "Clay Touch",
  "Cold Snap",
  "Compelled Query",
  "Control Flames",
  "Crackle",
  "Create Bonfire",
  "Crippling Agony",
  "Dancing Lights",
  "Dancing Object (Animate Object)",
  "Dancing Objects (Animate Object)",
  "Delve Mind",
  "Devouring Darkness",
  "Dig",
  "Dimension Cutter",
  "Disorient",
  "Dispel Construct",
  "Divide Self",
  "Druidcraft",
  "Eldritch Blast",
  "Electrocute",
  "Elementalism",
  "Entomb",
  "Fall",
  "Fire Bolt",
  "Fire Cyclone",
  "Fireburst Mine",
  "Fissure",
  "Flash Freeze",
  "Flicker",
  "Flickering Strikes",
  "Fling",
  "Friends",
  "Frighten",
  "Frostbite",
  "Future Insight",
  "Glimpse the Future",
  "Green-Flame Blade",
  "Guidance",
  "Gust",
  "Ice Spike",
  "Ichorous Blood",
  "Imbue Luck",
  "Impact",
  "Infestation",
  "Inner World",
  "Invest Life",
  "Invested Competency",
  "Jumping Jolt",
  "Killing Curse",
  "Launch Object",
  "Light",
  "Lightning Charged",
  "Lightning Lure",
  "Lightning Tendril",
  "Mage Hand",
  "Magic Stone",
  "Melting Glob",
  "Mending",
  "Message",
  "Mind Blast",
  "Mind Sliver",
  "Minor Illusion",
  "Mold Earth",
  "Mutate",
  "Nullify Effect",
  "Orbital Stones",
  "Poison Spray",
  "Prestidigitation",
  "Primal Savagery",
  "Prismatic Weapon",
  "Produce Flame",
  "Psychic Drain",
  "Rain of Spiders",
  "Ray of Frost",
  "Repair",
  "Resistance",
  "Returning Weapon",
  "Sacred Flame",
  "Seeking Projectile",
  "Shape Water",
  "Shillelagh",
  "Shocking Grasp",
  "Shockwave",
  "Sky Burst",
  "Sorcerous Burst",
  "Spare the Dying",
  "Starry Wisp",
  "Static Field",
  "Sword Burst",
  "Thaumaturgy",
  "Thunder Punch",
  "Thunderburst Mine",
  "Toll the Dead",
  "Translocating Shot",
  "Trary\u2019s Terrific Transposition",
  "True Strike",
  "Turbulent Warp",
  "Unburden",
  "Unlocked Potential",
  "Vicious Mockery",
  "Vorpal Shot",
  "Vorpal Weapon",
  "Vortex Blast",
  "Water Bullet",
  "Wind Cutter",
  "Word of Radiance",
] as const

/** Default card art keyed by exact spell name (includes non-SRD names for import matching). */
export const BUNDLED_SPELL_CARD_IMAGES_BY_NAME: Record<string, string> = Object.fromEntries(
  BUNDLED_SPELL_CARD_IMAGE_NAMES.map((name) => {
    const slug = SPELL_CARD_IMAGE_SLUG_OVERRIDES[name] ?? spellNameToCardImageSlug(name)
    return [name, spellCardImage(slug)]
  }),
)

export function defaultSpellCardImageUrl(
  spellName: string,
  options?: DefaultCardImageAvailability,
): string | null {
  return maybeFilterDefaultCardImageUrl(
    BUNDLED_SPELL_CARD_IMAGES_BY_NAME[spellName] ?? null,
    options?.requireAvailable !== false,
  )
}
