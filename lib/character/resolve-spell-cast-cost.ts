import {
  getPointPoolSpellcasting,
  pointCostForSpellLevel,
  type PointPoolSpellcasting,
} from "@/lib/character/point-pool-spellcasting"
import {
  formatResourceKeyDisplayName,
  type SpellResourceCastCost,
} from "@/lib/character/spell-resource-cast-costs"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import {
  isCatalogFeatPickId,
  parseCatalogFeatPickId,
  resolveCatalogFeatPickEntry,
} from "@/lib/builder/catalog-feat-options"
import { METAMAGIC_OPTIONS_CATALOG_ID } from "@/lib/compendium/system-option-catalogs"
import type { CustomAbility, DndClass, Feat } from "@/lib/types"

export type MetamagicCastOption = {
  id: string
  name: string
  /** Sorcery Points (or similar point-pool) cost. 0 when the option spends Hit Dice instead. */
  cost: number
  /** Hit Point Dice spent when this option is used (Mortal Metamagic). */
  hitDiceCost?: number
  /** Sheet helper after cast (Empowered Spell damage rerolls). */
  effectHint?: "empowered_reroll" | "quicken" | null
}

export type SpellCastCostBlockReason =
  | "insufficient_points"
  | "base_over_spell_limit"
  | "metamagic_over_proficiency_cap"
  | "insufficient_hit_dice"
  | "no_casting_mode"

export type ResolvedSpellCastCost = {
  /** slots = normal slots; point_pool = level→cost table; resource = fixed per-spell cost */
  mode: "slots" | "point_pool" | "resource"
  castKind?: "pool" | "arcanum" | "resource"
  baseCost: number
  metamagicCost: number
  /** Total Hit Dice required by selected Mortal Metamagic options. */
  hitDiceCost: number
  totalCost: number
  canCast: boolean
  blockReason?: SpellCastCostBlockReason
  pointPool?: PointPoolSpellcasting
  resourceKey?: string
  resourceDisplayName?: string
  spellLimit?: number | null
  metamagicCap?: number | null
}

function maxPointPoolSpellLevel(pool: PointPoolSpellcasting): number {
  return Math.max(
    0,
    ...Object.keys(pool.cost_by_level)
      .map((key) => parseInt(key, 10))
      .filter((level) => !Number.isNaN(level) && level > 0),
  )
}

function parseMetamagicCostFromText(description: string | null | undefined): number {
  if (!description) return 0
  const match = description.match(/\b(?:costs?|spend|expend)\s+(\d+)\s+sorcery\s+points?\b/i)
  if (match) return parseInt(match[1], 10) || 0
  const alt = description.match(/\b(\d+)\s+sorcery\s+points?\b/i)
  if (alt) return parseInt(alt[1], 10) || 0
  return 0
}

function stripHtmlText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export function parseMetamagicCost(
  summary: string | null | undefined,
  description: string | null | undefined,
  spellLevel: number,
): number {
  const summaryText = summary?.trim() ?? ""
  if (/cost:\s*spell\s*level/i.test(summaryText)) {
    return Math.max(0, spellLevel)
  }
  const summaryMatch = summaryText.match(/cost:\s*(\d+)\s*sp\b/i)
  if (summaryMatch) return parseInt(summaryMatch[1], 10) || 0

  const plain = stripHtmlText(description ?? "")
  if (/\bequal to the spell'?s level\b/i.test(plain)) {
    return Math.max(0, spellLevel)
  }
  return parseMetamagicCostFromText(description)
}

export function metamagicOptionsFromFeats(
  feats: Feat[],
  spellLevel = 1,
): MetamagicCastOption[] {
  return feats
    .filter((feat) => feat.category?.toLowerCase() === "metamagic")
    .map((feat) => ({
      id: feat.id,
      name: feat.name,
      cost: parseMetamagicCost(null, feat.description, spellLevel),
    }))
}

export function metamagicOptionsFromCustomAbilities(
  abilities: CustomAbility[],
  selectedNames: string[],
  spellLevel = 1,
): MetamagicCastOption[] {
  if (!selectedNames.length || !abilities.length) return []
  const selected = new Set(selectedNames.map((name) => name.trim().toLowerCase()).filter(Boolean))
  const options: MetamagicCastOption[] = []
  for (const ability of abilities) {
    const key = ability.name.trim().toLowerCase()
    if (!selected.has(key)) continue
    if (!isMetamagicCustomAbility(ability)) continue
    options.push({
      id: ability.id,
      name: ability.name,
      cost: parseMetamagicCost(null, ability.description, spellLevel),
    })
  }
  return options
}

