import {
  formatBonusByLevelEntry,
  normalizeBonusByLevel,
  resolveFixedValueAtLevel,
  type BonusByLevelEntry,
} from "@/lib/compendium/bonus-by-level"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { resolveSpeciesTraitPicks } from "@/lib/builder/species-trait-picks"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { NamedSourceRow } from "@/lib/compendium/prefer-same-source"
import {
  formatResourceDieLabel,
  resolveUsesAtLevel,
} from "@/lib/compendium/resolve-uses-config"
import { formatSpellGrantDisplayName } from "@/lib/import/resolve-linked-modifier-spells"
import type { ClassResource, Feature, FeatureEffect, Species, UsesConfig } from "@/lib/types"

export type SpellGrantCatalogRow = { id?: string | null; name?: string | null; source?: string | null }

function namedSpellGrantCatalog(rows: SpellGrantCatalogRow[]): NamedSourceRow[] {
  return rows.filter(
    (row): row is NamedSourceRow => typeof row.id === "string" && typeof row.name === "string",
  )
}

/** Standard 5E proficiency bonus by character level. */
export function proficiencyBonusAtLevel(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / 4) + 2
}

/** Average HP gained for one class level after 1st (before Constitution). */
export function averageHitDieResult(hitDie: number): number {
  return Math.floor(Math.max(1, hitDie) / 2) + 1
}

export function averageHpGain(hitDie: number, conMod: number): number {
  return averageHitDieResult(hitDie) + conMod
}

/** Roll 1..hitDie then add Constitution (minimum 1 total HP from the level). */
export function rolledHpGain(hitDie: number, conMod: number, natural: number): number {
  const clamped = Math.max(1, Math.min(hitDie, Math.floor(natural)))
  return Math.max(1, clamped + conMod)
}

export function rollHitDie(hitDie: number): number {
  return 1 + Math.floor(Math.random() * Math.max(1, hitDie))
}

export type LevelUpStandardizedNote = {
  id: string
  title: string
  detail: string
}

/** Notes for improvements that always scale with character level (not class features). */
export function buildLevelUpStandardizedNotes(params: {
  fromTotalLevel: number
  toTotalLevel: number
  maxSpellLevelBefore?: number | null
  maxSpellLevelAfter?: number | null
}): LevelUpStandardizedNote[] {
  const notes: LevelUpStandardizedNote[] = []
  const pbBefore = proficiencyBonusAtLevel(params.fromTotalLevel)
  const pbAfter = proficiencyBonusAtLevel(params.toTotalLevel)
  if (pbAfter > pbBefore) {
    notes.push({
      id: "proficiency_bonus",
      title: "Proficiency Bonus",
      detail: `Increases from +${pbBefore} to +${pbAfter}.`,
    })
  }
  const spellBefore = params.maxSpellLevelBefore ?? 0
  const spellAfter = params.maxSpellLevelAfter ?? 0
  if (spellAfter > spellBefore) {
    notes.push({
      id: "spell_level",
      title: "Spell level access",
      detail: `You can now prepare or learn spells of up to level ${spellAfter}.`,
    })
  }
  return notes
}

export type LevelUpFeatureImprovement = {
  name: string
  featureLevel: number
  detail: string
  source: "class" | "subclass" | "species"
}

function formatCritRange(minimum: number): string {
  if (minimum >= 20) return "20"
  return `${minimum}–20`
}

function resolveCritMinimum(
  base: number | null | undefined,
  byLevel: BonusByLevelEntry[] | null | undefined,
  classLevel: number,
): number {
  return resolveFixedValueAtLevel(byLevel, classLevel, base ?? null) ?? base ?? 20
}

function attackTargetLabel(target: string | undefined): string | null {
  if (!target || target === "all") return null
  if (target === "ranged") return "ranged weapons"
  if (target === "melee") return "melee weapons"
  if (target === "spell") return "spell attacks"
  return target
}

/** Crit-range tiers that unlock between `fromLevel` (exclusive) and `toLevel` (inclusive). */
function criticalHitImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "attack_roll_modifiers") return []
  const details: string[] = []
  const seen = new Set<string>()

  const check = (
    base: number | null | undefined,
    byLevel: BonusByLevelEntry[] | null | undefined,
    scope: string | null,
  ) => {
    if (!byLevel?.length) return
    const before = resolveCritMinimum(base, byLevel, fromLevel)
    const after = resolveCritMinimum(base, byLevel, toLevel)
    if (before === after) return
    const scopeSuffix = scope ? ` with ${scope}` : ""
    const detail = `Critical hits${scopeSuffix} improve from ${formatCritRange(before)} to ${formatCritRange(after)}.`
    if (seen.has(detail)) return
    seen.add(detail)
    details.push(detail)
  }

  check(mod.criticalHitMinimum, mod.criticalHitMinimumByLevel, null)
  for (const entry of mod.entries ?? []) {
    check(
      entry.criticalHitMinimum ?? mod.criticalHitMinimum,
      entry.criticalHitMinimumByLevel,
      attackTargetLabel(entry.target),
    )
  }
  return details
}

