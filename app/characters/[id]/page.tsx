import { CharacterSheetLoader } from "@/components/characters/character-sheet-loader"

export default async function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CharacterSheetLoader id={id} />
}
