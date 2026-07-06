"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"

const BuilderPageClient = dynamic(() => import("@/components/builder/builder-page-client"), {
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className={pageFloatingHintClass}>Loading builder…</p>
    </div>
  ),
})

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className={pageFloatingHintClass}>Loading builder…</p>
        </div>
      }
    >
      <BuilderPageClient />
    </Suspense>
  )
}
