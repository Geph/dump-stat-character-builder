/**
 * One-shot: remove paid-subclass abilities from bundled MHP seed JSON
 * (same rules as build-example-seed-packs filterMhpContent).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Compile-free duplicate of allowlist matching (keep in sync with mage-hand-press-free-subclasses.ts).
const MHP_FREE_SUBCLASSES_BY_CLASS = {
  Alchemist: ["Mutagenist", "Mad Bomber", "Apothecary"],
  Captain: ["Lion Banner", "Jolly Roger", "Eagle Banner"],
  Craftsman: ["Calibarons' Guild", "Bladeworkers' Guild", "Armigers' Guild"],
  Dancer: ["Fencer", "Courtesan", "Acrobat"],
  Gunslinger: ["Pistolero", "Gun Tank", "Deadeye"],
  Investigator: ["Occultist", "Exterminator", "Detective"],
  Martyr: ["Burden of Truth", "Burden of Revolution", "Burden of Mercy"],
  Necromancer: ["Cyberghoul", "Pale Master", "Overlord", "Death Knight"],
  Vagabond: ["Ronin", "Mage Brand", "Houndmaster"],
  Warden: ["Verdant Protector", "Grey Watchman", "Beastblood Guardian"],
  Warmage: [
    "House of Rooks",
    "House of Pawns",
    "House of Knights",
    "House of Kings",
    "House of Bishops",
  ],
  Witch: ["Black Magic", "Green Magic", "Red Magic", "White Magic"],
}

const SUBCLASS_ALIASES = {
  "calibaron's guild": "calibarons' guild",
  "calibarons guild": "calibarons' guild",
  "bladeworker's guild": "bladeworkers' guild",
  "bladeworkers guild": "bladeworkers' guild",
  "armiger's guild": "armigers' guild",
  "armigers guild": "armigers' guild",
  "rōnin": "ronin",
  ronin: "ronin",
}

function normalizeSubclassMatchKey(name) {
  const stripped = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return SUBCLASS_ALIASES[stripped] ?? stripped
}

const ALLOW = new Set()
for (const names of Object.values(MHP_FREE_SUBCLASSES_BY_CLASS)) {
  for (const name of names) ALLOW.add(normalizeSubclassMatchKey(name))
}

function isFree(name) {
  if (!name?.trim()) return false
  return ALLOW.has(normalizeSubclassMatchKey(name))
}

function extractMentions(text) {
  if (!text?.trim()) return []
  const mentions = []
  for (const re of [/House of [A-Za-z]+/g, /[A-Za-z][\w']*(?:'s)?\s+Guild/g]) {
    for (const match of text.matchAll(re)) mentions.push(match[0])
  }
  return mentions
}

function abilityAllowed(ability) {
  if (ability.source_type === "subclass" && ability.source_name && !isFree(ability.source_name)) {
    return false
  }
  const mentions = extractMentions(ability.prerequisite)
  if (mentions.length && mentions.every((m) => !isFree(m))) return false
  return true
}

const dir = join(process.cwd(), "lib/seed-packs/mage-hand-press")
let removed = 0
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f.includes("-class"))) {
  const path = join(dir, file)
  const json = JSON.parse(readFileSync(path, "utf8"))
  if (!Array.isArray(json.abilities)) continue
  const before = json.abilities.length
  json.abilities = json.abilities.filter(abilityAllowed)
  const delta = before - json.abilities.length
  if (delta > 0) {
    removed += delta
    writeFileSync(path, `${JSON.stringify(json)}\n`)
    console.log(`${file}: ${before} → ${json.abilities.length} (−${delta})`)
  } else {
    console.log(`${file}: no paid abilities`)
  }
}
console.log(`Removed ${removed} paid-subclass / paid-prereq abilities.`)
