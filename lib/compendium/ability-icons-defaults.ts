import { defaultClassIconForName } from "@/lib/compendium/class-icons-defaults"

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function eligibleClassNames(item: Record<string, unknown>): string[] {
  if (!Array.isArray(item.eligible_classes)) return []
  return item.eligible_classes
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
}

/**
 * Subclass display names that are commonly used as ability `source_name` when
 * `source_type` is `subclass`. Prefer this over treating the subclass name as a
 * class (e.g. Occultist "Witch" must not pick up Mage Hand Press Witch's icon).
 */
export const ABILITY_SUBCLASS_PARENT_CLASS: Record<string, string> = {
  // Kibbles'Tasty Inventor specializations
  Gadgetsmith: "Inventor",
  Golemsmith: "Inventor",
  Infusionsmith: "Inventor",
  Potionsmith: "Inventor",
  Thundersmith: "Inventor",
  Warsmith: "Inventor",
  Fleshsmith: "Inventor",
  Cursesmith: "Inventor",
  Runesmith: "Inventor",
  Relicsmith: "Inventor",
  // Kibbles'Tasty Occultist occult mysteries
  Witch: "Occultist",
  "Hedge Mage": "Occultist",
  Oracle: "Occultist",
  Shaman: "Occultist",
  Spiritualist: "Occultist",
  Voidwatcher: "Occultist",
  // Kibbles'Tasty Warden bonds (when abilities are subclass-scoped)
  "Bone Binder": "Warden",
  "Elemental Soul": "Warden",
  Beasthide: "Warden",
  Elderheart: "Warden",
}

function parentClassForSubclassName(subclassName: string): string | null {
  const trimmed = subclassName.trim()
  if (!trimmed) return null
  const mapped = ABILITY_SUBCLASS_PARENT_CLASS[trimmed]
  if (mapped) return mapped
  // Case-insensitive fallback
  const lower = trimmed.toLowerCase()
  for (const [name, parent] of Object.entries(ABILITY_SUBCLASS_PARENT_CLASS)) {
    if (name.toLowerCase() === lower) return parent
  }
  return null
}

function sourceTypeOf(item: Record<string, unknown>): string {
  return (
    trimString(item.source_type).toLowerCase() ||
    trimString(item.attached_to_type).toLowerCase()
  )
}

function sourceNameOf(item: Record<string, unknown>): string {
  return (
    trimString(item.source_name) ||
    (sourceTypeOf(item) === "subclass" || sourceTypeOf(item) === "class"
      ? trimString(item.attached_to_id)
      : "") ||
    ""
  )
}

/**
 * Best-effort owning class label for a custom ability (import attachment, eligible list, or source).
 * Shared multi-class libraries return null so the generic ability icon stays.
 */
export function inferAbilityOwnerClassName(item: Record<string, unknown>): string | null {
  const eligible = eligibleClassNames(item)
  if (eligible.length === 1) return eligible[0]!

  for (const key of ["parent_class_name", "class_name"] as const) {
    const value = trimString(item[key])
    if (value && defaultClassIconForName(value)) return value
  }

  const attachType = sourceTypeOf(item)
  const sourceName = sourceNameOf(item)

  // Subclass-owned libraries (Inventor upgrades, Occultist mystery knacks, …):
  // resolve to the parent class before treating source_name as a class name.
  if (attachType === "subclass" || attachType === "subclass_feature") {
    const parent =
      parentClassForSubclassName(sourceName) ||
      parentClassForSubclassName(trimString(item.source_name))
    if (parent && defaultClassIconForName(parent)) return parent
  }

  if (
    (attachType === "class" || attachType === "class_feature") &&
    sourceName &&
    defaultClassIconForName(sourceName)
  ) {
    return sourceName
  }

  const attachedId = trimString(item.attached_to_id)
  if (attachType === "class" && attachedId && defaultClassIconForName(attachedId)) {
    return attachedId
  }

  for (const key of ["source_name", "source"] as const) {
    const value = trimString(item[key])
    if (value && defaultClassIconForName(value)) return value
  }

  return null
}

