import {
  EQUIPMENT_RARITIES,
  MAGIC_ITEM_CATEGORIES,
  type EquipmentRarity,
  type MagicItemCategory,
} from "@/lib/compendium/equipment-magic"
import { coerceBoolean, cleanProperties } from "@/lib/import/normalize-equipment"

const MAGIC_ITEM_CATEGORY_SET = new Set<string>(MAGIC_ITEM_CATEGORIES)
const RARITY_SET = new Set<string>(EQUIPMENT_RARITIES.map((rarity) => rarity.toLowerCase()))

const MUNDANE_EQUIPMENT_CATEGORIES = new Set([
  "Weapon",
  "Armor",
  "Adventuring Gear",
  "Tool",
  "Mount",
  "Vehicle",
  "Trade Good",
  "Other",
])

/** Magic types that never double as mundane equipment categories. */
const MAGIC_ONLY_ITEM_CATEGORIES = new Set([
  "Potion",
  "Ring",
  "Rod",
  "Scroll",
  "Staff",
  "Wand",
  "Wondrous Item",
])

function isAmbiguousMagicCategory(category: string): boolean {
  return category === "Weapon" || category === "Armor"
}

function titleCaseRarity(value: string): string {
  const lower = value.trim().toLowerCase()
  const match = EQUIPMENT_RARITIES.find((rarity) => rarity.toLowerCase() === lower)
  return match ?? value.trim()
}

function titleCaseMagicCategory(value: string): MagicItemCategory | string {
  const trimmed = value.trim()
  const match = MAGIC_ITEM_CATEGORIES.find(
    (category) => category.toLowerCase() === trimmed.toLowerCase(),
  )
  return match ?? trimmed
}

export type ParsedMagicItemSubtitle = {
  magicItemCategory: string | null
  rarity: string | null
  requiresAttunement: boolean | null
  description: string
}

/** Parse leading lines like "Wondrous Item, rare (requires attunement)". */
export function parseMagicItemSubtitle(description: string): ParsedMagicItemSubtitle | null {
  const lines = description.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return null

  const header = lines[0]
  const magicTypes = MAGIC_ITEM_CATEGORIES.join("|")
  const rarities = EQUIPMENT_RARITIES.join("|")
  const headerMatch = header.match(
    new RegExp(
      `^(${magicTypes})\\s*,?\\s*(${rarities})?(?:\\s*\\(([^)]+)\\))?\\s*$`,
      "i",
    ),
  )
  if (!headerMatch) return null

  const magicItemCategory = titleCaseMagicCategory(headerMatch[1])
  const rarity = headerMatch[2] ? titleCaseRarity(headerMatch[2]) : null
  const paren = headerMatch[3]?.trim().toLowerCase() ?? ""
  const requiresAttunement = paren.includes("requires attunement")
    ? true
    : paren.includes("does not require attunement") || paren.includes("not require attunement")
      ? false
      : null

  const remaining = lines.slice(1).join("\n\n").trim()
  return {
    magicItemCategory,
    rarity,
    requiresAttunement,
    description: remaining || description,
  }
}

function liftMagicFieldsFromProperties(
  props: Record<string, unknown>,
): {
  props: Record<string, unknown>
  rarity: string | null
  requiresAttunement: boolean | null
  magicItemCategory: string | null
} {
  const next = { ...props }
  let rarity: string | null = null
  let requiresAttunement: boolean | null = null
  let magicItemCategory: string | null = null

  if (typeof next.rarity === "string" && next.rarity.trim()) {
    rarity = titleCaseRarity(next.rarity)
    delete next.rarity
  }

  const attRaw = next.attunement ?? next.requires_attunement
  if (attRaw != null) {
    requiresAttunement = coerceBoolean(attRaw)
    delete next.attunement
    delete next.requires_attunement
  }

  if (typeof next.magic_item_category === "string" && next.magic_item_category.trim()) {
    magicItemCategory = titleCaseMagicCategory(next.magic_item_category)
    delete next.magic_item_category
  } else if (typeof next.magicItemCategory === "string" && next.magicItemCategory.trim()) {
    magicItemCategory = titleCaseMagicCategory(next.magicItemCategory)
    delete next.magicItemCategory
  }

  return { props: next, rarity, requiresAttunement, magicItemCategory }
}

/** Normalize BYO / AI equipment rows: magic type, rarity, attunement, and mundane category. */
export function coerceMagicEquipmentImportFields(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...row }
  const rawProps =
    next.properties && typeof next.properties === "object" && !Array.isArray(next.properties)
      ? ({ ...(next.properties as Record<string, unknown>) } as Record<string, unknown>)
      : {}

  const lifted = liftMagicFieldsFromProperties(rawProps)
  let rarity =
    typeof next.rarity === "string" && next.rarity.trim()
      ? titleCaseRarity(next.rarity)
      : lifted.rarity
  let requiresAttunement =
    coerceBoolean(next.requires_attunement) ?? lifted.requiresAttunement
  let magicItemCategory =
    typeof next.magic_item_category === "string" && next.magic_item_category.trim()
      ? titleCaseMagicCategory(next.magic_item_category)
      : lifted.magicItemCategory

  const category = String(next.category ?? "").trim()
  const hasMagicSignals =
    Boolean(magicItemCategory || rarity || requiresAttunement != null) ||
    Boolean(lifted.rarity || lifted.requiresAttunement != null)

  if (MAGIC_ITEM_CATEGORY_SET.has(category)) {
    const treatAsMagic =
      MAGIC_ONLY_ITEM_CATEGORIES.has(category) || (isAmbiguousMagicCategory(category) && hasMagicSignals)
    if (treatAsMagic) {
      magicItemCategory = magicItemCategory ?? titleCaseMagicCategory(category)
      next.category = isAmbiguousMagicCategory(category) ? category : "Other"
    }
  } else if (!category || !MUNDANE_EQUIPMENT_CATEGORIES.has(category)) {
    if (magicItemCategory || rarity || requiresAttunement != null) {
      next.category = "Other"
    } else if (!category) {
      next.category = "Other"
    }
  }

  if (typeof next.description === "string" && next.description.trim()) {
    const parsed = parseMagicItemSubtitle(next.description)
    if (parsed) {
      next.description = parsed.description
      magicItemCategory = magicItemCategory ?? parsed.magicItemCategory
      rarity = rarity ?? parsed.rarity
      if (requiresAttunement == null) requiresAttunement = parsed.requiresAttunement
    }
  }

  const cleanedProps = cleanProperties(lifted.props)
  next.properties = Object.keys(cleanedProps).length ? cleanedProps : null
  next.rarity = rarity
  next.requires_attunement = requiresAttunement
  next.magic_item_category = magicItemCategory

  if (
    (magicItemCategory || rarity || requiresAttunement != null) &&
    (next.cost === null || next.cost === undefined)
  ) {
    next.cost = null
  }

  return next
}

export function isEquipmentRarity(value: string): value is EquipmentRarity {
  return RARITY_SET.has(value.toLowerCase())
}
