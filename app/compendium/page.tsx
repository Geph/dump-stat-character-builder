"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"

const CompendiumPageClient = dynamic(() => import("@/components/compendium/compendium-page-client"), {
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className={pageFloatingHintClass}>Loading compendium…</p>
    </div>
  ),
})

export default function CompendiumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className={pageFloatingHintClass}>Loading compendium…</p>
        </div>
      }
    >
      <CompendiumPageClient />
    </Suspense>
  )
}
