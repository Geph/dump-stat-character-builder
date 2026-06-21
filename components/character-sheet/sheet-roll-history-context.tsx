"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  createSheetRollEntry,
  loadSheetRollHistory,
  saveSheetRollHistory,
  type SheetRollEntry,
} from "@/lib/character/sheet-roll-history"

type SheetRollHistoryContextValue = {
  entries: SheetRollEntry[]
  logRoll: (entry: Omit<SheetRollEntry, "id" | "at">) => void
  clearHistory: () => void
}

const SheetRollHistoryContext = createContext<SheetRollHistoryContextValue | null>(null)

export function SheetRollHistoryProvider({
  characterId,
  children,
}: {
  characterId: string
  children: ReactNode
}) {
  const [entries, setEntries] = useState<SheetRollEntry[]>(() =>
    loadSheetRollHistory(characterId),
  )

  const logRoll = useCallback(
    (partial: Omit<SheetRollEntry, "id" | "at">) => {
      const entry = createSheetRollEntry(partial)
      setEntries((prev) => {
        const next = [entry, ...prev]
        saveSheetRollHistory(characterId, next)
        return next
      })
    },
    [characterId],
  )

  const clearHistory = useCallback(() => {
    setEntries([])
    saveSheetRollHistory(characterId, [])
  }, [characterId])

  const value = useMemo(
    () => ({ entries, logRoll, clearHistory }),
    [entries, logRoll, clearHistory],
  )

  return (
    <SheetRollHistoryContext.Provider value={value}>{children}</SheetRollHistoryContext.Provider>
  )
}

export function useSheetRollHistory(): SheetRollHistoryContextValue | null {
  return useContext(SheetRollHistoryContext)
}
