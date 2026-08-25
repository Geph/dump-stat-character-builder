import spells from "@/lib/srd/seed-data/spells.json"

type SeedSpellRow = { name?: unknown; casting_time?: unknown }

let castingTimeByName: Map<string, string> | null = null

function index(): Map<string, string> {
  if (castingTimeByName) return castingTimeByName
  const map = new Map<string, string>()
  for (const row of spells as SeedSpellRow[]) {
    const name = typeof row.name === "string" ? row.name.trim().toLowerCase() : ""
    const castingTime = typeof row.casting_time === "string" ? row.casting_time.trim() : ""
    if (name && castingTime) map.set(name, castingTime)
  }
  castingTimeByName = map
  return map
}

/**
 * Casting time of a bundled SRD spell, by name. Null when the spell is not part of the SRD
 * seed, so callers can fall back rather than inventing a cost.
 */
export function srdSpellCastingTime(spellName: string | null | undefined): string | null {
  if (!spellName) return null
  return index().get(spellName.trim().toLowerCase()) ?? null
}
