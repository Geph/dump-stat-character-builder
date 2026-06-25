import {
  parseClassProgressionTable,
  usesConfigForProgressionColumn,
} from "@/lib/import/parse-class-progression-table"
import { normalizeFeatureRow } from "@/lib/compendium/normalize-feature-activation"
import { stripClassProgressionTablesFromText } from "@/lib/import/strip-class-progression-tables"
import {
  detectThirdPartyResourceSpend,
  THIRD_PARTY_RESOURCE_PATTERNS,
} from "@/lib/import/third-party-resources"
import type { Feature, UsesConfig } from "@/lib/types"

export type ClassResourceImportRow = {
  class_name: string
  resource_key: string
  name: string
  description?: string | null
  uses: UsesConfig
}

const PSI_COST_RE =
  /\b(?:expend|spend|costs?|pay|use)\s+(?:up\s+to\s+)?(\d+)\s+psi\s+points?\b/i

const PSI_COST_ALT_RE = /\b(\d+)\s+psi\s+points?\b[^.]{0,40}\b(?:to|when|per)\b/i

export function detectPsiPointCost(text: string): number | null {
  const primary = text.match(PSI_COST_RE)
  if (primary) return parseInt(primary[1], 10)
  const alt = text.match(PSI_COST_ALT_RE)
  if (alt) return parseInt(alt[1], 10)
  return null
}

export function detectExploitDieCost(text: string): number | null {
  return detectThirdPartyResourceSpend(text, "exploit_dice")
}

export function detectBattleDieCost(text: string): number | null {
  return detectThirdPartyResourceSpend(text, "battle_dice")
}

function linkResourceCostsOnFeatures(
  features: Feature[],
  resourceKeys: { psi?: string; exploit?: string; risk?: string; battle?: string },
): Feature[] {
  return features.map((feature) => {
    const description = feature.description ?? ""
    let limitedUses = feature.limitedUses

    const psiCost = resourceKeys.psi ? detectPsiPointCost(description) : null
    if (psiCost != null && resourceKeys.psi) {
      limitedUses = {
        ...(limitedUses ?? {}),
        type: "class_resource",
        classResourceKey: resourceKeys.psi,
        classResourceAmount: psiCost,
      }
    }

    const exploitCost = resourceKeys.exploit ? detectExploitDieCost(description) : null
    if (exploitCost != null && resourceKeys.exploit) {
      limitedUses = {
        ...(limitedUses ?? {}),
        type: "class_resource",
        classResourceKey: resourceKeys.exploit,
        classResourceAmount: exploitCost,
      }
    }

    const battleCost = resourceKeys.battle ? detectBattleDieCost(description) : null
    if (battleCost != null && resourceKeys.battle) {
      limitedUses = {
        ...(limitedUses ?? {}),
        type: "class_resource",
        classResourceKey: resourceKeys.battle,
        classResourceAmount: battleCost,
      }
    }

    if (!limitedUses || limitedUses === feature.limitedUses) {
      return normalizeFeatureRow(feature)
    }

    return normalizeFeatureRow({ ...feature, limitedUses })
  })
}

function collectProgressionText(row: Record<string, unknown>): string {
  const parts: string[] = []
  if (typeof row.description === "string") parts.push(row.description)
  const features = row.features
  if (Array.isArray(features)) {
    for (const raw of features) {
      const feature = raw as Feature
      if (typeof feature.description === "string") parts.push(feature.description)
    }
  }
  return parts.join("\n\n")
}

function resolveResourceKeysForClass(
  className: string,
  explicitResources: ClassResourceImportRow[] | undefined,
  progressionText: string,
): { psi?: string; exploit?: string; risk?: string; battle?: string } {
  const keys: { psi?: string; exploit?: string; risk?: string; battle?: string } = {}
  const classResources = explicitResources?.filter((r) => r.class_name === className) ?? []

  for (const resource of classResources) {
    if (/psi\s*points?/i.test(resource.name)) keys.psi = resource.resource_key
    if (/exploit\s*dice/i.test(resource.name)) keys.exploit = resource.resource_key
    if (/risk\s*dice/i.test(resource.name)) keys.risk = resource.resource_key
    if (/battle\s*dice/i.test(resource.name)) keys.battle = resource.resource_key
  }

  const lower = progressionText.toLowerCase()
  if (!keys.psi && lower.includes("psi point")) keys.psi = "psi_points"
  if (!keys.exploit && /\bexploit\s+die\b/.test(lower)) keys.exploit = "exploit_dice"
  if (!keys.risk && /\brisk\s+dice\b/.test(lower)) keys.risk = "risk_dice"
  if (!keys.battle && /\bbattle\s+dice\b/.test(lower)) keys.battle = "battle_dice"

  return keys
}

function tableUsesHasLevels(uses: UsesConfig): boolean {
  return (uses.atLevelTable?.length ?? 0) > 0
}

/** Prefer level-table data from a parsed progression column when explicit uses are incomplete. */
export function mergeUsesFromProgressionTable(
  explicit: UsesConfig,
  fromTable: UsesConfig,
): UsesConfig {
  if (!tableUsesHasLevels(fromTable)) return explicit
  const explicitLevels = explicit.atLevelTable?.length ?? 0
  const tableLevels = fromTable.atLevelTable?.length ?? 0
  if (tableUsesHasLevels(explicit) && explicitLevels >= tableLevels) return explicit

  return {
    ...explicit,
    type: fromTable.type ?? explicit.type,
    atLevelTable: fromTable.atLevelTable,
    atLevelMode: fromTable.atLevelMode ?? explicit.atLevelMode,
    dieType: fromTable.dieType ?? explicit.dieType,
    recharges: fromTable.recharges?.length ? fromTable.recharges : explicit.recharges,
    specialDescription: explicit.specialDescription ?? fromTable.specialDescription,
  }
}

