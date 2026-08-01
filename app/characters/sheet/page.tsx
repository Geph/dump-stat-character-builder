"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { CharacterSheetLoader } from "@/components/characters/character-sheet-loader"
import { characterSheetHref } from "@/lib/compendium/edit-href"

function CharacterSheetInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")
  const justSaved = searchParams.get("saved") === "1"
  const [showSavedBanner, setShowSavedBanner] = useState(justSaved)

  useEffect(() => {
    if (!id || !justSaved) return
    setShowSavedBanner(true)
    // Drop the query flag so refresh doesn't re-show the banner.
    router.replace(characterSheetHref(id), { scroll: false })
    const timer = window.setTimeout(() => setShowSavedBanner(false), 4000)
    return () => window.clearTimeout(timer)
  }, [id, justSaved, router])

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

  return (
    <>
      {showSavedBanner ? (
        <div
          role="status"
          className="border-b border-success/30 bg-success/10 px-4 py-2.5 text-center text-sm font-semibold text-foreground"
        >
          Character saved. You&apos;re on the character sheet.
        </div>
      ) : null}
      <CharacterSheetLoader id={id} />
    </>
  )
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
