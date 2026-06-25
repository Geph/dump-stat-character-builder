"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Legacy route — redirects to the unified compendium editor. */
export default function LegacyEquipmentEditorRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()

  useEffect(() => {
    void params.then(({ id }) => {
      router.replace(`/compendium/edit?type=equipment&id=${encodeURIComponent(id)}`)
    })
  }, [params, router])

  return null
}
