/**
 * SRD 5.2.1 tool writeups (Ability / Utilize / Craft).
 * @see https://www.dndbeyond.com/srd
 */

type SrdToolWriteup = {
  ability: string
  utilize: string
  craft?: string
  variants?: string
  /** Extra lead-in (group / category note). */
  lead?: string
}

const ARTISANS_LEAD =
  "Artisan's Tools are focused on crafting items and pursuing a trade. Each of these tools requires a separate proficiency."

const PROFICIENCY_NOTE =
  "If you have proficiency with this tool, add your Proficiency Bonus to any ability check you make that uses it. If you also have proficiency in a skill used with that check, you have Advantage on the check too."

const WRITEUPS_BY_NAME: Record<string, SrdToolWriteup> = {
  "Alchemist's Supplies": {
    lead: ARTISANS_LEAD,
    ability: "Intelligence",
    utilize: "Identify a substance (DC 15), or start a fire (DC 15)",
    craft: "Acid, Alchemist's Fire, Component Pouch, Oil, Paper, Perfume",
  },
  "Brewer's Supplies": {
    lead: ARTISANS_LEAD,
    ability: "Intelligence",
    utilize: "Detect poisoned drink (DC 15), or identify alcohol (DC 10)",
    craft: "Antitoxin",
  },
  "Calligrapher's Supplies": {
    lead: ARTISANS_LEAD,
    ability: "Dexterity",
    utilize: "Write text with impressive flourishes that guard against forgery (DC 15)",
    craft: "Ink, Spell Scroll",
  },
  "Carpenter's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Strength",
    utilize: "Seal or pry open a door or container (DC 20)",
    craft: "Club, Greatclub, Quarterstaff, Barrel, Chest, Ladder, Pole, Portable Ram, Torch",
  },
  "Cartographer's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Wisdom",
    utilize: "Draft a map of a small area (DC 15)",
    craft: "Map",
  },
  "Cobbler's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Dexterity",
    utilize:
      "Modify footwear to give Advantage on the wearer's next Dexterity (Acrobatics) check (DC 10)",
    craft: "Climber's Kit",
  },
  "Cook's Utensils": {
    lead: ARTISANS_LEAD,
    ability: "Wisdom",
    utilize: "Improve food's flavor (DC 10), or detect spoiled or poisoned food (DC 15)",
    craft: "Rations",
  },
  "Glassblower's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Intelligence",
    utilize: "Discern what a glass object held in the past 24 hours (DC 15)",
    craft: "Glass Bottle, Magnifying Glass, Spyglass, Vial",
  },
  "Jeweler's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Intelligence",
    utilize: "Discern a gem's value (DC 15)",
    craft: "Arcane Focus, Holy Symbol",
  },
  "Leatherworker's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Dexterity",
    utilize: "Add a design to a leather item (DC 10)",
    craft:
      "Sling, Whip, Hide Armor, Leather Armor, Studded Leather Armor, Backpack, Crossbow Bolt Case, Map or Scroll Case, Parchment, Pouch, Quiver, Waterskin",
  },
  "Mason's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Strength",
    utilize: "Chisel a symbol or hole in stone (DC 10)",
    craft: "Block and Tackle",
  },
  "Painter's Supplies": {
    lead: ARTISANS_LEAD,
    ability: "Wisdom",
    utilize: "Paint a recognizable image of something you've seen (DC 10)",
    craft: "Druidic Focus, Holy Symbol",
  },
  "Potter's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Intelligence",
    utilize: "Discern what a ceramic object held in the past 24 hours (DC 15)",
    craft: "Jug, Lamp",
  },
  "Smith's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Strength",
    utilize: "Pry open a door or container (DC 20)",
    craft:
      "Any Melee weapon (except Club, Greatclub, Quarterstaff, and Whip), Medium armor (except Hide), Heavy armor, Ball Bearings, Bucket, Caltrops, Chain, Crowbar, Firearm Bullets, Grappling Hook, Iron Pot, Iron Spikes, Sling Bullets",
  },
  "Tinker's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Dexterity",
    utilize: "Assemble a Tiny item composed of scrap, which falls apart in 1 minute (DC 20)",
    craft:
      "Musket, Pistol, Bell, Bullseye Lantern, Flask, Hooded Lantern, Hunting Trap, Lock, Manacles, Mirror, Shovel, Signal Whistle, Tinderbox",
  },
  "Weaver's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Dexterity",
    utilize: "Mend a tear in clothing (DC 10), or sew a Tiny design (DC 10)",
    craft:
      "Padded Armor, Basket, Bedroll, Blanket, Fine Clothes, Net, Robe, Rope, Sack, String, Tent, Traveler's Clothes",
  },
  "Woodcarver's Tools": {
    lead: ARTISANS_LEAD,
    ability: "Dexterity",
    utilize: "Carve a pattern in wood (DC 10)",
    craft:
      "Club, Greatclub, Quarterstaff, Ranged weapons (except Pistol, Musket, and Sling), Arcane Focus, Arrows, Bolts, Druidic Focus, Ink Pen, Needles",
  },
  "Disguise Kit": {
    ability: "Charisma",
    utilize: "Apply makeup (DC 10)",
    craft: "Costume",
  },
  "Forgery Kit": {
    ability: "Dexterity",
    utilize:
      "Mimic 10 or fewer words of someone else's handwriting (DC 15), or duplicate a wax seal (DC 20)",
  },
  "Gaming Set": {
    ability: "Wisdom",
    utilize: "Discern whether someone is cheating (DC 10), or win the game (DC 20)",
    variants: "Dice, dragonchess, playing cards, three-dragon ante (each requires its own proficiency)",
  },
  "Dice Set": {
    ability: "Wisdom",
    utilize: "Discern whether someone is cheating (DC 10), or win the game (DC 20)",
    lead: "A Gaming Set variant. Each kind of Gaming Set requires a separate proficiency.",
  },
  "Dragonchess Set": {
    ability: "Wisdom",
    utilize: "Discern whether someone is cheating (DC 10), or win the game (DC 20)",
    lead: "A Gaming Set variant. Each kind of Gaming Set requires a separate proficiency.",
  },
  "Playing Card Set": {
    ability: "Wisdom",
    utilize: "Discern whether someone is cheating (DC 10), or win the game (DC 20)",
    lead: "A Gaming Set variant. Each kind of Gaming Set requires a separate proficiency.",
  },
  "Three-Dragon Ante Set": {
    ability: "Wisdom",
    utilize: "Discern whether someone is cheating (DC 10), or win the game (DC 20)",
    lead: "A Gaming Set variant. Each kind of Gaming Set requires a separate proficiency.",
  },
  "Herbalism Kit": {
    ability: "Intelligence",
    utilize: "Identify a plant (DC 10)",
    craft: "Antitoxin, Candle, Healer's Kit, Potion of Healing",
  },
  "Musical Instrument": {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    variants:
      "Bagpipes, drum, dulcimer, flute, horn, lute, lyre, pan flute, shawm, viol (each requires its own proficiency)",
  },
  Bagpipes: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Drum: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Dulcimer: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Flute: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Horn: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Lute: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Lyre: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  "Pan Flute": {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Shawm: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  Viol: {
    ability: "Charisma",
    utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    lead: "A Musical Instrument variant. Each instrument requires a separate proficiency.",
  },
  "Navigator's Tools": {
    ability: "Wisdom",
    utilize: "Plot a course (DC 10), or determine position by stargazing (DC 15)",
  },
  "Poisoner's Kit": {
    ability: "Intelligence",
    utilize: "Detect a poisoned object (DC 10)",
    craft: "Basic Poison",
  },
  "Thieves' Tools": {
    ability: "Dexterity",
    utilize: "Pick a lock (DC 15), or disarm a trap (DC 15)",
  },
  "Vehicles (Land)": {
    ability: "Strength or Dexterity (GM's call)",
    utilize:
      "Control or steer a land vehicle, keep it from tipping, or push it through difficult terrain",
    lead:
      "Proficiency with land vehicles lets you add your Proficiency Bonus to ability checks made to drive or handle carts, wagons, carriages, and similar conveyances.",
  },
  "Vehicles (Water)": {
    ability: "Strength or Dexterity (GM's call)",
    utilize:
      "Steer a waterborne vessel, keep it on course, or handle it in rough water",
    lead:
      "Proficiency with water vehicles lets you add your Proficiency Bonus to ability checks made to operate boats and ships.",
  },
}

function formatWriteup(writeup: SrdToolWriteup): string {
  const parts: string[] = []
  if (writeup.lead) parts.push(`<p>${writeup.lead}</p>`)
  parts.push(`<p>${PROFICIENCY_NOTE}</p>`)
  parts.push(`<p><strong>Ability.</strong> ${writeup.ability}</p>`)
  parts.push(`<p><strong>Utilize.</strong> ${writeup.utilize}</p>`)
  if (writeup.craft) parts.push(`<p><strong>Craft.</strong> ${writeup.craft}</p>`)
  if (writeup.variants) parts.push(`<p><strong>Variants.</strong> ${writeup.variants}</p>`)
  return parts.join("")
}

const DESCRIPTION_BY_NAME = new Map(
  Object.entries(WRITEUPS_BY_NAME).map(([name, writeup]) => [name.toLowerCase(), formatWriteup(writeup)]),
)

/** Full SRD-style description for a tool proficiency, or null if unknown. */
export function getSrdToolDescription(toolName: string): string | null {
  const normalized = toolName.trim().toLowerCase()
  if (!normalized) return null
  return DESCRIPTION_BY_NAME.get(normalized) ?? null
}
