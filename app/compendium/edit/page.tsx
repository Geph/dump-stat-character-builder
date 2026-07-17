"use client"

import { Suspense, type ComponentType } from "react"
import { useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { isCompendiumContentType, type CompendiumContentType } from "@/lib/compendium/content-types"
import dynamic from "next/dynamic"

const EDITORS: Record<CompendiumContentType, ComponentType<{ id: string }>> = {
  classes: dynamic(() => import("./class-editor")),
  subclasses: dynamic(() => import("./subclass-editor")),
  species: dynamic(() => import("./species-editor")),
  backgrounds: dynamic(() => import("./background-editor")),
  spells: dynamic(() => import("./spell-editor")),
  feats: dynamic(() => import("./feat-editor")),
  creatures: dynamic(() => import("./creature-editor")),
  equipment: dynamic(() => import("./equipment-editor")),
  magic_items: dynamic(() => import("./equipment-editor")),
  languages: dynamic(() => import("./language-editor")),
  tools: dynamic(() => import("./tool-editor")),
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
          <p className={pageFloatingHintClass}>Choose content from the compendium to edit.</p>
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
          <p className={pageFloatingHintClass}>Loading editor…</p>
        </div>
      }
    >
      <CompendiumEditInner />
    </Suspense>
  )
}
