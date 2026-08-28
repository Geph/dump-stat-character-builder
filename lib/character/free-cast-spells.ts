import { canonicalSpellLookupKey } from "@/lib/compendium/spell-name-aliases"
import type {
  AbilityScoreKey,
  CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import { readModifierSource } from "@/lib/character/tag-modifier-source"
import type { Feature, RestType } from "@/lib/types"

type FeatureLike = Pick<Feature, "linkedModifiers">

/**
 * Spells a feature lets you cast without expending a slot — "You can cast Identify and Locate
 * Object without a spell slot or components" wires to cast_spell effects with
 * castSpellWithoutSlot, and the sheet waives the slot when one of those spells is cast.
 */
export function collectFreeCastSpellKeys(
  features: Array<FeatureLike | null | undefined>,
): Set<string> {
  const keys = new Set<string>()
  for (const feature of features) {
    for (const instance of feature?.linkedModifiers ?? []) {
      for (const effect of instance.activation?.effects ?? []) {
        if (effect.kind !== "cast_spell" || !effect.castSpellWithoutSlot) continue
        const name = effect.castSpellName?.trim()
        if (!name) continue
        keys.add(canonicalSpellLookupKey(name))
      }
    }
  }
  return keys
}

export function isFreeCastSpell(
  freeCastKeys: Set<string>,
  spellName: string | null | undefined,
): boolean {
  if (!freeCastKeys.size || !spellName?.trim()) return false
  return freeCastKeys.has(canonicalSpellLookupKey(spellName))
}

export type GrantedSpellCastProfile = {
  spellId?: string
  spellName?: string
  sourceLabel: string
  castingAbility?: AbilityScoreKey
  freeCastCount: number
  minimumSpellLevel?: number
  trackingKey: string
}

function modifierOwnerKey(mod: CharacteristicModifier): string {
  const source = readModifierSource(mod)
  return `${source?.sourceType ?? "feature"}:${source?.sourceId ?? source?.source ?? source?.label ?? "unknown"}`
}

function profileTrackingKey(
  mod: Extract<CharacteristicModifier, { type: "spells_known" }>,
  spellKey: string,
): string {
  return `granted-spell:${modifierOwnerKey(mod)}:${mod.id}:${spellKey}`
}

/**
 * Preserve per-source spell rules after builder picks have been applied. This keeps a feat or
 * species spell's chosen casting ability and free use separate from the character's class slots.
 */
export function collectGrantedSpellCastProfiles(
  modifiers: CharacteristicModifier[],
): GrantedSpellCastProfile[] {
  const profiles: GrantedSpellCastProfile[] = []
  const seen = new Set<string>()
  const sourceFreeCasts = new Map<string, { count: number; minimumSpellLevel?: number }>()

  // Legacy rows stored the free use as a sibling Uses modifier. Associate it with the spells
  // from the same source so existing saved catalogs gain the corrected behavior without reseeding.
  for (const mod of modifiers) {
    if (mod.type !== "uses" || !/without (?:expending )?(?:a )?(?:spell )?slot/i.test(mod.label ?? "")) {
      continue
    }
    const count = mod.uses.type === "fixed" ? Math.max(0, mod.uses.fixedAmount ?? 0) : 0
    if (count <= 0) continue
    const levelMatch = (mod.label ?? "").match(/level-?(\d+)/i)
    sourceFreeCasts.set(modifierOwnerKey(mod), {
      count,
      minimumSpellLevel: levelMatch ? Number(levelMatch[1]) : 1,
    })
  }

  for (const raw of modifiers) {
    if (raw.type !== "spells_known") continue
    const source = readModifierSource(raw)
    const sourceLabel = source?.label ?? source?.source ?? raw.label ?? "Granted spell"
    const sourceFreeCast = sourceFreeCasts.get(modifierOwnerKey(raw))

    const push = (profile: Omit<GrantedSpellCastProfile, "trackingKey">, key: string) => {
      const trackingKey = profileTrackingKey(raw, key)
      if (seen.has(trackingKey)) return
      seen.add(trackingKey)
      profiles.push({ ...profile, trackingKey })
    }

    for (const entry of raw.spells ?? []) {
      if (!entry.spellId) continue
      push(
        {
          spellId: entry.spellId,
          sourceLabel,
          castingAbility: raw.castingAbility,
          freeCastCount: Math.max(
            0,
            entry.freeCastPerLongRest ?? sourceFreeCast?.count ?? 0,
          ),
          minimumSpellLevel: sourceFreeCast?.minimumSpellLevel,
        },
        canonicalSpellLookupKey(entry.spellId),
      )
    }

    for (const grant of raw.freeCastPerLongRest ?? []) {
      const spellName = grant.spellName?.trim()
      if (!spellName) continue
      push(
        {
          spellName,
          sourceLabel,
          castingAbility: raw.castingAbility,
          freeCastCount: Math.max(0, grant.count),
        },
        canonicalSpellLookupKey(spellName),
      )
    }
  }

  return profiles
}

export function grantedSpellProfileFor(
  profiles: GrantedSpellCastProfile[],
  spell: { id: string; name: string; level?: number },
): GrantedSpellCastProfile | null {
  const nameKey = canonicalSpellLookupKey(spell.name)
  return (
    profiles.find(
      (profile) =>
        (profile.minimumSpellLevel == null ||
          spell.level == null ||
          spell.level >= profile.minimumSpellLevel) &&
        (profile.spellId === spell.id ||
          (profile.spellName && canonicalSpellLookupKey(profile.spellName) === nameKey) ||
          (profile.spellId && canonicalSpellLookupKey(profile.spellId) === nameKey)),
    ) ?? null
  )
}

export function resetGrantedSpellFreeCasts(
  usedById: Record<string, number>,
  profiles: GrantedSpellCastProfile[],
  rest: RestType,
): { usedById: Record<string, number>; restored: GrantedSpellCastProfile[] } {
  if (rest !== "long_rest") return { usedById, restored: [] }
  const next = { ...usedById }
  const restored: GrantedSpellCastProfile[] = []
  for (const profile of profiles) {
    if (profile.freeCastCount <= 0 || (next[profile.trackingKey] ?? 0) <= 0) continue
    delete next[profile.trackingKey]
    restored.push(profile)
  }
  return { usedById: next, restored }
}
