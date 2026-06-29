import type { ImportContent } from "@/lib/import/content-schema"
import { combineImportContents } from "@/lib/import/merge-import-content"

/**
 * Parses Foundry VTT dnd5e system item exports into the internal ImportContent shape.
 *
 * Supports the "Export Data" JSON Foundry produces for an item, an array of such
 * items, a `{ items: [...] }` wrapper (actor / pack exports), an object map of
 * items (compendium dumps), and newline-delimited JSON (NeDB `.db` packs).
 *
 * Format reference: https://github.com/foundryvtt/dnd5e
 */

type FoundryItem = Record<string, unknown>
type ImportRecord = Record<string, unknown>

const FOUNDRY_ITEM_TYPES = new Set([
  "spell",
  "feat",
  "feature",
  "weapon",
  "equipment",
  "consumable",
  "tool",
  "loot",
  "container",
  "backpack",
  "class",
  "subclass",
  "race",
  "background",
])

const SPELL_SCHOOLS: Record<string, string> = {
  abj: "Abjuration",
  con: "Conjuration",
  div: "Divination",
  enc: "Enchantment",
  evo: "Evocation",
  ill: "Illusion",
  nec: "Necromancy",
  trs: "Transmutation",
}

const ABILITY_NAMES: Record<string, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
}

const SKILL_NAMES: Record<string, string> = {
  acr: "Acrobatics",
  ani: "Animal Handling",
  arc: "Arcana",
  ath: "Athletics",
  dec: "Deception",
  his: "History",
  ins: "Insight",
  itm: "Intimidation",
  inv: "Investigation",
  med: "Medicine",
  nat: "Nature",
  prc: "Perception",
  prf: "Performance",
  per: "Persuasion",
  rel: "Religion",
  slt: "Sleight of Hand",
  ste: "Stealth",
  sur: "Survival",
}

const ARMOR_NAMES: Record<string, string> = {
  lgt: "Light",
  med: "Medium",
  hvy: "Heavy",
  shl: "Shield",
}

const WEAPON_PROFICIENCY_NAMES: Record<string, string> = {
  sim: "Simple weapons",
  mar: "Martial weapons",
}

const WEAPON_PROPERTY_LABELS: Record<string, string> = {
  ada: "Adamantine",
  amm: "Ammunition",
  fin: "Finesse",
  fir: "Firearm",
  foc: "Focus",
  hvy: "Heavy",
  lgt: "Light",
  lod: "Loading",
  mgc: "Magical",
  rch: "Reach",
  rel: "Reload",
  ret: "Returning",
  sil: "Silvered",
  spc: "Special",
  thr: "Thrown",
  two: "Two-Handed",
  ver: "Versatile",
}

const RARITY_NAMES: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  veryrare: "Very Rare",
  legendary: "Legendary",
  artifact: "Artifact",
}

const SIZE_NAMES: Record<string, string> = {
  tiny: "Tiny",
  sm: "Small",
  med: "Medium",
  lg: "Large",
  huge: "Huge",
  grg: "Gargantuan",
}

const WEAPON_SUBCATEGORIES: Record<string, string> = {
  simpleM: "Simple Melee",
  simpleR: "Simple Ranged",
  martialM: "Martial Melee",
  martialR: "Martial Ranged",
  natural: "Natural",
  improv: "Improvised",
  siege: "Siege",
}

const FEAT_CATEGORIES: Record<string, string> = {
  origin: "Origin",
  epicboon: "Epic Boon",
  fightingstyle: "Fighting Style",
  general: "General",
}

// ---------------------------------------------------------------------------
// Small value coercion helpers
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Foundry serializes Sets to arrays; tolerate stray objects too. */
function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }
  return []
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function abilityName(code: string): string {
  return ABILITY_NAMES[code.toLowerCase()] ?? (code ? titleCase(code) : "")
}

/**
 * Removes Foundry-specific enrichers from HTML/markdown so descriptions render
 * cleanly: @UUID/@Compendium/@Check/@Damage links, &Reference blocks, and
 * inline roll syntax like [[/r 1d6]].
 */
