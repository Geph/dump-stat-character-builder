"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { PostRollDieBoost } from "@/lib/character/post-roll-die-boosts"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { LimitationEvaluationContext } from "@/lib/compendium/modifier-limitations"
import type { Feature } from "@/lib/types"

export type SheetFeatureEffectContext = {
  proficiencyBonus: number
  abilityMods: Record<AbilityScoreKey, number>
  characterLevel: number
  currentHp?: number
  /** Current die size (sides) per class-resource key — e.g. { superiority_dice: 8 }. */
  classResourceDieSides?: Record<string, number>
}

export type SheetRollContextValue = LimitationEvaluationContext & {
  activeConditions: string[]
  exhaustionLevel: number
  incapacitated: boolean
  /** Class/subclass features at or below the character's level (for passive roll modifiers). */
  classFeatures: Feature[]
  /** Params for gated roll bonuses (Jack of All Trades, etc.). */
  featureEffectContext?: SheetFeatureEffectContext
  /** Lowest d20 that scores a critical hit on attack rolls (default 20). */
  criticalHitMinimum?: number
  /** Feature-gated restores such as Dire Gambit (1 Risk Die). */
  onAttackCriticalHit?: () => void
  /** Features + picked custom abilities scanned for spend-after-the-roll dice (Knack). */
  postRollBoostFeatures?: Feature[]
  /** Remaining points in a class resource pool (by key). */
  classResourceAvailable?: (resourceKey: string) => number
  onSpendPostRollBoost?: (boost: PostRollDieBoost) => void
}

const defaultValue: SheetRollContextValue = {
  activeConditions: [],
  exhaustionLevel: 0,
  incapacitated: false,
  classFeatures: [],
}

const SheetRollContext = createContext<SheetRollContextValue>(defaultValue)

export function SheetRollProvider({
  value,
  children,
}: {
  value: SheetRollContextValue
  children: ReactNode
}) {
  return <SheetRollContext.Provider value={value}>{children}</SheetRollContext.Provider>
}

export function useSheetRollContext(): SheetRollContextValue {
  return useContext(SheetRollContext)
}
