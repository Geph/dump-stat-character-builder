import {
  getPointPoolSpellcasting,
  pointCostForSpellLevel,
  type PointPoolSpellcasting,
} from "@/lib/character/point-pool-spellcasting"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import type { DndClass, Feat } from "@/lib/types"

export type MetamagicCastOption = {
  id: string
  name: string
  cost: number
}

export type SpellCastCostBlockReason =
  | "insufficient_points"
  | "base_over_spell_limit"
  | "metamagic_over_proficiency_cap"
  | "no_casting_mode"

export type ResolvedSpellCastCost = {
  mode: "slots" | "point_pool"
  castKind?: "pool" | "arcanum"
  baseCost: number
  metamagicCost: number
  totalCost: number
  canCast: boolean
  blockReason?: SpellCastCostBlockReason
  pointPool?: PointPoolSpellcasting
  resourceKey?: string
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

export function metamagicOptionsFromFeats(feats: Feat[]): MetamagicCastOption[] {
  return feats
    .filter((feat) => feat.category?.toLowerCase() === "metamagic")
    .map((feat) => ({
      id: feat.id,
      name: feat.name,
      cost: parseMetamagicCostFromText(feat.description),
    }))
}

export function resolveSpellLimitCap(
  cls: Pick<DndClass, "class_resources">,
  capResourceKey: string | undefined,
  classLevel: number,
  ctx: ResolveUsesContext,
): number | null {
  if (!capResourceKey) return null
  const resources = resolveClassResourcesForClass(cls)
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
  /** When casting Innate Arcanum tiers (above the point-pool table). */
  arcanumAvailable?: boolean
}): ResolvedSpellCastCost {
  const pool = getPointPoolSpellcasting(params.spellcasting)
  if (!pool) {
    return {
      mode: "slots",
      baseCost: 0,
      metamagicCost: 0,
      totalCost: 0,
      canCast: true,
    }
  }

  const poolMaxLevel = maxPointPoolSpellLevel(pool)
  if (params.spellLevel > poolMaxLevel) {
    const canCast = params.arcanumAvailable !== false
    return {
      mode: "point_pool",
      castKind: "arcanum",
      baseCost: 0,
      metamagicCost: 0,
      totalCost: 0,
      canCast,
      blockReason: canCast ? undefined : "insufficient_points",
      pointPool: pool,
      resourceKey: pool.resource_key,
    }
  }

  const baseCost = pointCostForSpellLevel(pool, params.spellLevel)
  const metamagicCost = params.selectedMetamagic.reduce((sum, row) => sum + row.cost, 0)
  const totalCost = baseCost + metamagicCost

  const spellLimit = resolveSpellLimitCap(
    params.classRow,
    pool.base_cost_cap_resource_key,
    params.classLevel,
    params.ctx,
  )
  const metamagicCap =
    pool.metamagic_cost_cap === "proficiency_bonus"
      ? (params.ctx.proficiencyBonus ?? 2)
      : null

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
    metamagicCap != null &&
    metamagicCost > metamagicCap
  ) {
    canCast = false
    blockReason = "metamagic_over_proficiency_cap"
  }

  return {
    mode: "point_pool",
    castKind: "pool",
    baseCost,
    metamagicCost,
    totalCost,
    canCast,
    blockReason,
    pointPool: pool,
    resourceKey: pool.resource_key,
    spellLimit,
    metamagicCap,
  }
}
