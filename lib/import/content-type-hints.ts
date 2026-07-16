export const IMPORT_CONTENT_TYPE_HINTS = [
  { value: "all", label: "Auto-detect All" },
  { value: "classes", label: "Class (include spell list)" },
  { value: "subclasses", label: "Subclasses" },
  { value: "species", label: "Species" },
  { value: "backgrounds", label: "Backgrounds" },
  { value: "spells", label: "Spells" },
  { value: "feats", label: "Feats, Fighting Styles, Boons" },
  { value: "equipment", label: "Equipment" },
  { value: "abilities", label: "Custom Abilities / Resources" },
] as const

export type ImportContentTypeHint = (typeof IMPORT_CONTENT_TYPE_HINTS)[number]["value"]

export function appendContentTypeHintToPrompt(
  systemPrompt: string,
  contentTypeHint: string | null | undefined,
): string {
  if (contentTypeHint && contentTypeHint !== "all") {
    return `${systemPrompt}\n\nFocus primarily on extracting: ${contentTypeHint}. You may still extract other content types if clearly present.`
  }
  return systemPrompt
}
