/**
 * Curated Mage Hand Press class card presentation (icons, blurbs, source details,
 * and stripped "Becoming…" descriptions). Sourced from the local default load set.
 */
export type MhpClassPresentation = {
  icon: string
  card_blurb: string
  /** Freeform source citation stored as `creator_url` (URL + usage note). */
  creator_url: string
  /** Rules-only class description (no flavor paragraphs). */
  description: string
  card_image_slug: string
}

const MHP_CARD_IMAGE_BASE = "https://jeffginger.com/dumpstat/magehandpress/classes"

export function mhpClassCardImageUrl(slug: string): string {
  return `${MHP_CARD_IMAGE_BASE}/${slug}.png`
}

export const MHP_CLASS_PRESENTATION: Record<string, MhpClassPresentation> = {
  Alchemist: {
    icon: "potion-of-madness",
    card_blurb:
      "Half chemist, half magician — brews explosive concoctions and mutating potions mid-fight.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/alchemist/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming an Alchemist</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all the traits in the Core Alchemist Traits table.</li><li>Gain the Alchemist's level 1 features, which are listed in the Alchemist Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Alchemist Traits table: Hit Point Die, proficiency in one skill of your choice from the Alchemist's skill list, proficiency with Alchemist's Supplies, and training with Light armor.</li><li>Gain the Alchemist's level 1 features, which are listed in the Alchemist Features table.</li></ul>",
    card_image_slug: "alchemist",
  },
  Captain: {
    icon: "captain-hat-profile",
    card_blurb:
      "Commands a loyal cohort and fuels allies with tactical maneuvers, born to lead from the front lines.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/captain/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming a Captain</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Captain Traits table.</li><li>Gain the Captain's level 1 features, which are listed in the Captain Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Captain Traits table: Hit Point Die, proficiency with Martial weapons, and training with Light and Medium armor and Shields.</li><li>Gain the Captain's level 1 features, which are listed in the Captain Features table.</li></ul>",
    card_image_slug: "captain",
  },
  Craftsman: {
    icon: "blacksmith",
    card_blurb:
      "Inventive artisans who forge custom weapons and armor on the spot, blending craft with combat.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/craftsman/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming a Craftsman</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Craftsman Traits table.</li><li>Gain the Craftsman's level 1 features, which are listed in the Craftsman Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Craftsman Traits table: Hit Point Die, Tool Proficiencies, proficiency with Martial weapons, and training with Light and Medium armor and Shields.</li><li>Gain the Craftsman's level 1 features, which are listed in the Craftsman Features table.</li></ul>",
    card_image_slug: "craftsman",
  },
  Gunslinger: {
    icon: "gunshot",
    card_blurb:
      "Wagers hit points on risk dice for devastating critical shots, backed by an arsenal of guns.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/gunslinger/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming a Gunslinger</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Gunslinger Traits table.</li><li>Gain the Gunslinger's level 1 features, which are listed in the Gunslinger Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Gunslinger Traits table: Hit Point Die, and proficiency with Martial Ranged weapons.</li><li>Gain the Gunslinger's level 1 features, which are listed in the Gunslinger Features table.</li></ul>",
    card_image_slug: "gunslinger",
  },
  Investigator: {
    icon: "magnifying-glass",
    card_blurb:
      "Monster hunter armed with silver bolts and forbidden rituals, unraveling supernatural threats.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/investigator/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming an Investigator</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all the traits in the Core Investigator Traits table.</li><li>Gain the Investigator's level 1 features, which are listed in the Investigator Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Investigator Traits table: Hit Point Die, proficiency in one skill of your choice from the Investigator's skill list, proficiency with Martial Weapons, and training with Light Armor.</li><li>Gain the Investigator's level 1 features, which are listed in the Investigator Features table.</li></ul>",
    card_image_slug: "investigator",
  },
  Martyr: {
    icon: "bleeding-heart",
    card_blurb:
      "Sacrifices their own hit points to fuel divine power, then claws back from the brink of death.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/martyr/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming a Martyr</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Martyr Traits table.</li><li>Gain the Martyr's level 1 features, which are listed in the Martyr Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Martyr Traits table: Hit Point Die, proficiency with the Martial weapons, and training with Light armor and Shields.</li><li>Gain the Martyr's level 1 features, which are listed in the Martyr Features table.</li></ul>",
    card_image_slug: "martyr",
  },
  Necromancer: {
    icon: "stoned-skull",
    card_blurb:
      "Wields forbidden death magic and commands undead legions, torn between ambition and ethics.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/necromancer/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming a Necromancer</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Necromancer Traits table.</li><li>Gain the Necromancer's level 1 features, which are listed in the Necromancer Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the Hit Point Die from the Core Necromancer Traits table.</li><li>Gain the Necromancer's level 1 features, which are listed in the Necromancer Features table. See the</li></ul>",
    card_image_slug: "necromancer",
  },
  Vagabond: {
    icon: "treasure-map",
    card_blurb:
      "A scrappy wanderer who relies on gritty maneuvers and sheer resilience to survive any fight.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/vagabond/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p><strong>Becoming a Vagabond</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Vagabond Traits table.</li><li>Gain the Vagabond's level 1 features, which are listed in the Vagabond Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Vagabond Traits table: Hit Point Die, proficiency with Martial weapons, and training with Light and Medium armor and Shields.</li><li>Gain the Vagabond's level 1 features, which are listed in the Vagabond Features table.</li></ul>",
    card_image_slug: "vagabond",
  },
  Warmage: {
    icon: "magic-shield",
    card_blurb:
      "Turns simple cantrips into a devastating arsenal through relentless magical customization.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/warmage/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p>You gain proficiency with Simple weapons, training with Light armor, and proficiency with one Gaming Set of your choice.</p><p><strong>Becoming a Warmage</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Warmage Traits table.</li><li>Gain the Warmage's level 1 features, which are listed in the Warmage Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the Hit Point Die trait from the Core Warmage Traits table.</li><li>Gain the Warmage's level 1 features, which are listed in the Warmage Features table.</li></ul>",
    card_image_slug: "warmage",
  },
  Witch: {
    icon: "witch-flight",
    card_blurb:
      "Curses foes with dark hexes while a loyal familiar strikes the killing blow at their side.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/witch/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "<p>You have proficiency with the Herbalism Kit and training with Light armor.</p><p><strong>Becoming a Witch</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all of the traits in the Core Witch Traits table.</li><li>Gain the Witch's level 1 features, which are listed in the Witch Features table.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the following traits from the Core Witch Traits table: Hit Point Die, proficiency with the Herbalism Kit, and training with Light armor.</li><li>Gain the Witch's level 1 features, which are listed in the Witch Features table. See the</li></ul>",
    card_image_slug: "witch",
  },
}

/** Classes with only flavor prose in source — strip to empty for the default load set. */
export const MHP_CLASSES_STRIP_DESCRIPTION_ONLY = ["Warden"] as const

export const MHP_WARDEN_CARD_IMAGE_SLUG = "warden"

export const MHP_WARDEN_CREATOR_URL =
  "https://magehandpress.com/category/content/mage-hand-press-classes/warden/\nIn accordance with https://magehandpress.com/content-usage-policy/"