export function cleanFoundryHtml(raw: unknown): string {
  let text = asString(raw)
  if (!text) return ""

  // @Enricher[args]{Label} and &Enricher[args]{Label} → keep the label
  text = text.replace(/[@&][A-Za-z]+\[[^\]]*\]\{([^}]*)\}/g, "$1")
  // @Enricher[args] / &Enricher[args] with no label → drop entirely
  text = text.replace(/[@&][A-Za-z]+\[[^\]]*\]/g, "")
  // [[ ... ]]{Label} inline rolls with label
  text = text.replace(/\[\[[^\]]*\]\]\{([^}]*)\}/g, "$1")
  // [[/r 1d6]] / [[/save dex 15]] → keep the inner expression
  text = text.replace(/\[\[\s*\/?[a-z]*\s*([^\]]*?)\s*\]\]/gi, "$1")
  // Collapse whitespace introduced by removals
  text = text.replace(/[ \t]{2,}/g, " ").replace(/\s+\n/g, "\n")

  return text.trim()
}

// ---------------------------------------------------------------------------
// Spell field formatters
// ---------------------------------------------------------------------------

const ACTIVATION_LABELS: Record<string, string> = {
  minute: "Minute",
  hour: "Hour",
  day: "Day",
  legendary: "Legendary Action",
  lair: "Lair Action",
  crew: "Crew Action",
}

function firstActivityActivation(system: Record<string, unknown>): {
  type: string
  cost: number | null
} {
  const activities = asRecord(system.activities)
  for (const key of Object.keys(activities)) {
    const activity = asRecord(activities[key])
    const activation = asRecord(activity.activation)
    const type = asString(activation.type)
    if (type) return { type, cost: asNumber(activation.value) }
  }
  return { type: "", cost: null }
}

function formatCastingTime(system: Record<string, unknown>): string {
  const activation = asRecord(system.activation)
  let type = asString(activation.type)
  let cost = asNumber(activation.cost)

  if (!type) {
    const fromActivity = firstActivityActivation(system)
    type = fromActivity.type
    cost = fromActivity.cost
  }

  if (!type) return ""
  if (type === "action") return "1 Action"
  if (type === "bonus") return "1 Bonus Action"
  if (type === "reaction") return "1 Reaction"
  if (type === "special") return "Special"

  const label = ACTIVATION_LABELS[type] ?? capitalize(type)
  const n = cost ?? 1
  return `${n} ${label}${n > 1 ? "s" : ""}`
}

function formatRange(range: Record<string, unknown>): string {
  const units = asString(range.units)
  const value = asNumber(range.value)
  switch (units) {
    case "self":
      return "Self"
    case "touch":
      return "Touch"
    case "spec":
      return "Special"
    case "any":
      return "Any"
    case "mi":
      return value != null ? `${value} mile${value === 1 ? "" : "s"}` : "Special"
    case "ft":
    case "":
      return value != null ? `${value} feet` : ""
    default:
      return value != null ? `${value} ${units}` : capitalize(units)
  }
}

const DURATION_UNIT_LABELS: Record<string, string> = {
  turn: "Turn",
  round: "Round",
  minute: "Minute",
  hour: "Hour",
  day: "Day",
  month: "Month",
  year: "Year",
}

function formatDuration(duration: Record<string, unknown>, concentration: boolean): string {
  const units = asString(duration.units)
  const value = asNumber(duration.value)

  if (units === "inst") return "Instantaneous"
  if (units === "perm" || units === "disp") return "Until dispelled"
  if (units === "spec") return "Special"

  const label = DURATION_UNIT_LABELS[units]
  if (!label) {
    if (concentration) return "Concentration"
    return units ? capitalize(units) : "Instantaneous"
  }

  const n = value ?? 1
  const timeStr = `${n} ${label.toLowerCase()}${n === 1 ? "" : "s"}`
  return concentration
    ? `Concentration, up to ${timeStr}`
    : `${n} ${label}${n === 1 ? "" : "s"}`
}

// ---------------------------------------------------------------------------
// Per-type mappers
// ---------------------------------------------------------------------------

