"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { CompendiumContentType } from "@/lib/compendium/content-types"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import {
  canDuplicateCompendiumItem,
  duplicateCompendiumItem,
} from "@/lib/compendium/duplicate-compendium-item"
import { createClient } from "@/lib/db/client"

export function useDuplicateCompendiumItem(
  tab: CompendiumContentType,
  id: string,
  row?: { is_system?: boolean | null },
) {
  const router = useRouter()
  const [copying, setCopying] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const canCopy = canDuplicateCompendiumItem(tab, id, row)

  const handleCopy = useCallback(async () => {
    if (!canCopy || copying) return
    setCopying(true)
    setCopyError(null)
    const result = await duplicateCompendiumItem(createClient(), tab, id)
    setCopying(false)
    if ("error" in result) {
      setCopyError(result.error)
      return
    }
    router.push(compendiumEditHref(tab, result.id))
  }, [canCopy, copying, tab, id, router])

  return { handleCopy, copying, copyError, canCopy }
}