function unlockFallsInRange(unlock: number | null | undefined, fromLevel: number, toLevel: number): boolean {
  if (unlock == null) return false
  return unlock > fromLevel && unlock <= toLevel
}

function resolveBonusEntryAtLevel(
  rows: BonusByLevelEntry[] | null | undefined,
  level: number,
  fallback: BonusByLevelEntry | null = null,
): BonusByLevelEntry | null {
  const normalized = normalizeBonusByLevel(rows)
  if (!normalized.length) return fallback
  const sorted = [...normalized].sort((a, b) => a.level - b.level)
  let current = fallback
  for (const row of sorted) {
    if (row.level > level) break
    current = row
  }
  return current
}

function joinSpellNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ""
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

function uniqueSpellNames(names: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const name of names) {
    const key = name.replace(/[_-]+/g, " ").trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(name.trim())
  }
  return unique
}

function collectUnlockedSpellNames(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
  spellCatalog: SpellGrantCatalogRow[],
): { prepared: string[]; learned: string[] } {
  if (mod.type !== "spells_known") return { prepared: [], learned: [] }
  const catalog = namedSpellGrantCatalog(spellCatalog)
  const unlocked = uniqueSpellNames(
    (mod.spells ?? [])
      .filter((entry) => unlockFallsInRange(entry.unlocksAtClassLevel, fromLevel, toLevel))
      .map((entry) => formatSpellGrantDisplayName(entry.spellId?.trim() ?? "", catalog))
      .filter(Boolean),
  )
  if (!unlocked.length) return { prepared: [], learned: [] }
  const prepared = (mod.spells ?? []).some(
    (entry) =>
      unlockFallsInRange(entry.unlocksAtClassLevel, fromLevel, toLevel) &&
      (entry.alwaysPrepared || entry.prepared || mod.alwaysPrepared),
  )
  return prepared ? { prepared: unlocked, learned: [] } : { prepared: [], learned: unlocked }
}

function spellGrantSentences(prepared: string[], learned: string[]): string[] {
  const details: string[] = []
  const uniquePrepared = uniqueSpellNames(prepared)
  const uniqueLearned = uniqueSpellNames(learned)
  if (uniquePrepared.length) {
    details.push(`You gain ${joinSpellNames(uniquePrepared)} (always prepared).`)
  }
  if (uniqueLearned.length) {
    details.push(`You learn ${joinSpellNames(uniqueLearned)}.`)
  }
  return details
}

function spellUnlockImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "spells_known") return []
  const details: string[] = []

  for (const grant of mod.choiceGrants ?? []) {
    if (grant.count <= 0) continue
    if (!unlockFallsInRange(grant.unlocksAtClassLevel, fromLevel, toLevel)) continue
    const count = grant.count
    if (grant.level === 0) {
      details.push(`You can now choose ${count} cantrip${count === 1 ? "" : "s"}.`)
    } else if (grant.upToLevel) {
      details.push(
        `You can now choose ${count} spell${count === 1 ? "" : "s"} of up to level ${grant.level}.`,
      )
    } else {
      details.push(
        `You can now choose ${count} level-${grant.level} spell${count === 1 ? "" : "s"}.`,
      )
    }
  }
  return details
}

function specialAttackImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "special_attack") return []
  const rows = mod.damageByLevel ?? []
  if (!rows.length) return []
  const crosses = rows.some((row) => unlockFallsInRange(row.level, fromLevel, toLevel))
  if (!crosses) return []
  const before = resolveBonusEntryAtLevel(rows, fromLevel, {
    level: 1,
    mode: "dice",
    dieCount: mod.damageDiceCount,
    dieType: mod.damageDieType,
  })
  const after = resolveBonusEntryAtLevel(rows, toLevel)
  if (!before || !after) return []
  const beforeLabel = formatBonusByLevelEntry(before)
  const afterLabel = formatBonusByLevelEntry(after)
  if (beforeLabel === afterLabel) return []
  const attackName = mod.attackName?.trim() || mod.label?.trim() || "Special attack"
  return [`${attackName} damage increases from ${beforeLabel} to ${afterLabel}.`]
}

function spiderClimbImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "movement_effects") return []
  if (!mod.spiderClimb || mod.spiderClimbMinLevel == null) return []
  if (!unlockFallsInRange(mod.spiderClimbMinLevel, fromLevel, toLevel)) return []
  return ["You gain a climb speed equal to your Speed (spider climb)."]
}

function bonusRowsCrossLevel(
  rows: BonusByLevelEntry[] | null | undefined,
  fromLevel: number,
  toLevel: number,
): boolean {
  return (rows ?? []).some((row) => unlockFallsInRange(row.level, fromLevel, toLevel))
}

function speedImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "speed" || !bonusRowsCrossLevel(mod.valueByLevel, fromLevel, toLevel)) return []
  const before = resolveFixedValueAtLevel(mod.valueByLevel, fromLevel, mod.value)
  const after = resolveFixedValueAtLevel(mod.valueByLevel, toLevel, mod.value)
  if (before == null || after == null || before === after) return []
  const kind = mod.speedType === "walk" ? "Walking speed" : `${mod.speedType} speed`
  return [`${kind} bonus increases from +${before} ft. to +${after} ft.`]
}

function unarmedDieImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "unarmed_strike_damage" || !bonusRowsCrossLevel(mod.dieByLevel, fromLevel, toLevel)) {
    return []
  }
  const before = resolveBonusEntryAtLevel(mod.dieByLevel, fromLevel)
  const after = resolveBonusEntryAtLevel(mod.dieByLevel, toLevel)
  if (!before || !after) return []
  const beforeLabel = formatBonusByLevelEntry(before)
  const afterLabel = formatBonusByLevelEntry(after)
  if (beforeLabel === afterLabel) return []
  const label = mod.label?.trim() || "Unarmed strike die"
  return [`${label} increases from ${beforeLabel} to ${afterLabel}.`]
}

/** Uses / die-size changes. First grant (0 → N) is the new feature card, not an improvement. */
export function usesConfigImprovementDetails(
  uses: UsesConfig | null | undefined,
  fromLevel: number,
  toLevel: number,
  label: string,
): string[] {
  if (!uses) return []
  const details: string[] = []
  const beforeUses = resolveUsesAtLevel(uses, fromLevel)
  const afterUses = resolveUsesAtLevel(uses, toLevel)
  if (
    beforeUses != null &&
    afterUses != null &&
    beforeUses > 0 &&
    afterUses > beforeUses
  ) {
    details.push(`${label} uses increase from ${beforeUses} to ${afterUses}.`)
  }
  const beforeDie = formatResourceDieLabel(uses, fromLevel)
  const afterDie = formatResourceDieLabel(uses, toLevel)
  if (beforeDie && afterDie && beforeDie !== afterDie) {
    details.push(`${label} die increases from ${beforeDie} to ${afterDie}.`)
  }
  const recharge = (uses.rechargeOverrides ?? []).find((row) =>
    unlockFallsInRange(row.atClassLevel, fromLevel, toLevel),
  )
  if (recharge) {
    const rests = (recharge.recharges ?? [])
      .flatMap((rule) => ("rest" in rule && rule.rest ? [rule.rest.replace(/_/g, " ")] : []))
      .join(" or ")
    if (rests) details.push(`${label} now recharges on a ${rests}.`)
  }
  return details
}

function usesCharacteristicImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "uses") return []
  return usesConfigImprovementDetails(mod.uses, fromLevel, toLevel, mod.label?.trim() || "Uses")
}

function hitDiceRestoreImprovementDetails(
  mod: CharacteristicModifier,
  fromLevel: number,
  toLevel: number,
): string[] {
  if (mod.type !== "hit_dice_restore") return []
  const rows = mod.amountByLevel
  if (!rows?.length || !bonusRowsCrossLevel(rows, fromLevel, toLevel)) return []
  const before = resolveFixedValueAtLevel(rows, fromLevel, mod.amount)
  const after = resolveFixedValueAtLevel(rows, toLevel, mod.amount)
  if (before == null || after == null || before === after) return []
  const label = mod.label?.trim() || "Hit Point Dice restored"
  return [`${label} increases from ${before} to ${after}.`]
}