type SpellImport = NonNullable<ImportContent["spells"]>[number]
type FeatImport = NonNullable<ImportContent["feats"]>[number]
type EquipmentImport = NonNullable<ImportContent["equipment"]>[number]
type ClassImport = NonNullable<ImportContent["classes"]>[number]
type SubclassImport = NonNullable<ImportContent["subclasses"]>[number]
type SpeciesImport = NonNullable<ImportContent["species"]>[number]
type BackgroundImport = NonNullable<ImportContent["backgrounds"]>[number]

function mapSpell(item: FoundryItem): SpellImport | null {
  const name = asString(item.name).trim()
  if (!name) return null
  const system = asRecord(item.system)

  const properties = asStringArray(system.properties)
  const legacy = asRecord(system.components)
  const hasV = properties.includes("vocal") || legacy.vocal === true
  const hasS = properties.includes("somatic") || legacy.somatic === true
  const hasM = properties.includes("material") || legacy.material === true
  const concentration = properties.includes("concentration") || legacy.concentration === true
  const ritual = properties.includes("ritual") || legacy.ritual === true

  const components: string[] = []
  if (hasV) components.push("V")
  if (hasS) components.push("S")
  if (hasM) components.push("M")

  let description = cleanFoundryHtml(asRecord(system.description).value)
  const materialText = asString(asRecord(system.materials).value).trim()
  if (hasM && materialText) {
    description = `${description}\n\n<p><em>Material:</em> ${materialText}</p>`.trim()
  }

  const schoolCode = asString(system.school).toLowerCase()
  const sourceClass = asString(system.sourceClass).trim()
  const castingTime = formatCastingTime(system)

  return {
    name,
    level: asNumber(system.level) ?? 0,
    school: SPELL_SCHOOLS[schoolCode] ?? (asString(system.school) || "Unknown"),
    casting_time: ritual && castingTime ? `${castingTime} (ritual)` : castingTime || null,
    range: formatRange(asRecord(system.range)) || null,
    components: components.length > 0 ? components : null,
    duration: formatDuration(asRecord(system.duration), concentration) || null,
    concentration,
    description: description || null,
    classes: sourceClass ? [titleCase(sourceClass)] : null,
  }
}

function mapFeat(item: FoundryItem): FeatImport | null {
  const name = asString(item.name).trim()
  if (!name) return null
  const system = asRecord(item.system)

  const description = cleanFoundryHtml(asRecord(system.description).value)
  const requirements = cleanFoundryHtml(system.requirements).trim()
  const prereqLevel = asNumber(asRecord(system.prerequisites).level)
  const prerequisite = requirements || (prereqLevel ? `Level ${prereqLevel}` : null) || null

  const subtype = asString(asRecord(system.type).subtype).toLowerCase()
  const category = (FEAT_CATEGORIES[subtype] ?? "General") as FeatImport["category"]

  return {
    name,
    description: description || null,
    prerequisite,
    category,
  }
}

function equipmentCategoryInfo(
  type: string,
  system: Record<string, unknown>,
): { category: string; subcategory: string | null } {
  const subType = asString(asRecord(system.type).value)
  switch (type) {
    case "weapon":
      return { category: "Weapon", subcategory: WEAPON_SUBCATEGORIES[subType] ?? null }
    case "equipment":
      if (subType === "light" || subType === "medium" || subType === "heavy") {
        return { category: "Armor", subcategory: `${capitalize(subType)} Armor` }
      }
      if (subType === "shield") return { category: "Armor", subcategory: "Shield" }
      return { category: "Adventuring Gear", subcategory: subType ? titleCase(subType) : null }
    case "tool":
      return { category: "Tool", subcategory: subType ? titleCase(subType) : null }
    case "consumable":
      return { category: "Adventuring Gear", subcategory: subType ? titleCase(subType) : "Consumable" }
    case "loot":
      if (subType === "tradeGood" || subType === "treasure") {
        return { category: "Trade Good", subcategory: null }
      }
      return { category: "Adventuring Gear", subcategory: subType ? titleCase(subType) : null }
    case "container":
    case "backpack":
      return { category: "Adventuring Gear", subcategory: "Container" }
    default:
      return { category: "Adventuring Gear", subcategory: null }
  }
}

