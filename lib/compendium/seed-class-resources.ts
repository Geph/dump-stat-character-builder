import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { buildSrdClassResourceRows } from "@/lib/compendium/class-resource-rows"
import { LEGACY_SRD_SOURCES } from "@/lib/srd/source"

const SRD_SOURCES = new Set(["SRD", ...LEGACY_SRD_SOURCES])

export function isSrdClassResourceSource(source: unknown): boolean {
  return typeof source === "string" && SRD_SOURCES.has(source)
}

export { buildSrdClassResourceRows }

export function countBundledClassResources(): number {
  return Object.values(SRD_CLASS_RESOURCES_BY_NAME).reduce((sum, resources) => sum + resources.length, 0)
}
