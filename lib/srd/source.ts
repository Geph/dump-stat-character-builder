/** Source label stored on compendium rows seeded from the official SRD. */
export const SRD_SOURCE = "D&D 5.5e SRD"

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
