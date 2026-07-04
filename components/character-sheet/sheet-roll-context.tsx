"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { LimitationEvaluationContext } from "@/lib/compendium/modifier-limitations"
import type { Feature } from "@/lib/types"

export type SheetFeatureEffectContext = {
  proficiencyBonus: number
  abilityMods: Record<AbilityScoreKey, number>
  characterLevel: number
  currentHp?: number
}

export type SheetRollContextValue = LimitationEvaluationContext & {
  activeConditions: string[]
  exhaustionLevel: number
  incapacitated: boolean
  /** Class/subclass features at or below the character's level (for passive roll modifiers). */
  classFeatures: Feature[]
  /** Params for gated roll bonuses (Jack of All Trades, etc.). */
  featureEffectContext?: SheetFeatureEffectContext
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
