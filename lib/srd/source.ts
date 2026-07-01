/** Source label stored on compendium rows seeded from SRD 5.2.1. */
export const SRD_SOURCE = "D&D 5.5e SRD"

export const SRD_CREATOR_URL = "https://www.dndbeyond.com/srd"

/** Prior seed runs used a shorter label; include when replacing SRD subclasses. */
export const LEGACY_SRD_SOURCES = ["SRD", SRD_SOURCE] as const

export function formatCompendiumSource(source: string | null | undefined): string {
  if (!source || source === "Custom") return source || "Custom"
  if (source === "SRD") return SRD_SOURCE
  return source
}

export function isSrdSource(source: string | null | undefined): boolean {
  if (!source) return false
  return (LEGACY_SRD_SOURCES as readonly string[]).includes(source)
}

/** Attach default D&D Beyond SRD link to seeded rows when missing. */
export function withSrdCreatorUrl<T extends Record<string, unknown>>(row: T): T {
  if (!isSrdSource(row.source as string | null | undefined)) return row
  if (row.creator_url) return row
  return { ...row, creator_url: SRD_CREATOR_URL }
}

export function withSrdCreatorUrlList<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(withSrdCreatorUrl)
}
