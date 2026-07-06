import { isSrdSource } from "@/lib/srd/source"

/** Default game-icons.net slugs for SRD species (from bundled seed / local MySQL export). */
export const SRD_SPECIES_ICONS_BY_NAME: Record<string, string> = {
  Dragonborn: "dragon-head",
  Dwarf: "dwarf-face",
  Elf: "woman-elf-face",
  Gnome: "bad-gnome",
  Goliath: "giant",
  Halfling: "hobbit-dwelling",
  Human: "monk-face",
  Orc: "orc-head",
  Tiefling: "devil-mask",
}

/** Default game-icons.net slugs for SRD feats (from bundled seed / local MySQL export). */
export const SRD_FEAT_ICONS_BY_NAME: Record<string, string> = {
  Alert: "extra-lucid",
  Archery: "bowman",
  "Boon of Combat Prowess": "running-ninja",
  "Boon of Dimensional Travel": "magic-portal",
  "Boon of Fate": "card-pickup",
  "Boon of Irresistible Offense": "swords-power",
  "Boon of Spell Recall": "book-storm",
  "Boon of the Night Spirit": "ghost",
  "Boon of Truesight": "sheikah-eye",
  Defense: "layered-armor",
  Grappler: "grab",
  "Great Weapon Fighting": "glaive",
  "Magic Initiate": "magic-hat",
  "Savage Attacker": "sword-clash",
  Skilled: "diploma",
  "Two-Weapon Fighting": "rogue",
}

/** Default game-icons.net slugs for SRD backgrounds (from bundled seed / local MySQL export). */
export const SRD_BACKGROUND_ICONS_BY_NAME: Record<string, string> = {
  Acolyte: "sun-priest",
  Criminal: "robber",
  Sage: "gift-of-knowledge",
  Soldier: "guards",
}

/** Default game-icons.net slugs for SRD mundane armor (from bundled seed / local MySQL export). */
export const SRD_ARMOR_ICONS_BY_NAME: Record<string, string> = {
  Breastplate: "armor-vest",
  "Chain Mail": "mail-shirt",
  "Chain Shirt": "chain-mail",
  "Half Plate Armor": "breastplate",
  "Hide Armor": "fur-shirt",
  "Leather Armor": "leather-vest",
  "Padded Armor": "shirt",
  "Plate Armor": "cape-armor",
  "Ring Mail": "linked-rings",
  "Scale Mail": "scale-mail",
  Shield: "checked-shield",
  "Splint Armor": "shoulder-armor",
  "Studded Leather Armor": "leather-armor",
}

/** Default game-icons.net slugs for SRD tools (matched to locally installed game-icons.net set). */
export const SRD_TOOL_ICONS_BY_NAME: Record<string, string> = {
  "Alchemist's Supplies": "round-potion",
  Bagpipes: "bagpipes",
  "Brewer's Supplies": "beer-stein",
  "Calligrapher's Supplies": "quill-ink",
  "Carpenter's Tools": "claw-hammer",
  "Cartographer's Tools": "treasure-map",
  "Cobbler's Tools": "leather-boot",
  "Cook's Utensils": "fork-knife-spoon",
  "Dice Set": "rolling-dices",
  "Disguise Kit": "carnival-mask",
  "Dragonchess Set": "chess-knight",
  Drum: "drum",
  Dulcimer: "harp",
  Flute: "flute",
  "Forgery Kit": "post-stamp",
  "Gaming Set": "rolling-dice-cup",
  "Glassblower's Tools": "glass-ball",
  "Herbalism Kit": "herbs-bundle",
  Horn: "hunting-horn",
  "Jeweler's Tools": "gem-pendant",
  "Leatherworker's Tools": "leather-vest",
  Lute: "guitar",
  Lyre: "lyre",
  "Mason's Tools": "brick-wall",
  "Musical Instrument": "musical-notes",
  "Navigator's Tools": "compass",
  "Painter's Supplies": "paint-brush",
  "Pan Flute": "pan-flute",
  "Playing Card Set": "card-play",
  "Poisoner's Kit": "poison-bottle",
  "Potter's Tools": "painted-pottery",
  Shawm: "hunting-horn",
  "Smith's Tools": "anvil",
  "Thieves' Tools": "lockpicks",
  "Three-Dragon Ante Set": "card-joker",
  "Tinker's Tools": "tinker",
  "Vehicles (Land)": "old-wagon",
  "Vehicles (Water)": "sailboat",
  Viol: "violin",
  "Weaver's Tools": "rolled-cloth",
  "Woodcarver's Tools": "wood-axe",
}

/** Keep an explicit row icon when set; otherwise use bundled SRD defaults by name. */
export function applySrdItemIcon(
  row: Record<string, unknown>,
  defaults: Record<string, string>,
): Record<string, unknown> {
  if (typeof row.icon === "string" && row.icon.trim()) {
    return { ...row, icon: row.icon.trim() }
  }
  if (!isSrdSource(row.source as string | null | undefined)) {
    return row
  }
  const name = String(row.name ?? "")
  const icon = defaults[name] ?? null
  return { ...row, icon }
}
