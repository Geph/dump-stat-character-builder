"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/db/client"
import { loadModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"

export function useModifierCatalog() {
  const [catalog, setCatalog] = useState<ModifierCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const db = createClient()
      const entries = await loadModifierCatalog(db)
      setCatalog(entries)
    } catch {
      setCatalog([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { catalog, loading, refresh }
}
