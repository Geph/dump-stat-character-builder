"use client"

import dynamic from "next/dynamic"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"

const CharacterSheetClient = dynamic(() => import("@/components/characters/character-sheet-client"), {
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className={pageFloatingHintClass}>Loading character sheet…</p>
    </div>
  ),
})

export function CharacterSheetLoader({ id }: { id: string }) {
  return <CharacterSheetClient id={id} />
}
