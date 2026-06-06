"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { compendiumEditHref } from "@/lib/compendium/edit-href"

export default function LegacyAbilityEditorRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()

  useEffect(() => {
    void params.then(({ id }) => {
      router.replace(compendiumEditHref("abilities", id))
    })
  }, [params, router])

  return null
}
