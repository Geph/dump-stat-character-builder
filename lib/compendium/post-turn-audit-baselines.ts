import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  resourceGraphMissKey,
  resourceGraphOrphanKey,
  type ResourceGraphMiss,
  type ResourceGraphOrphanSpend,
} from "@/lib/compendium/audit-resource-graph"
import {
  grantedEquipmentViolationKey,
  type GrantedEquipmentViolation,
} from "@/lib/compendium/audit-granted-equipment"

/** Vitest inline snapshots are JSON-like with trailing commas. */
export function parseSnapshotJson(raw: string): unknown {
  const stripped = raw.replace(/,(\s*[}\]])/g, "$1")
  return JSON.parse(stripped)
}

export function parseVitestInlineSnapshots(source: string): unknown[] {
  const arrays: unknown[] = []
  const re = /toMatchInlineSnapshot\(\s*`([\s\S]*?)`\s*\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    try {
      arrays.push(parseSnapshotJson(match[1] ?? "null"))
    } catch {
      arrays.push(null)
    }
  }
  return arrays
}

export function knownResourceGraphKeysFromSource(source: string): {
  misses: Set<string>
  orphans: Set<string>
} {
  const misses = new Set<string>()
  const orphans = new Set<string>()
  for (const snapshot of parseVitestInlineSnapshots(source)) {
    if (!Array.isArray(snapshot)) continue
    for (const row of snapshot) {
      if (!row || typeof row !== "object") continue
      const rec = row as Record<string, unknown>
      if (typeof rec.phrase === "string" && typeof rec.resource === "string") {
        misses.add(resourceGraphMissKey(rec as unknown as ResourceGraphMiss))
      } else if (typeof rec.resourceKey === "string") {
        orphans.add(resourceGraphOrphanKey(rec as unknown as ResourceGraphOrphanSpend))
      }
    }
  }
  return { misses, orphans }
}

export function knownGrantedEquipmentKeysFromSource(source: string): Set<string> {
  const keys = new Set<string>()
  for (const snapshot of parseVitestInlineSnapshots(source)) {
    if (!Array.isArray(snapshot)) continue
    for (const row of snapshot) {
      if (!row || typeof row !== "object") continue
      const rec = row as Record<string, unknown>
      if (typeof rec.kind === "string" && typeof rec.item === "string") {
        keys.add(grantedEquipmentViolationKey(rec as unknown as GrantedEquipmentViolation))
      }
    }
  }
  return keys
}

export function loadKnownAuditBaselineKeys(root = process.cwd()): {
  resourceMisses: Set<string>
  resourceOrphans: Set<string>
  granted: Set<string>
} {
  const resource = knownResourceGraphKeysFromSource(
    readFileSync(join(root, "lib/compendium/__tests__/audit-resource-graph.test.ts"), "utf8"),
  )
  const granted = knownGrantedEquipmentKeysFromSource(
    readFileSync(join(root, "lib/compendium/__tests__/audit-granted-equipment.test.ts"), "utf8"),
  )
  return {
    resourceMisses: resource.misses,
    resourceOrphans: resource.orphans,
    granted,
  }
}
