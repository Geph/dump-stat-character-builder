"use client"

import { createContext, useContext, type ReactNode } from "react"

export type SheetRollContextValue = {
  activeConditions: string[]
  exhaustionLevel: number
  incapacitated: boolean
}

const defaultValue: SheetRollContextValue = {
  activeConditions: [],
  exhaustionLevel: 0,
  incapacitated: false,
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