function fallbackBonusEntryFromDice(bonusDice: string | null | undefined): BonusByLevelEntry | null {
  if (!bonusDice) return null
  const match = bonusDice.trim().match(/^(\d+)d(\d+)$/i)
  if (!match) {
    const fixed = bonusDice.trim().match(/^\+?(\d+)$/)
    if (!fixed) return null
    return { level: 1, mode: "fixed", fixed: parseInt(fixed[1], 10) }
  }
  return {
    level: 1,
    mode: "dice",
    dieCount: parseInt(match[1], 10),
    dieType: `d${match[2]}` as BonusByLevelEntry["dieType"],
  }
}

function effectScalingDetails(
  effect: FeatureEffect,
  fromLevel: number,
  toLevel: number,
): string[] {
  const rows = effect.bonusByLevel
  if (!rows?.length || !bonusRowsCrossLevel(rows, fromLevel, toLevel)) return []
  const before = resolveBonusEntryAtLevel(
    rows,
    fromLevel,
    fallbackBonusEntryFromDice(effect.bonusDice) ?? undefined,
  )
  const after = resolveBonusEntryAtLevel(rows, toLevel)
  if (!before || !after) return []
  const beforeLabel = formatBonusByLevelEntry(before)
  const afterLabel = formatBonusByLevelEntry(after)
  if (beforeLabel === afterLabel) return []
  const label = effect.label?.trim() || "Damage"
  return [`${label} increases from ${beforeLabel} to ${afterLabel}.`]
}

export function collectEffectScalingDetails(
  effects: FeatureEffect[] | undefined,
  fromLevel: number,
  toLevel: number,
): string[] {
  const details: string[] = []
  for (const effect of effects ?? []) {
    details.push(...effectScalingDetails(effect, fromLevel, toLevel))
  }
  return [...new Set(details)]
}

export function collectModifierScalingDetails(
  mods: CharacteristicModifier[] | undefined,
  fromLevel: number,
  toLevel: number,
  spellCatalog: SpellGrantCatalogRow[] = [],
): string[] {
  const details: string[] = []
  const prepared: string[] = []
  const learned: string[] = []
  for (const mod of mods ?? []) {
    details.push(...criticalHitImprovementDetails(mod, fromLevel, toLevel))
    const grants = collectUnlockedSpellNames(mod, fromLevel, toLevel, spellCatalog)
    prepared.push(...grants.prepared)
    learned.push(...grants.learned)
    details.push(...specialAttackImprovementDetails(mod, fromLevel, toLevel))
    details.push(...spiderClimbImprovementDetails(mod, fromLevel, toLevel))
    details.push(...speedImprovementDetails(mod, fromLevel, toLevel))
    details.push(...unarmedDieImprovementDetails(mod, fromLevel, toLevel))
    details.push(...usesCharacteristicImprovementDetails(mod, fromLevel, toLevel))
    details.push(...hitDiceRestoreImprovementDetails(mod, fromLevel, toLevel))
    details.push(...spellUnlockImprovementDetails(mod, fromLevel, toLevel))
  }
  details.push(...spellGrantSentences(prepared, learned))
  return [...new Set(details)]
}

export function collectLinkedInstanceScalingDetails(
  instances: LinkedModifierInstance[] | null | undefined,
  fromLevel: number,
  toLevel: number,
  spellCatalog: SpellGrantCatalogRow[] = [],
): string[] {
  const details: string[] = []
  for (const instance of instances ?? []) {
    details.push(
      ...collectEffectScalingDetails(
        [...(instance.activation?.effects ?? []), ...(instance.effects ?? [])],
        fromLevel,
        toLevel,
      ),
    )
  }
  details.unshift(
    ...collectModifierScalingDetails(
      (instances ?? []).flatMap((instance) => instance.characteristics ?? []),
      fromLevel,
      toLevel,
      spellCatalog,
    ),
  )
  return [...new Set(details)]
}

const CLASS_RESOURCES_SKIPPED_FROM_LEVEL_UP = new Set(["spell_slots"])

/** Class resource pools and dice that grow at `toLevel` (Rage uses, Bardic Inspiration die). */
export function collectClassResourceScalingImprovements(
  resources: ClassResource[] | null | undefined,
  fromLevel: number,
  toLevel: number,
): LevelUpFeatureImprovement[] {
  const out: LevelUpFeatureImprovement[] = []
  for (const resource of resources ?? []) {
    if (CLASS_RESOURCES_SKIPPED_FROM_LEVEL_UP.has(resource.id)) continue
    const details = usesConfigImprovementDetails(resource.uses, fromLevel, toLevel, resource.name)
    if (!details.length) continue
    out.push({
      name: resource.name,
      featureLevel: fromLevel,
      detail: details.join(" "),
      source: "class",
    })
  }
  return out
}

