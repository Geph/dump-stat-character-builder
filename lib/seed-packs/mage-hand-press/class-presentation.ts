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

const MHP_CARD_IMAGE_BASE = "https://jeffginger.com/dumpstat/images/magehandpress/classes"

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
      "You treat the fight like a lab bench: bombs for the cluster, potions for the mutation, reagents spent as fast as you can mix them.",
    card_image_slug: "alchemist",
  },
  Captain: {
    icon: "captain-hat-profile",
    card_blurb:
      "Commands a loyal cohort and fuels allies with tactical maneuvers, born to lead from the front lines.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/captain/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You lead from the front with a loyal cohort and a pouch of battle dice. Maneuvers keep the whole line pointed the same way.",
    card_image_slug: "captain",
  },
  Craftsman: {
    icon: "blacksmith",
    card_blurb:
      "Inventive artisans who forge custom weapons and armor on the spot, blending craft with combat.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/craftsman/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You walk in with tools and walk out with a custom weapon or a patched suit of plate. Combat and the workbench are the same craft.",
    card_image_slug: "craftsman",
  },
  Dancer: {
    icon: "ballerina-shoes",
    card_blurb:
      "A graceful, evasive skirmisher who turns footwork and flair into a deadly weapon in battle.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/dancer/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "Footwork is the armor. You skim the melee, turn small weapons lethal, and make looking graceful the same as not getting hit.",
    card_image_slug: "dancer",
  },
  Gunslinger: {
    icon: "gunshot",
    card_blurb:
      "Wagers hit points on risk dice for devastating critical shots, backed by an arsenal of guns.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/gunslinger/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You bet hit points on risk dice for ugly criticals. Reload, gamble, and make the next shot the one they remember.",
    card_image_slug: "gunslinger",
  },
  Investigator: {
    icon: "magnifying-glass",
    card_blurb:
      "Monster hunter armed with silver bolts and forbidden rituals, unraveling supernatural threats.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/investigator/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You hunt the thing that should not be in town: rituals in a grimoire, silvered shots, and a habit of pulling threads until the monster shows.",
    card_image_slug: "investigator",
  },
  Martyr: {
    icon: "bleeding-heart",
    card_blurb:
      "Sacrifices their own hit points to fuel divine power, then claws back from the brink of death.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/martyr/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You spend your own blood to buy miracles, then crawl back from the brink. Faith is a resource track measured in hit points.",
    card_image_slug: "martyr",
  },
  Necromancer: {
    icon: "stoned-skull",
    card_blurb:
      "Wields forbidden death magic and commands undead legions, torn between ambition and ethics.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/necromancer/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You spend soul and slot alike on death magic, then fill the gaps with things that used to be people. The ethics argument is part of the class.",
    card_image_slug: "necromancer",
  },
  Vagabond: {
    icon: "treasure-map",
    card_blurb:
      "A scrappy wanderer who relies on gritty maneuvers and sheer resilience to survive any fight.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/vagabond/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You survive on grit, a secret you will not name, and maneuvers learned the hard way. The road is the class feature.",
    card_image_slug: "vagabond",
  },
  Warmage: {
    icon: "hypersonic-bolt",
    card_blurb:
      "Turns simple cantrips into a devastating arsenal through relentless magical customization.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/warmage/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "Cantrips are the whole arsenal. You stack tricks until a simple bolt looks like a siege engine, then do it again next turn.",
    card_image_slug: "warmage",
  },
  Witch: {
    icon: "witch-flight",
    card_blurb:
      "Curses foes with dark hexes while a loyal familiar strikes the killing blow at their side.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/witch/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "Hexes soften the target; the familiar finishes the job. You cast from a curse you learned to aim instead of merely suffer.",
    card_image_slug: "witch",
  },
  Warden: {
    icon: "rosa-shield",
    card_blurb:
      "Armed with a shield and stubborn resolve, you hold the line for allies and the wilds they still call home.",
    creator_url:
      "https://magehandpress.com/category/content/mage-hand-press-classes/warden/\nIn accordance with https://magehandpress.com/content-usage-policy/",
    description:
      "You plant yourself between the threat and everyone else—marks, stubborn defense, and a shield that makes the wilds feel guarded.",
    card_image_slug: "warden",
  },
}

/** @deprecated Warden now has curated flavor; kept so older stamp scripts still import. */
export const MHP_CLASSES_STRIP_DESCRIPTION_ONLY = [] as const

export const MHP_WARDEN_CARD_IMAGE_SLUG = "warden"

export const MHP_WARDEN_CREATOR_URL =
  "https://magehandpress.com/category/content/mage-hand-press-classes/warden/\nIn accordance with https://magehandpress.com/content-usage-policy/"
