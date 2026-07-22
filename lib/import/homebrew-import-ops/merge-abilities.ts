/**
 * Shared / standalone custom-ability catalogs (Psionic Disciplines, Exploits, Knacks, …)
 * live as Drive JSON with import_proposals.custom_abilities (see kibbles-psion-custom).
 * Merge and audit them like spell fill-ins — without requiring a class shell.
 */

import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"
import type { WiringFinding } from "@/lib/import/homebrew-import-ops/wiring-rules"

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeName(name: string): string {
  return name
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Pull custom ability rows from any of the shapes we see on Drive / LLM output. */
export function extractCustomAbilities(content: unknown): JsonRecord[] {
  const root = asRecord(content)
  if (!root) return []

  const proposals = asRecord(root.import_proposals)
  if (Array.isArray(proposals?.custom_abilities)) {
    return proposals!.custom_abilities.map(asRecord).filter(Boolean) as JsonRecord[]
  }
  if (Array.isArray(root.custom_abilities)) {
    return root.custom_abilities.map(asRecord).filter(Boolean) as JsonRecord[]
  }
  if (Array.isArray(root.abilities)) {
    return root.abilities.map(asRecord).filter(Boolean) as JsonRecord[]
  }
  return []
}

export function isAbilityCatalogPayload(content: unknown): boolean {
  const root = asRecord(content)
  if (!root) return false
  const hasClassShell =
    (Array.isArray(root.classes) && root.classes.length > 0) ||
    (Array.isArray(root.subclasses) && root.subclasses.length > 0)
  if (hasClassShell) return false
  const proposals = asRecord(root.import_proposals)
  if (Array.isArray(proposals?.custom_abilities)) return true
  if (Array.isArray(root.custom_abilities) || Array.isArray(root.abilities)) return true
  return false
}

export function abilityMergeKey(row: JsonRecord): string {
  const name = normalizeName(String(row.name ?? ""))
  const role = normalizeName(String(row.ability_role ?? ""))
  const source = normalizeName(String(row.source_name ?? row.source_type ?? ""))
  return `${name}::${role}::${source}`
}

function descriptionLength(row: JsonRecord): number {
  return String(row.description ?? row.definition ?? "").length
}

/**
 * Prefer incoming prose when richer; keep base structural fields when incoming omits them.
 */
export function mergeAbilityRows(baseRows: JsonRecord[], incomingRows: JsonRecord[]): JsonRecord[] {
  const byKey = new Map<string, JsonRecord>()
  for (const row of baseRows) {
    const key = abilityMergeKey(row)
    if (!key.startsWith("::")) byKey.set(key, clone(row))
  }
  for (const incoming of incomingRows) {
    const key = abilityMergeKey(incoming)
    if (key.startsWith("::")) continue
    const prior = byKey.get(key)
    if (!prior) {
      byKey.set(key, clone(incoming))
      continue
    }
    const preferIncoming = descriptionLength(incoming) >= descriptionLength(prior)
    const merged: JsonRecord = preferIncoming
      ? {
          ...prior,
          ...clone(incoming),
          // Preserve base structural fields if incoming left them blank.
          ability_role: incoming.ability_role ?? prior.ability_role,
          source_type: incoming.source_type ?? prior.source_type,
          source_name: incoming.source_name ?? prior.source_name,
          eligible_classes: incoming.eligible_classes ?? prior.eligible_classes,
          proposal_id: incoming.proposal_id ?? prior.proposal_id,
          prerequisite: incoming.prerequisite ?? prior.prerequisite,
          level_requirement: incoming.level_requirement ?? prior.level_requirement,
        }
      : {
          ...clone(incoming),
          ...prior,
          description: prior.description ?? incoming.description,
          definition: prior.definition ?? incoming.definition,
        }
    byKey.set(key, merged)
  }
  return [...byKey.values()].sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" }),
  )
}

export type MergeAbilityFillInOptions = {
  /**
   * When true (default), write merged rows into base.import_proposals.custom_abilities
   * and keep the base object shell (class package or catalog).
   * When false, emit a catalog-only object { import_proposals: { custom_abilities } }.
   */
  keepBaseShell?: boolean
}

