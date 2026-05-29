/**
 * Icon categories inspired by game-icons.net tag groups.
 * @see https://game-icons.net/tags.html
 */
export const ICON_CATEGORIES = [
  {
    id: "weapon",
    label: "Weapon",
    keywords: [
      "sword", "axe", "bow", "arrow", "dagger", "spear", "mace", "hammer", "blade",
      "shield", "gun", "rifle", "crossbow", "knife", "halberd", "trident", "javelin",
      "club", "flail", "sling", "weapon", "bomb", "grenade", "cannon", "revolver",
      "pistol", "lance", "scimitar", "rapier", "warhammer", "shuriken", "boomerang",
      "whip", "bolt", "quiver", "sabre", "saber", "katana", "scythe", "staff",
    ],
  },
  {
    id: "animal",
    label: "Animal",
    keywords: [
      "wolf", "bear", "snake", "bird", "eagle", "horse", "cat", "dog", "spider",
      "fish", "whale", "lion", "tiger", "elephant", "rat", "bat", "bee", "bug",
      "insect", "paw", "claw", "beast", "animal", "mammal", "reptile", "octopus",
      "crab", "turtle", "dinosaur", "dragon", "griffin", "unicorn", "deer", "boar",
      "crow", "owl", "hawk", "fang", "hoof", "tail", "wing",
    ],
  },
  {
    id: "creature",
    label: "Creature & Monster",
    keywords: [
      "monster", "demon", "devil", "undead", "zombie", "skeleton", "ghost", "vampire",
      "orc", "goblin", "troll", "ogre", "slime", "golem", "elemental", "lich",
      "wraith", "ghoul", "imp", "fiend", "aberration", "mutant", "alien",
    ],
  },
  {
    id: "body",
    label: "Body",
    keywords: [
      "hand", "finger", "fist", "arm", "leg", "foot", "head", "face", "eye", "skull",
      "bone", "heart", "brain", "mouth", "tooth", "ear", "nose", "person", "body",
      "anatomy", "torso",
    ],
  },
  {
    id: "armor",
    label: "Armor & Clothing",
    keywords: [
      "armor", "armour", "helmet", "helm", "gauntlet", "boot", "chestplate",
      "breastplate", "robe", "cloak", "crown", "hat", "mask", "trouser", "shirt",
      "ring", "amulet", "necklace", "gem", "jewel",
    ],
  },
  {
    id: "magic",
    label: "Magic & Symbol",
    keywords: [
      "magic", "spell", "wizard", "witch", "rune", "crystal", "potion", "flask",
      "scroll", "wand", "staff", "orb", "star", "moon", "sun", "symbol", "sigil",
      "pentagram", "holy", "divine", "arcane", "enchant", "curse",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    keywords: [
      "tree", "leaf", "flower", "plant", "mushroom", "rock", "stone", "mountain",
      "fire", "flame", "water", "wave", "ice", "snow", "lightning", "thunder",
      "wind", "cloud", "rain", "volcano", "forest", "wood", "root", "seed",
    ],
  },
  {
    id: "tool",
    label: "Tool & Machine",
    keywords: [
      "tool", "gear", "cog", "wrench", "hammer", "pickaxe", "shovel", "rope",
      "chain", "lock", "key", "chest", "crate", "barrel", "machine", "robot",
      "engine", "clock", "anvil", "forge",
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    keywords: [
      "food", "meat", "bread", "cheese", "apple", "fruit", "vegetable", "cake",
      "drink", "bottle", "mug", "beer", "wine", "feast", "cooking", "kitchen",
    ],
  },
  {
    id: "building",
    label: "Building & Place",
    keywords: [
      "house", "castle", "tower", "gate", "door", "bridge", "temple", "church",
      "dungeon", "cave", "map", "flag", "camp", "tent", "throne", "pillar",
    ],
  },
  {
    id: "action",
    label: "Action & Sport",
    keywords: [
      "jump", "run", "climb", "swim", "throw", "catch", "kick", "punch", "sport",
      "ball", "target", "archery", "fishing", "dice", "card", "chess",
    ],
  },
] as const

export type IconCategoryId = (typeof ICON_CATEGORIES)[number]["id"] | "other"

export function getIconCategory(iconName: string): IconCategoryId {
  const lower = iconName.toLowerCase()
  for (const cat of ICON_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return cat.id
    }
  }
  return "other"
}

export function categorizeIcons(iconNames: string[]): Map<IconCategoryId, string[]> {
  const map = new Map<IconCategoryId, string[]>()
  for (const cat of ICON_CATEGORIES) {
    map.set(cat.id, [])
  }
  map.set("other", [])
  for (const name of iconNames) {
    const cat = getIconCategory(name)
    map.get(cat)!.push(name)
  }
  return map
}