function magicItemCategory(
  type: string,
  system: Record<string, unknown>,
): string | null {
  const subType = asString(asRecord(system.type).value)
  switch (type) {
    case "weapon":
      return "Weapon"
    case "equipment":
      if (["light", "medium", "heavy", "shield"].includes(subType)) return "Armor"
      return "Wondrous Item"
    case "consumable":
      if (subType === "potion") return "Potion"
      if (subType === "scroll") return "Scroll"
      if (subType === "wand") return "Wand"
      if (subType === "rod") return "Rod"
      return "Wondrous Item"
    default:
      return "Wondrous Item"
  }
}

function buildEquipmentProperties(
  type: string,
  system: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  if (type === "weapon") {
    const damage = asRecord(system.damage)
    const base = asRecord(damage.base)
    const denomination = asNumber(base.denomination)
    if (denomination) {
      const num = asNumber(base.number) ?? 1
      const types = asStringArray(base.types)
        .map((t) => titleCase(t))
        .filter(Boolean)
      out.damage = `${num}d${denomination}${types.length ? ` ${types.join("/")}` : ""}`
    } else if (Array.isArray(damage.parts) && damage.parts.length > 0) {
      const first = damage.parts[0]
      if (Array.isArray(first) && first.length > 0) {
        const formula = asString(first[0])
        const dtype = asString(first[1])
        if (formula) out.damage = `${formula}${dtype ? ` ${titleCase(dtype)}` : ""}`
      }
    }
  }

  if (type === "equipment") {
    const armor = asRecord(system.armor)
    const ac = asNumber(armor.value)
    if (ac != null) out.ac = String(ac)
  }

  const propertyCodes = asStringArray(system.properties)
  const propertyNames = propertyCodes
    .map((code) => WEAPON_PROPERTY_LABELS[code] ?? titleCase(code))
    .filter(Boolean)
  if (propertyNames.length > 0) out.properties = propertyNames

  return out
}

function mapEquipment(item: FoundryItem): EquipmentImport | null {
  const name = asString(item.name).trim()
  if (!name) return null
  const type = asString(item.type)
  const system = asRecord(item.system)

  const { category, subcategory } = equipmentCategoryInfo(type, system)
  const description = cleanFoundryHtml(asRecord(system.description).value)

  const price = asRecord(system.price)
  const priceValue = asNumber(price.value)
  const cost =
    priceValue != null
      ? { amount: priceValue, unit: (asString(price.denomination) || "gp").toUpperCase() }
      : null

  const weight = asNumber(system.weight) ?? asNumber(asRecord(system.weight).value)

  const rarity = RARITY_NAMES[asString(system.rarity).toLowerCase()] ?? null
  const attunement = asString(system.attunement).toLowerCase()
  const requiresAttunement =
    attunement === "required" ? true : rarity || attunement === "optional" ? false : null

  return {
    name,
    category,
    subcategory,
    description: description || null,
    cost,
    weight,
    properties: buildEquipmentProperties(type, system),
    requires_attunement: requiresAttunement,
    magic_item_category: rarity ? magicItemCategory(type, system) : null,
    rarity,
  }
}

// --- Class / subclass / species / background advancement parsing -----------

function parseTraitAdvancements(advancements: unknown[]): {
  saves: string[]
  armor: string[]
  weapons: string[]
  skillChoice: { count: number; options: string[] } | null
} {
  const saves = new Set<string>()
  const armor = new Set<string>()
  const weapons = new Set<string>()
  let skillChoice: { count: number; options: string[] } | null = null

  const applyKey = (key: string) => {
    const [group, code] = key.split(":")
    if (group === "saves" && ABILITY_NAMES[code]) saves.add(ABILITY_NAMES[code])
    else if (group === "armor" && ARMOR_NAMES[code]) armor.add(ARMOR_NAMES[code])
    else if (group === "weapon" && WEAPON_PROFICIENCY_NAMES[code]) {
      weapons.add(WEAPON_PROFICIENCY_NAMES[code])
    }
  }

  for (const entry of advancements) {
    const adv = asRecord(entry)
    if (asString(adv.type) !== "Trait") continue
    const config = asRecord(adv.configuration)

    for (const key of asStringArray(config.grants)) applyKey(key)

    for (const choice of asArray(config.choices)) {
      const choiceRec = asRecord(choice)
      const pool = asStringArray(choiceRec.pool)
      const count = asNumber(choiceRec.count) ?? 1
      const skillOptions = pool
        .filter((k) => k.startsWith("skills:"))
        .map((k) => SKILL_NAMES[k.split(":")[1]])
        .filter(Boolean)
      if (skillOptions.length > 0 && !skillChoice) {
        skillChoice = { count, options: skillOptions }
      }
      for (const key of pool) {
        if (key.startsWith("armor:") || key.startsWith("weapon:") || key.startsWith("saves:")) {
          applyKey(key)
        }
      }
    }
  }

  return {
    saves: [...saves],
    armor: [...armor],
    weapons: [...weapons],
    skillChoice,
  }
}