/** Name-specific defaults for shared multi-class library rows (no single owner class). */
export const ABILITY_ICON_BY_NAME: Record<string, string> = {
  "Dodge Roll": "dodge",
  "Eagle Eye": "eagle-head",
  Skirmish: "sprint",
}

/**
 * Assigned icon wins unless it is the missing Gunslinger stamp (`gunshot`)
 * and a curated name default exists. Otherwise owning-class icon.
 * Unowned disciplines fall back to psychic-waves; owned ones use the class icon.
 */
export function defaultAbilityIconForItem(item: Record<string, unknown>): string | null {
  const rawAssigned = trimString(item.icon)
  // `gunshot` was stamped on Gunslinger rows, but the SVG is not shipped.
  const assigned = rawAssigned === "gunshot" ? "" : rawAssigned
  const name = trimString(item.name)
  const named = name ? ABILITY_ICON_BY_NAME[name] : undefined
  if (named && !assigned) return named
  if (assigned) return assigned

  const className = inferAbilityOwnerClassName(item)
  if (className) {
    const classIcon = defaultClassIconForName(className)
    if (classIcon) return classIcon
  }

  const role = trimString(item.ability_role).toLowerCase()
  if (role === "discipline" || /\bdiscipline\b/i.test(name)) {
    return "psychic-waves"
  }

  return null
}

/** Stamp a resolved default icon onto an ability row when none is assigned. */
export function applyDefaultAbilityIcon<T extends Record<string, unknown>>(row: T): T {
  const icon = defaultAbilityIconForItem(row)
  if (!icon) return row
  if (trimString(row.icon) === icon) return row
  return { ...row, icon }
}

type AbilityIconStampContent = {
  classes?: { name?: string | null }[] | null
  subclasses?: { name?: string | null; class_name?: string | null }[] | null
  abilities?: Record<string, unknown>[] | null
  import_proposals?: {
    custom_abilities?: Record<string, unknown>[] | null
  } | null
}

/**
 * Stamp owning-class icons onto ability rows using pack subclass→class context.
 * Used by seed-pack builds so persisted/bundled rows keep the class icon after
 * source_name is stripped at attach time.
 */
export function stampAbilityDefaultIcons<T extends AbilityIconStampContent>(content: T): T {
  const subclassParents = new Map<string, string>()
  for (const subclass of content.subclasses ?? []) {
    const name = trimString(subclass.name)
    const parent = trimString(subclass.class_name)
    if (name && parent) subclassParents.set(name, parent)
  }
  const packClasses = (content.classes ?? [])
    .map((row) => trimString(row.name))
    .filter(Boolean)
  const solePackClass = packClasses.length === 1 ? packClasses[0]! : null

  const stamp = (row: Record<string, unknown>): Record<string, unknown> => {
    if (trimString(row.icon)) return row
    const sourceType = trimString(row.source_type).toLowerCase()
    const sourceName = trimString(row.source_name)
    let parent_class_name = trimString(row.parent_class_name) || undefined
    if (!parent_class_name && (sourceType === "subclass" || sourceType === "subclass_feature")) {
      parent_class_name =
        subclassParents.get(sourceName) || parentClassForSubclassName(sourceName) || undefined
    }
    if (!parent_class_name && (sourceType === "class" || sourceType === "class_feature") && sourceName) {
      parent_class_name = sourceName
    }
    if (!parent_class_name && solePackClass && !inferAbilityOwnerClassName(row)) {
      parent_class_name = solePackClass
    }
    return applyDefaultAbilityIcon(
      parent_class_name ? { ...row, parent_class_name } : row,
    )
  }

  const abilities = Array.isArray(content.abilities)
    ? content.abilities.map((row) => stamp(row))
    : content.abilities
  const proposals = content.import_proposals?.custom_abilities
  const nextProposals = Array.isArray(proposals)
    ? {
        ...content.import_proposals,
        custom_abilities: proposals.map((row) => stamp(row)),
      }
    : content.import_proposals

  if (abilities === content.abilities && nextProposals === content.import_proposals) {
    return content
  }
  return {
    ...content,
    ...(abilities !== content.abilities ? { abilities } : {}),
    ...(nextProposals !== content.import_proposals
      ? { import_proposals: nextProposals }
      : {}),
  }
}