/** Parse progression tables from class text before descriptions are stripped. */
export function mergeTableParsedClassResources(content: {
  classes?: unknown[]
  class_resources?: ClassResourceImportRow[]
}): ClassResourceImportRow[] {
  const merged = new Map<string, ClassResourceImportRow>()

  for (const row of content.class_resources ?? []) {
    merged.set(`${row.class_name}::${row.resource_key}`, { ...row })
  }

  for (const classRow of content.classes ?? []) {
    const record = classRow as Record<string, unknown>
    const className = String(record.name ?? "")
    if (!className) continue

    const parsed = parseClassProgressionTable(collectProgressionText(record))
    if (!parsed?.columns.length) continue

    for (const column of parsed.columns) {
      const mapKey = `${className}::${column.resourceKey}`
      const tableUses = usesConfigForProgressionColumn(column, className)
      const existing = merged.get(mapKey)
      if (existing) {
        merged.set(mapKey, {
          ...existing,
          uses: mergeUsesFromProgressionTable(existing.uses, tableUses),
          description:
            existing.description ??
            `${column.resourceName} progression parsed from the ${className} level table.`,
        })
      } else {
        merged.set(mapKey, {
          class_name: className,
          resource_key: column.resourceKey,
          name: column.resourceName,
          description: `${column.resourceName} progression parsed from the ${className} level table.`,
          uses: tableUses,
        })
      }
    }
  }

  return [...merged.values()]
}

/** Build class_resources rows from explicit import data or parsed progression tables. */
export function buildClassResourceRowsForClass(
  classRow: Record<string, unknown>,
  explicitResources: ClassResourceImportRow[] | undefined,
  source: string,
  classId: string,
): Record<string, unknown>[] {
  const className = String(classRow.name ?? "")
  const parsed = parseClassProgressionTable(collectProgressionText(classRow))
  const explicit = explicitResources?.filter((resource) => resource.class_name === className) ?? []

  const rows: Record<string, unknown>[] = []

  for (const resource of explicit) {
    rows.push({
      class_id: classId,
      resource_key: resource.resource_key,
      name: resource.name,
      description: resource.description ?? null,
      uses: resource.uses,
      source,
    })
  }

  const parsedColumns = parsed?.columns ?? []
  for (const column of parsedColumns) {
    const tableUses = usesConfigForProgressionColumn(column, className)
    const existingRow = rows.find((row) => row.resource_key === column.resourceKey)
    if (existingRow) {
      existingRow.uses = mergeUsesFromProgressionTable(
        existingRow.uses as UsesConfig,
        tableUses,
      )
      continue
    }
    rows.push({
      class_id: classId,
      resource_key: column.resourceKey,
      name: column.resourceName,
      description: `${column.resourceName} for ${className} (imported from class progression table).`,
      uses: usesConfigForProgressionColumn(column, className),
      source,
    })
  }

  return rows
}

/** Link resource spends and normalize features on imported class rows. */
export function enrichImportedClassRow(
  row: Record<string, unknown>,
  explicitResources: ClassResourceImportRow[] | undefined,
): Record<string, unknown> {
  const className = String(row.name ?? "")
  const progressionText = collectProgressionText(row)
  const resourceKeys = resolveResourceKeysForClass(className, explicitResources, progressionText)

  const features = Array.isArray(row.features) ? (row.features as Feature[]) : []
  const shouldLink =
    resourceKeys.psi ||
    resourceKeys.exploit ||
    explicitResources?.some((resource) => resource.class_name === className)

  const nextFeatures = shouldLink
    ? linkResourceCostsOnFeatures(features, resourceKeys)
    : features.map((feature) => normalizeFeatureRow(feature))

  let description = typeof row.description === "string" ? row.description : null
  if (description) {
    const stripped = stripClassProgressionTablesFromText(description)
    description = stripped.length > 0 ? stripped : null
  }

  return { ...row, description, features: nextFeatures }
}

export function enrichSubclassFeaturesWithPsiCosts(
  features: Feature[],
  resourceKey = "psi_points",
): Feature[] {
  return linkResourceCostsOnFeatures(features, { psi: resourceKey })
}

export function enrichSubclassFeaturesWithExploitCosts(
  features: Feature[],
  resourceKey = "exploit_dice",
): Feature[] {
  return linkResourceCostsOnFeatures(features, { exploit: resourceKey })
}

export function resolvePsiResourceKeyForClass(
  className: string,
  explicitResources: ClassResourceImportRow[] | undefined,
): string | null {
  const match = explicitResources?.find(
    (resource) =>
      resource.class_name === className && /psi\s*points?/i.test(resource.name),
  )
  if (match) return match.resource_key
  return null
}

export function resolveExploitResourceKeyForClass(
  className: string,
  explicitResources: ClassResourceImportRow[] | undefined,
): string | null {
  const match = explicitResources?.find(
    (resource) =>
      resource.class_name === className && /exploit\s*dice/i.test(resource.name),
  )
  if (match) return match.resource_key
  return null
}

/** Resource keys referenced in class text that may need import proposals. */
export function detectThirdPartyResourcesInText(text: string): string[] {
  const found: string[] = []
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (pattern.namePattern.test(text) || pattern.spendPatterns.some((re) => re.test(text))) {
      found.push(pattern.resourceKey)
    }
  }
  return found
}

export function enrichImportedClassList(
  rows: Record<string, unknown>[],
  explicitResources: ClassResourceImportRow[] | undefined,
): Record<string, unknown>[] {
  return rows.map((row) => enrichImportedClassRow(row, explicitResources))
}
