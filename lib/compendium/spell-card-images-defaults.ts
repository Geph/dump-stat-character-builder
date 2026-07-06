import { withBasePath } from "@/lib/config/deploy-mode"

const spellCardImage = (slug: string) => withBasePath(`/images/compendium/spells/${slug}.png`)

/** Slug for bundled spell card art filenames under public/images/compendium/spells/. */
export function spellNameToCardImageSlug(spellName: string): string {
  return spellName
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-")
}

/** Spell names with bundled card art (SRD and homebrew-ready name matching). */
export const BUNDLED_SPELL_CARD_IMAGE_NAMES = [
  "Acid Splash",
  "Blade Ward",
  "Booming Blade",
  "Chill Touch",
  "Control Flames",
  "Create Bonfire",
  "Dancing Lights",
  "Druidcraft",
  "Eldritch Blast",
  "Elementalism",
  "Sorcerous Burst",
  "Starry Wisp",
  "Fire Bolt",
  "Friends",
  "Frostbite",
  "Green-Flame Blade",
  "Guidance",
  "Gust",
  "Infestation",
  "Light",
  "Lightning Lure",
  "Mage Hand",
  "Magic Stone",
  "Mending",
  "Message",
  "Mind Sliver",
  "Minor Illusion",
  "Mold Earth",
  "Poison Spray",
  "Prestidigitation",
  "Primal Savagery",
  "Produce Flame",
  "Ray of Frost",
  "Resistance",
  "Sacred Flame",
  "Shape Water",
  "Shillelagh",
  "Shocking Grasp",
  "Spare the Dying",
  "Sword Burst",
  "Thaumaturgy",
  "Toll the Dead",
  "True Strike",
  "Vicious Mockery",
  "Word of Radiance",
] as const

/** Default card art keyed by exact spell name (includes non-SRD names for import matching). */
export const BUNDLED_SPELL_CARD_IMAGES_BY_NAME: Record<string, string> = Object.fromEntries(
  BUNDLED_SPELL_CARD_IMAGE_NAMES.map((name) => [name, spellCardImage(spellNameToCardImageSlug(name))]),
)

export function defaultSpellCardImageUrl(spellName: string): string | null {
  return BUNDLED_SPELL_CARD_IMAGES_BY_NAME[spellName] ?? null
}
