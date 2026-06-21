import {
  parseClassProgressionTable,
  usesConfigForProgressionColumn,
} from "@/lib/import/parse-class-progression-table"
import { normalizeFeatureRow } from "@/lib/compendium/normalize-feature-activation"
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

function linkResourceCostsOnFeatures(
  features: Feature[],
  resourceKeys: { psi?: string; exploit?: string },
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
): { psi?: string; exploit?: string } {
  const keys: { psi?: string; exploit?: string } = {}
  const classResources = explicitResources?.filter((r) => r.class_name === className) ?? []

  for (const resource of classResources) {
    if (/psi\s*points?/i.test(resource.name)) keys.psi = resource.resource_key
    if (/exploit\s*dice/i.test(resource.name)) keys.exploit = resource.resource_key
  }

  const lower = progressionText.toLowerCase()
  if (!keys.psi && lower.includes("psi point")) keys.psi = "psi_points"
  if (!keys.exploit && /\bexploit\s+die\b/.test(lower)) keys.exploit = "exploit_dice"

  return keys
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
    if (rows.some((row) => row.resource_key === column.resourceKey)) continue
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

  return { ...row, features: nextFeatures }
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
