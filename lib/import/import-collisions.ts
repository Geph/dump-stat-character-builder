import type { ImportContent } from "@/lib/import/content-schema"
import { slugClassPrefix } from "@/lib/import/third-party-resources"

export type ImportCollisionKind = "class" | "feat" | "species" | "spell" | "background" | "ability"

export type ImportCollision = {
  id: string
  kind: ImportCollisionKind
  incomingName: string
  existingName: string
  existingSource?: string | null
  suggestedName: string
  suggestedResourcePrefix?: string
}

export type ImportRenameMap = Record<string, string>

export type ImportCollisionResolution = "overwrite" | "rename"

export type ImportCollisionResolutionMap = Record<string, ImportCollisionResolution>

const COLLISION_TABLES: { kind: ImportCollisionKind; key: keyof ImportContent }[] = [
  { kind: "class", key: "classes" },
  { kind: "feat", key: "feats" },
  { kind: "species", key: "species" },
  { kind: "spell", key: "spells" },
  { kind: "background", key: "backgrounds" },
  { kind: "ability", key: "abilities" },
]

function collisionId(kind: ImportCollisionKind, name: string): string {
  return `${kind}:${name.trim().toLowerCase()}`
}

function suggestRenamedName(name: string, kind: ImportCollisionKind): string {
  const trimmed = name.trim()
  if (kind === "class") {
    if (/^fighter$/i.test(trimmed)) return "Alternate Fighter"
    if (/^psion$/i.test(trimmed)) return "KibblesTasty Psion"
    if (/^kibblestasty psion$/i.test(trimmed)) return trimmed
    if (!/\balternate\b/i.test(trimmed) && !/\bhomebrew\b/i.test(trimmed)) {
      return `${trimmed} (Alternate)`
    }
  }
  if (kind === "feat") {
    const srdStyles = ["Archery", "Defense", "Great Weapon Fighting", "Two-Weapon Fighting", "Protection"]
    if (srdStyles.some((style) => style.toLowerCase() === trimmed.toLowerCase())) {
      return `${trimmed} (Alternate)`
    }
  }
  return `${trimmed} (Imported)`
}

export function buildImportCollisions(
  content: ImportContent,
  existingByKind: Partial<Record<ImportCollisionKind, { name: string; source?: string | null }[]>>,
): ImportCollision[] {
  const collisions: ImportCollision[] = []
  const seen = new Set<string>()

  for (const { kind, key } of COLLISION_TABLES) {
    const incoming = content[key]
    if (!Array.isArray(incoming)) continue
    const existingNames = new Set(
      (existingByKind[kind] ?? []).map((row) => row.name.trim().toLowerCase()),
    )
    const existingByName = new Map(
      (existingByKind[kind] ?? []).map((row) => [row.name.trim().toLowerCase(), row]),
    )

    for (const row of incoming) {
      const name = String((row as { name: string }).name ?? "").trim()
      if (!name) continue
      const lower = name.toLowerCase()
      if (!existingNames.has(lower)) continue
      const id = collisionId(kind, name)
      if (seen.has(id)) continue
      seen.add(id)

      const suggestedName = suggestRenamedName(name, kind)
      const existing = existingByName.get(lower)
      collisions.push({
        id,
        kind,
        incomingName: name,
        existingName: existing?.name ?? name,
        existingSource: existing?.source ?? null,
        suggestedName,
        suggestedResourcePrefix:
          kind === "class" ? slugClassPrefix(suggestedName) : undefined,
      })
    }
  }

  return collisions
}

export function defaultRenameMap(collisions: ImportCollision[]): ImportRenameMap {
  const map: ImportRenameMap = {}
  for (const collision of collisions) {
    map[collision.id] = collision.suggestedName
  }
  return map
}

export function defaultCollisionResolutionMap(
  collisions: ImportCollision[],
): ImportCollisionResolutionMap {
  const map: ImportCollisionResolutionMap = {}
  for (const collision of collisions) {
    map[collision.id] = "rename"
  }
  return map
}

function effectiveRenameMap(
  collisions: ImportCollision[],
  resolutionMap: ImportCollisionResolutionMap,
  renameMap: ImportRenameMap,
): ImportRenameMap {
  const effective: ImportRenameMap = { ...renameMap }
  for (const collision of collisions) {
    if (resolutionMap[collision.id] === "overwrite") {
      effective[collision.id] = collision.incomingName
      continue
    }
    if (!effective[collision.id]) {
      effective[collision.id] = collision.suggestedName
    }
  }
  return effective
}

