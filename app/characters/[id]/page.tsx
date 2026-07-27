import { Suspense } from "react"
import { CharacterSheetRoute } from "@/components/characters/character-sheet-route"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"

export default function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className={pageFloatingHintClass}>Loading character sheet…</p>
        </div>
      }
    >
      <CharacterSheetRoute params={params} />
    </Suspense>
  )
}