/**
 * Features already unlocked before this class level that gain a mechanical tier at `toLevel`
 * (e.g. Critical Shot expanding the crit range at Gunslinger 9).
 */
export function collectFeatureScalingImprovements(
  features: Feature[] | undefined,
  fromLevel: number,
  toLevel: number,
  source: "class" | "subclass",
  spellCatalog: SpellGrantCatalogRow[] = [],
): LevelUpFeatureImprovement[] {
  const out: LevelUpFeatureImprovement[] = []
  for (const feature of features ?? []) {
    if ((feature.level ?? 0) > fromLevel) continue
    const unique = [
      ...collectLinkedInstanceScalingDetails(
        feature.linkedModifiers,
        fromLevel,
        toLevel,
        spellCatalog,
      ),
      ...usesConfigImprovementDetails(feature.limitedUses, fromLevel, toLevel, feature.name),
    ]
    const deduped = [...new Set(unique)]
    if (deduped.length === 0) continue
    out.push({
      name: feature.name,
      featureLevel: feature.level ?? 0,
      detail: deduped.join(" "),
      source,
    })
  }
  return out
}

function pushSpeciesImprovement(
  out: LevelUpFeatureImprovement[],
  name: string,
  featureLevel: number,
  details: string[],
) {
  if (details.length === 0) return
  out.push({
    name,
    featureLevel,
    detail: details.join(" "),
    source: "species",
  })
}

/**
 * Species traits and lineage options whose spells or other modifiers unlock at character
 * level `toTotalLevel` (e.g. High Elf Detect Magic at 3, Dragonborn breath dice at 5).
 */
export function collectSpeciesScalingImprovements(
  species: Species | null | undefined,
  speciesTraitPicks: Record<string, string[]>,
  fromTotalLevel: number,
  toTotalLevel: number,
  spellCatalog: SpellGrantCatalogRow[] = [],
): LevelUpFeatureImprovement[] {
  if (!species) return []
  const out: LevelUpFeatureImprovement[] = []

  pushSpeciesImprovement(
    out,
    species.name,
    1,
    collectLinkedInstanceScalingDetails(
      species.linkedModifiers,
      fromTotalLevel,
      toTotalLevel,
      spellCatalog,
    ),
  )

  species.traits?.forEach((trait, index) => {
    const traitLevel = trait.level ?? 1
    if (traitLevel > fromTotalLevel) return
    const instances = [...(trait.linkedModifiers ?? [])]
    if (trait.isChoice && trait.choices?.options?.length) {
      const picked = resolveSpeciesTraitPicks(speciesTraitPicks, trait, index)
      for (const optionName of picked) {
        const option = trait.choices.options.find((entry) => entry.name === optionName)
        if (!option) continue
        instances.push(...(option.linkedModifiers ?? []))
      }
    }
    pushSpeciesImprovement(
      out,
      trait.name,
      traitLevel,
      collectLinkedInstanceScalingDetails(instances, fromTotalLevel, toTotalLevel, spellCatalog),
    )
  })

  return out
}

/** Traits that first become available at this character level. */
export function collectSpeciesTraitsGainedAtLevel(
  species: Species | null | undefined,
  fromTotalLevel: number,
  toTotalLevel: number,
): Array<{ name: string; level: number; description: string }> {
  if (!species) return []
  return (species.traits ?? [])
    .map((trait) => ({ trait, level: resolveSpeciesTraitUnlockLevel(trait) }))
    .filter(({ level }) => unlockFallsInRange(level, fromTotalLevel, toTotalLevel))
    .map(({ trait, level }) => ({
      name: trait.name,
      level,
      description: trait.description ?? "",
    }))
}

/**
 * Authored `trait.level`, or a single-level unlock phrased in the rules text
 * ("When you reach character level 5" / "Starting at character level 5").
 * Plural "levels 3 and 5" on lineage traits is ignored so those stay level 1.
 */
export function resolveSpeciesTraitUnlockLevel(trait: {
  level?: number
  description?: string | null
}): number {
  if (trait.level != null && trait.level > 1) return trait.level
  const text = trait.description ?? ""
  const match =
    text.match(/(?:when you reach|starting at)\s+character\s+level\s+(\d+)/i) ??
    text.match(/starting at\s+(\d+)(?:st|nd|rd|th)?\s+level\b/i)
  if (match) return parseInt(match[1], 10)
  return trait.level ?? 1
}
