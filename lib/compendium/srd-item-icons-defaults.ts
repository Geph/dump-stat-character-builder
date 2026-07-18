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

/** Default game-icons.net slugs for feats (from local MySQL / curated PHB + SRD set). */
export const SRD_FEAT_ICONS_BY_NAME: Record<string, string> = {
  Actor: "theater-curtains",
  Alert: "extra-lucid",
  Archery: "bowman",
  Athlete: "jump-across",
  "Blind Fighting": "blindfold",
  "Boon of Combat Prowess": "running-ninja",
  "Boon of Dimensional Travel": "magic-portal",
  "Boon of Fate": "card-pickup",
  "Boon of Irresistible Offense": "swords-power",
  "Boon of Spell Recall": "book-storm",
  "Boon of the Night Spirit": "ghost",
  "Boon of Truesight": "sheikah-eye",
  Charger: "ram-profile",
  Chef: "cook",
  Crafter: "stone-crafting",
  "Crossbow Expert": "crossbow",
  Crusher: "armor-punch",
  Defense: "layered-armor",
  "Defensive Duelist": "sword-clash",
  "Dual Wielder": "rogue",
  Dueling: "sword-hilt",
  Durable: "life-bar",
  "Elemental Adept": "fire-silhouette",
  "Fey Touched": "fairy",
  Grappler: "grab",
  "Great Weapon Fighting": "glaive",
  "Great Weapon Master": "halberd",
  Healer: "healing",
  "Heavily Armored": "cape-armor",
  "Heavy Armor Master": "leather-armor",
  "Inspiring Leader": "vertical-banner",
  Interception: "crenulated-shield",
  "Keen Mind": "brainstorm",
  "Lightly Armored": "ninja-armor",
  Lucky: "clover",
  "Mage Slayer": "broken-shield",
  "Magic Initiate": "magic-hat",
  "Martial Weapon Training": "war-axe",
  "Medium Armor Master": "heart-armor",
  "Moderately Armored": "chest-armor",
  Musician: "music-spell",
  Observant: "observatory",
  Piercer: "pierced-body",
  Poisoner: "bloody-sword",
  "Polearm Master": "spears",
  Protection: "bolt-shield",
  Resilient: "heart-shield",
  "Ritual Caster": "meeple-circle",
  "Savage Attacker": "sword-clash",
  Sentinel: "battle-gear",
  "Shadow Touched": "two-shadows",
  Sharpshooter: "headshot",
  "Shield Master": "shield-bash",
  "Skill Expert": "book-aura",
  Skilled: "diploma",
  Skulker: "stealth-bomber",
  Slasher: "saber-slash",
  Speedy: "fast-forward-button",
  "Spell Sniper": "ion-cannon-blast",
  "Tavern Brawler": "tavern-sign",
  Telekinetic: "brain-dump",
  Telepathic: "telepathy",
  "Thrown Weapon Fighting": "flying-dagger",
  Tough: "heart-plus",
  "Two-Weapon Fighting": "rogue",
  "Unarmed Fighting": "punch-blast",
  "War Caster": "magic-shield",
  "Weapon Master": "battered-axe",
}

/**
 * Apply a default icon by row name when none is set.
 * Unlike applySrdItemIcon, does not require an SRD source (PHB feats use the same map).
 */
export function applyNamedItemIcon(
  row: Record<string, unknown>,
  defaults: Record<string, string>,
): Record<string, unknown> {
  if (typeof row.icon === "string" && row.icon.trim()) {
    return { ...row, icon: row.icon.trim() }
  }
  const name = String(row.name ?? "")
  const icon = defaults[name] ?? null
  return { ...row, icon }
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
  return applyNamedItemIcon(row, defaults)
}