function isMetamagicCustomAbility(ability: CustomAbility): boolean {
  const description = ability.description ?? ""
  if (/\b(?:costs?|spend|expend)\s+\d+\s+sorcery\s+points?\b/i.test(description)) return true
  if (/\bequal to the spell'?s level\b/i.test(description) && /sorcery\s+points?/i.test(description)) {
    return true
  }
  // Dynamic Presence and similar option-library rows often omit a cast-time SP cost line.
  if (ability.ability_role === "knack" && /metamagic/i.test(description)) return true
  return false
}

export function metamagicOptionsForCharacter(params: {
  featIds: string[]
  feats: Feat[]
  customAbilities: CustomAbility[]
  /** Selected Metamagic knack names (class_knacks picks / grants). */
  selectedCustomAbilityNames?: string[]
  spellLevel?: number
}): MetamagicCastOption[] {
  const spellLevel = params.spellLevel ?? 1
  const options: MetamagicCastOption[] = []
  const seen = new Set<string>()

  for (const feat of metamagicOptionsFromFeats(params.feats, spellLevel)) {
    options.push(feat)
    seen.add(feat.id)
  }

  for (const pickId of params.featIds) {
    if (!isCatalogFeatPickId(pickId) || seen.has(pickId)) continue
    const parsed = parseCatalogFeatPickId(pickId)
    if (!parsed || parsed.catalogAbilityId !== METAMAGIC_OPTIONS_CATALOG_ID) continue
    const entry = resolveCatalogFeatPickEntry(pickId, params.customAbilities)
    if (!entry) continue
    options.push({
      id: pickId,
      name: entry.name,
      cost: parseMetamagicCost(entry.summary, entry.description, spellLevel),
    })
    seen.add(pickId)
  }

  for (const option of metamagicOptionsFromCustomAbilities(
    params.customAbilities,
    params.selectedCustomAbilityNames ?? [],
    spellLevel,
  )) {
    if (seen.has(option.id) || seen.has(option.name.toLowerCase())) continue
    options.push(option)
    seen.add(option.id)
    seen.add(option.name.toLowerCase())
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

/** Mortal Metamagic (and similar) options from subclass feature menus that spend Hit Dice. */
export function mortalMetamagicOptionsFromFeatures(
  features: Array<{
    name?: string | null
    linkedModifiers?: Array<{
      characteristics?: Array<{
        type?: string
        options?: Array<{ name?: string; hitDiceCost?: number | null }>
      }>
    }>
  }>,
): MetamagicCastOption[] {
  const options: MetamagicCastOption[] = []
  const seen = new Set<string>()
  for (const feature of features) {
    if (!/mortal\s+metamagic/i.test(feature.name ?? "")) continue
    for (const instance of feature.linkedModifiers ?? []) {
      for (const characteristic of instance.characteristics ?? []) {
        if (characteristic.type !== "resource_ability_menu") continue
        for (const option of characteristic.options ?? []) {
          const name = option.name?.trim()
          if (!name) continue
          const id = `mortal_metamagic:${name}`
          if (seen.has(id)) continue
          seen.add(id)
          const hitDiceCost = option.hitDiceCost != null && option.hitDiceCost > 0 ? option.hitDiceCost : undefined
          options.push({
            id,
            name,
            cost: 0,
            hitDiceCost,
            effectHint: /empowered/i.test(name)
              ? "empowered_reroll"
              : /quickened/i.test(name)
                ? "quicken"
                : null,
          })
        }
      }
    }
  }
  return options
}

export function totalMetamagicHitDiceCost(selected: MetamagicCastOption[]): number {
  return selected.reduce((sum, row) => sum + (row.hitDiceCost ?? 0), 0)
}

export function resolveSpellLimitCap(
  cls: Pick<DndClass, "class_resources">,
  capResourceKey: string | undefined,
  classLevel: number,
  ctx: ResolveUsesContext,
): number | null {
  if (!capResourceKey) return null
  const resources = resolveClassResourcesForClass({ id: "", name: "", ...cls })
  const cap = resources.find((row) => row.id === capResourceKey)
  if (!cap) return null
  return resolveUsesAtLevel(cap.uses, classLevel, ctx)
}

export function resolveSpellCastCost(params: {
  spellLevel: number
  spellcasting: DndClass["spellcasting"] | null | undefined
  classRow: Pick<DndClass, "class_resources">
  classLevel: number
  availablePoints: number
  selectedMetamagic: MetamagicCastOption[]
  ctx: ResolveUsesContext
  /** Remaining Hit Dice for Mortal Metamagic affordability. */
  availableHitDice?: number
  /** When casting Innate Arcanum tiers (above the point-pool table). */
  arcanumAvailable?: boolean
  /**
   * Per-spell fixed resource cost (e.g. Psion Alternate Effects via psi points).
   * Takes priority over class-level point_pool / slots for the base cast cost.
   */
  spellResourceCost?: SpellResourceCastCost | null
  /** Optional per-activation spend cap (e.g. Psi Limit). */
  resourceSpendCap?: number | null
}): ResolvedSpellCastCost {
  const metamagicCost = params.selectedMetamagic.reduce((sum, row) => sum + row.cost, 0)
  const hitDiceCost = totalMetamagicHitDiceCost(params.selectedMetamagic)
  const metamagicCap = params.ctx.proficiencyBonus ?? 2
  const availableHitDice = params.availableHitDice ?? Number.POSITIVE_INFINITY

  const applyHitDiceGate = (result: ResolvedSpellCastCost): ResolvedSpellCastCost => {
    if (!result.canCast) return { ...result, hitDiceCost }
    if (hitDiceCost > 0 && hitDiceCost > availableHitDice) {
      return {
        ...result,
        hitDiceCost,
        canCast: false,
        blockReason: "insufficient_hit_dice",
      }
    }
    return { ...result, hitDiceCost }
  }

  if (params.spellResourceCost && params.spellResourceCost.amount > 0) {
    const baseCost = params.spellResourceCost.amount
    const totalCost = baseCost + metamagicCost
    const resourceKey = params.spellResourceCost.resourceKey
    let canCast = true
    let blockReason: SpellCastCostBlockReason | undefined

    if (params.spellLevel > 0 && totalCost > params.availablePoints) {
      canCast = false
      blockReason = "insufficient_points"
    } else if (
      params.resourceSpendCap != null &&
      baseCost > params.resourceSpendCap
    ) {
      canCast = false
      blockReason = "base_over_spell_limit"
    } else if (metamagicCost > metamagicCap) {
      canCast = false
      blockReason = "metamagic_over_proficiency_cap"
    }

    return applyHitDiceGate({
      mode: "resource",
      castKind: "resource",
      baseCost,
      metamagicCost,
      hitDiceCost,
      totalCost,
      canCast,
      blockReason,
      resourceKey,
      resourceDisplayName: formatResourceKeyDisplayName(resourceKey),
      spellLimit: params.resourceSpendCap ?? null,
      metamagicCap,
    })
  }

  const pool = getPointPoolSpellcasting(params.spellcasting)

  if (!pool) {
    let canCast = true
    let blockReason: SpellCastCostBlockReason | undefined

    if (metamagicCost > params.availablePoints) {
      canCast = false
      blockReason = "insufficient_points"
    } else if (metamagicCost > metamagicCap) {
      canCast = false
      blockReason = "metamagic_over_proficiency_cap"
    }

    return applyHitDiceGate({
      mode: "slots",
      baseCost: 0,
      metamagicCost,
      hitDiceCost,
      totalCost: metamagicCost,
      canCast,
      blockReason,
      metamagicCap,
    })
  }

  const poolMaxLevel = maxPointPoolSpellLevel(pool)
  if (params.spellLevel > poolMaxLevel) {
    const canCast = params.arcanumAvailable !== false
    return applyHitDiceGate({
      mode: "point_pool",
      castKind: "arcanum",
      baseCost: 0,
      metamagicCost: 0,
      hitDiceCost,
      totalCost: 0,
      canCast,
      blockReason: canCast ? undefined : "insufficient_points",
      pointPool: pool,
      resourceKey: pool.resource_key,
      resourceDisplayName: formatResourceKeyDisplayName(pool.resource_key),
    })
  }

  const baseCost = pointCostForSpellLevel(pool, params.spellLevel)
  const totalCost = baseCost + metamagicCost

  const spellLimit = resolveSpellLimitCap(
    params.classRow,
    pool.base_cost_cap_resource_key,
    params.classLevel,
    params.ctx,
  )
  const metamagicCapFromPool =
    pool.metamagic_cost_cap === "proficiency_bonus" ? metamagicCap : null

  let canCast = true
  let blockReason: SpellCastCostBlockReason | undefined

  if (params.spellLevel > 0 && totalCost > params.availablePoints) {
    canCast = false
    blockReason = "insufficient_points"
  } else if (
    params.spellLevel > 0 &&
    spellLimit != null &&
    baseCost > spellLimit
  ) {
    canCast = false
    blockReason = "base_over_spell_limit"
  } else if (
    metamagicCapFromPool != null &&
    metamagicCost > metamagicCapFromPool
  ) {
    canCast = false
    blockReason = "metamagic_over_proficiency_cap"
  }

  return applyHitDiceGate({
    mode: "point_pool",
    castKind: "pool",
    baseCost,
    metamagicCost,
    hitDiceCost,
    totalCost,
    canCast,
    blockReason,
    pointPool: pool,
    resourceKey: pool.resource_key,
    resourceDisplayName: formatResourceKeyDisplayName(pool.resource_key),
    spellLimit,
    metamagicCap: metamagicCapFromPool,
  })
}
