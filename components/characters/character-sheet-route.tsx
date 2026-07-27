"use client"

import { use } from "react"
import { CharacterSheetLoader } from "@/components/characters/character-sheet-loader"

export function CharacterSheetRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CharacterSheetLoader id={id} />
}
