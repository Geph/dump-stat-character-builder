"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { CharacterSheetLoader } from "@/components/characters/character-sheet-loader"

function CharacterSheetInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Character not found</h1>
          <p className={pageFloatingHintClass}>Open a character from your roster.</p>
        </main>
      </div>
    )
  }

  return <CharacterSheetLoader id={id} />
}

export default function CharacterSheetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className={pageFloatingHintClass}>Loading character…</p>
        </div>
      }
    >
      <CharacterSheetInner />
    </Suspense>
  )
}
