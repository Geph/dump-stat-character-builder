import { applySrdItemIcon, SRD_TOOL_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"
import { getSrdToolDescription } from "@/lib/compendium/srd-tool-descriptions"

/** Apply bundled game-icons.net slugs and SRD descriptions for SRD tools. */
export function enrichSrdToolRow(row: Record<string, unknown>): Record<string, unknown> {
  let next = applySrdItemIcon(row, SRD_TOOL_ICONS_BY_NAME)
  const name = typeof next.name === "string" ? next.name : ""
  const existingDescription =
    typeof next.description === "string" ? next.description.trim() : ""
  if (!existingDescription && name) {
    const description = getSrdToolDescription(name)
    if (description) next = { ...next, description }
  }
  return next
}

export function enrichSrdToolList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdToolRow)
}
