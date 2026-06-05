#!/usr/bin/env node
import { readdir, writeFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const iconsDir = join(root, "public", "icons")

/** Mirrors lib/icons/categories.ts — keep keyword lists in sync for build-time manifest. */
const ICON_CATEGORIES = [
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
      "hand", "finger", "eye", "skull", "head", "brain", "heart", "bone", "foot",
      "leg", "arm", "mouth", "tooth", "ear", "nose", "face", "body", "fist",
      "muscle", "blood", "organ", "rib", "spine",
    ],
  },
  {
    id: "magic",
    label: "Magic",
    keywords: [
      "magic", "spell", "wizard", "wand", "potion", "scroll", "rune", "crystal",
      "enchant", "arcane", "mystic", "hex", "curse", "charm", "ritual", "alchemy",
      "sparkle", "star", "moon", "sun", "fireball", "lightning", "frost", "holy",
    ],
  },
  {
    id: "item",
    label: "Item & Object",
    keywords: [
      "book", "key", "chest", "coin", "gem", "ring", "crown", "torch", "lantern",
      "map", "compass", "bottle", "flask", "bag", "backpack", "tool", "gear",
      "anvil", "hammer", "pick", "rope", "chain", "lock", "door", "gate", "banner",
      "flag", "medal", "trophy", "gift", "box", "crate", "barrel", "pouch",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    keywords: [
      "tree", "leaf", "flower", "plant", "mountain", "rock", "stone", "water",
      "wave", "rain", "snow", "wind", "cloud", "forest", "grass", "vine", "root",
      "seed", "mushroom", "cactus", "volcano", "cave", "river", "lake", "island",
    ],
  },
  {
    id: "symbol",
    label: "Symbol & UI",
    keywords: [
      "check", "cross", "plus", "minus", "arrow", "circle", "square", "triangle",
      "diamond", "question", "exclamation", "info", "gear", "settings", "menu",
      "target", "crosshair", "radar", "clock", "hourglass", "calendar", "bookmark",
      "tag", "label", "badge", "medal", "rank", "level",
    ],
  },
]

function categorizeIcons(icons) {
  const byCategory = new Map()
  for (const cat of ICON_CATEGORIES) {
    byCategory.set(cat.id, [])
  }
  byCategory.set("other", [])

  for (const name of icons) {
    const lower = name.toLowerCase()
    let matched = false
    for (const cat of ICON_CATEGORIES) {
      if (cat.keywords.some((kw) => lower.includes(kw))) {
        byCategory.get(cat.id)?.push(name)
        matched = true
        break
      }
    }
    if (!matched) {
      byCategory.get("other")?.push(name)
    }
  }

  for (const [, list] of byCategory) {
    list.sort()
  }
  return byCategory
}

const files = await readdir(iconsDir)
const icons = files
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.replace(/\.svg$/, ""))
  .sort()

const byCategory = categorizeIcons(icons)
const categories = [
  ...ICON_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: byCategory.get(c.id)?.length ?? 0,
    icons: byCategory.get(c.id) ?? [],
  })),
  {
    id: "other",
    label: "Other",
    count: byCategory.get("other")?.length ?? 0,
    icons: byCategory.get("other") ?? [],
  },
]

const manifest = {
  generatedAt: new Date().toISOString(),
  total: icons.length,
  categories: categories.map(({ id, label, count }) => ({ id, label, count })),
  byCategory: Object.fromEntries(categories.map((c) => [c.id, c.icons])),
  icons,
}

await writeFile(
  join(iconsDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
)

console.log(`Wrote ${icons.length} icons to public/icons/manifest.json`)