function parseHitDie(system: Record<string, unknown>): number {
  const hd = asRecord(system.hd)
  const denomination = asString(hd.denomination) || asString(system.hitDice)
  const match = denomination.match(/d(\d+)/i)
  if (match) return parseInt(match[1], 10)
  const direct = asNumber(hd.denomination) ?? asNumber(system.hitDice)
  return direct ?? 8
}

function mapClass(item: FoundryItem): ClassImport | null {
  const name = asString(item.name).trim()
  if (!name) return null
  const system = asRecord(item.system)

  const traits = parseTraitAdvancements(asArray(system.advancement))
  const primary = asStringArray(asRecord(system.primaryAbility).value)
    .map(abilityName)
    .filter(Boolean)

  const spellcastingRaw = asRecord(system.spellcasting)
  const progression = asString(spellcastingRaw.progression)
  const spellAbility = abilityName(asString(spellcastingRaw.ability))
  const spellcasting =
    progression && progression !== "none" && spellAbility ? { ability: spellAbility } : null

  return {
    name,
    description: cleanFoundryHtml(asRecord(system.description).value) || null,
    hit_die: parseHitDie(system),
    primary_ability: primary.length > 0 ? primary : null,
    saving_throws: traits.saves.length > 0 ? traits.saves : null,
    armor_proficiencies: traits.armor.length > 0 ? traits.armor : null,
    weapon_proficiencies: traits.weapons.length > 0 ? traits.weapons : null,
    skill_choices: traits.skillChoice,
    spellcasting,
    features: [],
  }
}

function mapSubclass(item: FoundryItem): SubclassImport | null {
  const name = asString(item.name).trim()
  if (!name) return null
  const system = asRecord(item.system)
  const classIdentifier = asString(system.classIdentifier)

  return {
    name,
    class_name: classIdentifier ? titleCase(classIdentifier) : "Unknown",
    description: cleanFoundryHtml(asRecord(system.description).value) || null,
    features: [],
  }
}

function parseRaceSize(system: Record<string, unknown>): string | null {
  for (const entry of asArray(system.advancement)) {
    const adv = asRecord(entry)
    if (asString(adv.type) !== "Size") continue
    const sizes = asStringArray(asRecord(adv.configuration).sizes)
    if (sizes.length > 0) return SIZE_NAMES[sizes[0]] ?? titleCase(sizes[0])
  }
  return null
}

function mapSpecies(item: FoundryItem): SpeciesImport | null {
  const name = asString(item.name).trim()
  if (!name) return null
  const system = asRecord(item.system)
  const movement = asRecord(system.movement)

  return {
    name,
    description: cleanFoundryHtml(asRecord(system.description).value) || null,
    speed: asNumber(movement.walk),
    size: parseRaceSize(system),
    traits: [],
  }
}

function mapBackground(item: FoundryItem): BackgroundImport | null {
  const name = asString(item.name).trim()
  if (!name) return null
  const system = asRecord(item.system)
  const traits = parseTraitAdvancements(asArray(system.advancement))
  const skills = traits.skillChoice?.options ?? []

  return {
    name,
    description: cleanFoundryHtml(asRecord(system.description).value) || null,
    skill_proficiencies: skills.length > 0 ? skills : null,
    feat_granted: null,
    ability_bonuses: null,
  }
}

// ---------------------------------------------------------------------------
// Input coercion + detection
// ---------------------------------------------------------------------------

