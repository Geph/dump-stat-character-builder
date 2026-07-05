import { applySrdItemIcon, SRD_TOOL_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"

/** Apply bundled game-icons.net slugs for SRD tools when no custom icon is set. */
export function enrichSrdToolRow(row: Record<string, unknown>): Record<string, unknown> {
  return applySrdItemIcon(row, SRD_TOOL_ICONS_BY_NAME)
}

export function enrichSrdToolList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdToolRow)
}
