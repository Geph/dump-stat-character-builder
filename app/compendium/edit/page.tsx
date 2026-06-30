"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { isCompendiumContentType, type CompendiumContentType } from "@/lib/compendium/content-types"
import dynamic from "next/dynamic"

const EDITORS: Record<CompendiumContentType, ReturnType<typeof dynamic>> = {
  classes: dynamic(() => import("./class-editor")),
  subclasses: dynamic(() => import("./subclass-editor")),
  species: dynamic(() => import("./species-editor")),
  backgrounds: dynamic(() => import("./background-editor")),
  spells: dynamic(() => import("./spell-editor")),
  feats: dynamic(() => import("./feat-editor")),
  equipment: dynamic(() => import("./equipment-editor")),
  languages: dynamic(() => import("./language-editor")),
  class_resources: dynamic(() => import("./class-resource-editor")),
  abilities: dynamic(() => import("./ability-editor")),
}

function CompendiumEditInner() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") ?? ""
  const id = searchParams.get("id")

  if (!isCompendiumContentType(type) || !id) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Editor not found</h1>
          <p className="text-muted-foreground">Choose content from the compendium to edit.</p>
        </main>
      </div>
    )
  }

  const Editor = EDITORS[type as CompendiumContentType]
  return <Editor id={id} />
}

export default function CompendiumEditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading editor…</p>
        </div>
      }
    >
      <CompendiumEditInner />
    </Suspense>
  )
}