function isFoundryItemShape(value: unknown): value is FoundryItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const type = record.type
  if (typeof type !== "string" || !FOUNDRY_ITEM_TYPES.has(type)) return false
  // Foundry items always carry a `system` block; require name too to avoid noise.
  return "system" in record && typeof record.name === "string"
}

function collectFoundryItems(value: unknown, out: FoundryItem[]): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectFoundryItems(entry, out)
    return
  }
  if (isFoundryItemShape(value)) {
    out.push(value)
    return
  }
  const record = asRecord(value)
  // `{ items: [...] }` actor/pack wrapper, or object-map of items.
  if (Array.isArray(record.items)) {
    for (const entry of record.items) collectFoundryItems(entry, out)
    return
  }
  if (Array.isArray(record.entries)) {
    for (const entry of record.entries) collectFoundryItems(entry, out)
  }
}

/** Parse plain JSON, JSON array, wrapper objects, or newline-delimited NeDB packs. */
function coerceFoundryItems(raw: string): FoundryItem[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const items: FoundryItem[] = []
  try {
    collectFoundryItems(JSON.parse(trimmed), items)
    if (items.length > 0) return items
  } catch {
    // Not a single JSON document — fall through to NeDB line parsing.
  }

  if (items.length === 0 && /\n/.test(trimmed)) {
    for (const line of trimmed.split(/\r?\n/)) {
      const lineTrimmed = line.trim()
      if (!lineTrimmed || lineTrimmed === "{}") continue
      try {
        const parsed = JSON.parse(lineTrimmed)
        if (isFoundryItemShape(parsed)) items.push(parsed)
      } catch {
        // skip malformed line
      }
    }
  }

  return items
}

/** True when the raw text looks like a Foundry VTT dnd5e item export. */
export function isFoundryDnd5eJson(raw: string): boolean {
  return coerceFoundryItems(raw).length > 0
}

/** Map a list of Foundry items into ImportContent (no DB access). */
export function foundryItemsToImportContent(items: FoundryItem[]): ImportContent | null {
  const spells: SpellImport[] = []
  const feats: FeatImport[] = []
  const equipment: EquipmentImport[] = []
  const classes: ClassImport[] = []
  const subclasses: SubclassImport[] = []
  const species: SpeciesImport[] = []
  const backgrounds: BackgroundImport[] = []

  for (const item of items) {
    switch (asString(item.type)) {
      case "spell": {
        const mapped = mapSpell(item)
        if (mapped) spells.push(mapped)
        break
      }
      case "feat":
      case "feature": {
        const mapped = mapFeat(item)
        if (mapped) feats.push(mapped)
        break
      }
      case "weapon":
      case "equipment":
      case "consumable":
      case "tool":
      case "loot":
      case "container":
      case "backpack": {
        const mapped = mapEquipment(item)
        if (mapped) equipment.push(mapped)
        break
      }
      case "class": {
        const mapped = mapClass(item)
        if (mapped) classes.push(mapped)
        break
      }
      case "subclass": {
        const mapped = mapSubclass(item)
        if (mapped) subclasses.push(mapped)
        break
      }
      case "race": {
        const mapped = mapSpecies(item)
        if (mapped) species.push(mapped)
        break
      }
      case "background": {
        const mapped = mapBackground(item)
        if (mapped) backgrounds.push(mapped)
        break
      }
      default:
        break
    }
  }

  const total =
    spells.length +
    feats.length +
    equipment.length +
    classes.length +
    subclasses.length +
    species.length +
    backgrounds.length

  if (total === 0) return null

  const content: ImportContent = {}
  if (spells.length) content.spells = spells
  if (feats.length) content.feats = feats
  if (equipment.length) content.equipment = equipment
  if (classes.length) content.classes = classes
  if (subclasses.length) content.subclasses = subclasses
  if (species.length) content.species = species
  if (backgrounds.length) content.backgrounds = backgrounds

  // Round-trip through the combiner to dedupe spell libraries / merge cleanly.
  return combineImportContents([content])
}

/** Parse a Foundry VTT dnd5e JSON export into ImportContent, or null if not Foundry data. */
export function parseFoundryDnd5eJson(raw: string): ImportContent | null {
  const items = coerceFoundryItems(raw)
  if (items.length === 0) return null
  return foundryItemsToImportContent(items)
}
