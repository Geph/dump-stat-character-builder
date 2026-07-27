import {
  DASHBOARD_MAX_CHARACTERS,
  DASHBOARD_MIN_CHARACTERS,
} from "@/lib/character/dashboard-url"
import { normalizeSheetPlayState } from "@/lib/character/sheet-play-state"
import type { Character } from "@/lib/types"

/** Persistent adventuring party (ordered character IDs). */
export type AdventuringParty = {
  id: string
  name: string
  character_ids: string[]
  created_at: string
  updated_at: string
}

export type PartyStats = {
  memberCount: number
  averageLevel: number | null
  totalCurrentHp: number | null
  totalMaxHp: number | null
  missingCharacterIds: string[]
}

export function normalizePartyCharacterIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : ""
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= DASHBOARD_MAX_CHARACTERS) break
  }
  return out
}

export function validatePartyMembers(ids: string[]): { ok: true } | { ok: false; reason: string } {
  const unique = normalizePartyCharacterIds(ids)
  if (unique.length < DASHBOARD_MIN_CHARACTERS) {
    return {
      ok: false,
      reason: `A party needs at least ${DASHBOARD_MIN_CHARACTERS} characters.`,
    }
  }
  if (unique.length > DASHBOARD_MAX_CHARACTERS) {
    return {
      ok: false,
      reason: `A party can have at most ${DASHBOARD_MAX_CHARACTERS} characters.`,
    }
  }
  return { ok: true }
}

export function buildPartyStats(
  party: Pick<AdventuringParty, "character_ids">,
  charactersById: Map<string, Character>,
): PartyStats {
  const ids = normalizePartyCharacterIds(party.character_ids)
  const missingCharacterIds: string[] = []
  let levelSum = 0
  let levelCount = 0
  let totalCurrentHp = 0
  let totalMaxHp = 0
  let hpCount = 0

  for (const id of ids) {
    const character = charactersById.get(id)
    if (!character) {
      missingCharacterIds.push(id)
      continue
    }
    levelSum += character.level ?? 1
    levelCount += 1
    const maxHp = character.hit_point_max ?? null
    const play = normalizeSheetPlayState(character.sheet_state)
    const currentHp =
      play?.currentHp ?? character.hit_points ?? character.hit_point_max ?? null
    if (typeof maxHp === "number" && typeof currentHp === "number") {
      totalMaxHp += maxHp
      totalCurrentHp += currentHp
      hpCount += 1
    }
  }

  return {
    memberCount: ids.length,
    averageLevel: levelCount ? Math.round((levelSum / levelCount) * 10) / 10 : null,
    totalCurrentHp: hpCount ? totalCurrentHp : null,
    totalMaxHp: hpCount ? totalMaxHp : null,
    missingCharacterIds,
  }
}

export function normalizePartyRow(row: Record<string, unknown>): AdventuringParty {
  const now = new Date().toISOString()
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "Unnamed Party").trim() || "Unnamed Party",
    character_ids: normalizePartyCharacterIds(row.character_ids),
    created_at: typeof row.created_at === "string" ? row.created_at : now,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : now,
  }
}