/** Apply collision resolutions (overwrite vs rename) before persisting. */
export function applyImportCollisionResolutions(
  content: ImportContent,
  collisions: ImportCollision[],
  resolutionMap: ImportCollisionResolutionMap,
  renameMap: ImportRenameMap = {},
): ImportContent {
  if (!collisions.length) return content
  return applyImportRenames(content, effectiveRenameMap(collisions, resolutionMap, renameMap))
}

function renamedName(
  kind: ImportCollisionKind,
  name: string,
  renameMap: ImportRenameMap,
): string {
  return renameMap[collisionId(kind, name)] ?? name
}

/** Apply user-approved renames across import content and rewrite linked references. */
export function applyImportRenames(content: ImportContent, renameMap: ImportRenameMap): ImportContent {
  const classRename = new Map<string, string>()
  for (const row of content.classes ?? []) {
    const next = renamedName("class", row.name, renameMap)
    if (next !== row.name) classRename.set(row.name, next)
  }

  const next: ImportContent = { ...content }

  if (content.classes?.length) {
    next.classes = content.classes.map((row) => ({
      ...row,
      name: renamedName("class", row.name, renameMap),
    }))
  }

  if (content.feats?.length) {
    next.feats = content.feats.map((row) => ({
      ...row,
      name: renamedName("feat", row.name, renameMap),
    }))
  }

  if (content.species?.length) {
    next.species = content.species.map((row) => ({
      ...row,
      name: renamedName("species", row.name, renameMap),
    }))
  }

  if (content.spells?.length) {
    next.spells = content.spells.map((row) => ({
      ...row,
      name: renamedName("spell", row.name, renameMap),
      classes: row.classes?.map((className) => classRename.get(className) ?? className) ?? row.classes,
    }))
  }

  if (content.backgrounds?.length) {
    next.backgrounds = content.backgrounds.map((row) => ({
      ...row,
      name: renamedName("background", row.name, renameMap),
    }))
  }

  if (content.abilities?.length) {
    next.abilities = content.abilities.map((row) => ({
      ...row,
      name: renamedName("ability", row.name, renameMap),
      source_name: row.source_name
        ? (classRename.get(row.source_name) ?? renamedName("class", row.source_name, renameMap))
        : row.source_name,
    }))
  }

  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((row) => ({
      ...row,
      class_name: classRename.get(row.class_name) ?? renamedName("class", row.class_name, renameMap),
    }))
  }

  if (content.class_resources?.length) {
    next.class_resources = content.class_resources.map((row) => {
      const className = classRename.get(row.class_name) ?? row.class_name
      const prefix = slugClassPrefix(className)
      const resourceKey = row.resource_key.startsWith(`${prefix}_`)
        ? row.resource_key
        : `${prefix}_${row.resource_key}`
      return {
        ...row,
        class_name: className,
        resource_key: resourceKey,
      }
    })
  }

  if (content.import_proposals?.class_resources?.length) {
    next.import_proposals = {
      ...content.import_proposals,
      class_resources: content.import_proposals.class_resources.map((row) => {
        const className = classRename.get(row.class_name) ?? row.class_name
        const prefix = slugClassPrefix(className)
        return {
          ...row,
          class_name: className,
          resource_key: row.resource_key.startsWith(`${prefix}_`)
            ? row.resource_key
            : `${prefix}_${row.resource_key}`,
          proposal_id: row.proposal_id.startsWith(`${prefix}_`)
            ? row.proposal_id
            : `${prefix}_${row.proposal_id}`,
        }
      }),
    }
  }

  if (content.import_proposals?.custom_abilities?.length) {
    next.import_proposals = {
      ...next.import_proposals,
      custom_abilities: content.import_proposals.custom_abilities.map((row) => ({
        ...row,
        source_name: row.source_name
          ? (classRename.get(row.source_name) ?? row.source_name)
          : row.source_name,
      })),
    }
  }

  return next
}

export function importCollisionsNeedResolution(collisions: ImportCollision[]): boolean {
  return collisions.length > 0
}