/**
 * Merge a custom-ability fill-in (standalone catalog or class extract with abilities)
 * into a Drive base (class package or shared catalog like kibbles-psion-custom).
 */
export function mergeAbilityFillIn(
  base: unknown,
  incoming: unknown,
  options: MergeAbilityFillInOptions = {},
): Record<string, unknown> {
  const keepBaseShell = options.keepBaseShell !== false
  const baseObj = asRecord(base)
  const incomingObj = asRecord(incoming)
  if (!baseObj || !incomingObj) {
    throw new Error("mergeAbilityFillIn: both base and incoming must be objects")
  }

  const mergedRows = mergeAbilityRows(
    extractCustomAbilities(baseObj),
    extractCustomAbilities(incomingObj),
  )

  if (!keepBaseShell || isAbilityCatalogPayload(baseObj)) {
    const catalog: JsonRecord = keepBaseShell && isAbilityCatalogPayload(baseObj) ? clone(baseObj) : {}
    const proposals = asRecord(catalog.import_proposals) ?? {}
    catalog.import_proposals = {
      ...proposals,
      custom_abilities: mergedRows,
    }
    // Drop shorthand duplicates if we normalized into import_proposals.
    delete catalog.custom_abilities
    delete catalog.abilities
    return catalog
  }

  const next = clone(baseObj)
  const proposals = asRecord(next.import_proposals) ?? {}
  next.import_proposals = {
    ...proposals,
    custom_abilities: mergedRows,
  }
  return sanitizeHomebrewImportJson(next)
}

/** Structural checks for custom ability catalogs / class proposals. */
export function auditCustomAbilities(content: unknown): WiringFinding[] {
  const root = asRecord(content)
  if (!root) return []

  const abilities = extractCustomAbilities(root)
  const findings: WiringFinding[] = []
  const catalogOnly = isAbilityCatalogPayload(root)

  if (catalogOnly && !abilities.length) {
    findings.push({
      id: "abilities.empty_catalog",
      severity: "error",
      message: "Ability catalog has no import_proposals.custom_abilities (or abilities[]) rows",
      path: "import_proposals.custom_abilities",
    })
    return findings
  }

  if (!abilities.length) return findings

  const seen = new Map<string, number>()
  for (let i = 0; i < abilities.length; i++) {
    const row = abilities[i]!
    const name = String(row.name ?? "").trim()
    const path = `import_proposals.custom_abilities[${name || i}]`

    if (!name) {
      findings.push({
        id: "abilities.missing_name",
        severity: "error",
        message: `Ability row #${i} is missing name`,
        path,
      })
      continue
    }

    if (catalogOnly && !row.proposal_id) {
      findings.push({
        id: "abilities.missing_proposal_id",
        severity: "warn",
        message: `"${name}" is missing proposal_id (recommended for import review)`,
        path,
      })
    }

    if (
      !row.ability_role &&
      (catalogOnly || row.source_type === "class" || row.source_type == null || row.source_type === "")
    ) {
      findings.push({
        id: "abilities.missing_role",
        severity: "warn",
        message: `"${name}" is missing ability_role (knack / discipline / upgrade / psionic_power / class_talent / …)`,
        path,
      })
    }

    // Degree / section headers mistakenly extracted as abilities.
    if (/^(?:\d+(?:st|nd|rd|th)[-\s]?degree|unrestricted|general)\b/i.test(name) && !row.description) {
      findings.push({
        id: "abilities.section_header",
        severity: "warn",
        message: `"${name}" looks like a section header, not an ability row`,
        path,
      })
    }

    const key = abilityMergeKey(row)
    const prev = seen.get(key)
    if (prev != null) {
      findings.push({
        id: "abilities.duplicate",
        severity: "warn",
        message: `Duplicate ability key for "${name}" (also at index ${prev})`,
        path,
      })
    } else {
      seen.set(key, i)
    }
  }

  return findings
}
