import CharacterSheetClient from "./character-sheet-client"

export default async function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CharacterSheetClient id={id} />
}
