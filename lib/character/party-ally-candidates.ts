import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import type { PartyEffectTarget } from "@/lib/character/effect-target-policy"
import { normalizePartyCharacterIds } from "@/lib/character/party"
import { normalizeSheetPlayState } from "@/lib/character/sheet-play-state"
import type { Character } from "@/lib/types"

export type PartyAllyCandidate = PartyEffectTarget & {
  currentHp: number | null
  maxHp: number | null
  tempHp?: number | null
  activeConditions?: string[]
  hasInspiration?: boolean
}

type CharacterLike = Pick<
  Character,
  "id" | "name" | "hit_points" | "hit_point_max" | "sheet_state" | "companion_state"
>

/** Build selectable ally/companion targets from party members (and their companions). */
export function collectPartyAllyCandidates(
  partyCharacterIds: string[],
  charactersById: Map<string, CharacterLike>,
  options?: { includeSelfId?: string | null; includeCompanions?: boolean },
): PartyAllyCandidate[] {
  const includeCompanions = options?.includeCompanions !== false
  const ids = normalizePartyCharacterIds(partyCharacterIds)
  const selfId = options?.includeSelfId?.trim() || ""
  if (selfId && !ids.includes(selfId)) ids.unshift(selfId)
  const out: PartyAllyCandidate[] = []

  for (const characterId of ids) {
    const character = charactersById.get(characterId)
    if (!character) continue

    const play = normalizeSheetPlayState(character.sheet_state)
    const maxHp = character.hit_point_max ?? null
    const currentHp = play?.currentHp ?? character.hit_points ?? maxHp
    out.push({
      kind: "character",
      characterId,
      label: character.name,
      currentHp: typeof currentHp === "number" ? currentHp : null,
      maxHp: typeof maxHp === "number" ? maxHp : null,
      tempHp: play?.tempHp ?? null,
      activeConditions: play?.activeConditions ?? [],
      hasInspiration: play?.hasInspiration ?? false,
    })

    if (!includeCompanions) continue
    const companions = (character.companion_state ?? []) as CharacterCompanionState[]
    for (const companion of companions) {
      if (!companion?.key) continue
      out.push({
        kind: "companion",
        characterId,
        companionKey: companion.key,
        label: `${character.name}'s ${companion.customName?.trim() || companion.key}`,
        currentHp: typeof companion.currentHp === "number" ? companion.currentHp : null,
        maxHp: null,
        tempHp: typeof companion.tempHp === "number" ? companion.tempHp : null,
        activeConditions: companion.activeConditions ?? [],
      })
    }
  }

  return out
}

/** Button label for the ally picker — the open character is "Self", not their name. */
export function allyCandidateDisplayLabel(
  candidate: {
    kind: PartyAllyCandidate["kind"]
    characterId: string
    label: string
    companionKey?: string
  },
  selfId?: string | null,
): string {
  if (candidate.kind === "character" && selfId && candidate.characterId === selfId) {
    return "Self"
  }
  return candidate.label
}
