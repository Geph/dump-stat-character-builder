export const IMPORT_CONTENT_TYPE_HINTS = [
  { value: "all", label: "Auto-detect All" },
  { value: "classes", label: "Class + subclasses (include spell list)" },
  { value: "subclasses", label: "Subclasses only (parent already imported)" },
  { value: "species", label: "Species" },
  { value: "backgrounds", label: "Backgrounds" },
  { value: "languages", label: "Languages" },
  { value: "spells", label: "Spells" },
  { value: "feats", label: "Feats, Fighting Styles, Boons" },
  { value: "creatures", label: "Creatures & Companions" },
  { value: "equipment", label: "Equipment" },
  { value: "abilities", label: "Custom Abilities / Resources" },
  { value: "invocations_metamagic", label: "Custom Invocations / Metamagic" },
  { value: "images", label: "Images from URL" },
] as const

export type ImportContentTypeHint = (typeof IMPORT_CONTENT_TYPE_HINTS)[number]["value"]

/** Hints that extract via the custom abilities / import_proposals.custom_abilities pipeline. */
export function isImagesContentTypeHint(contentTypeHint: string | null | undefined): boolean {
  return contentTypeHint?.trim().toLowerCase() === "images"
}

export function isCustomAbilitiesContentTypeHint(
  contentTypeHint: string | null | undefined,
): boolean {
  const hint = contentTypeHint?.trim().toLowerCase()
  return hint === "abilities" || hint === "invocations_metamagic"
}

export function appendContentTypeHintToPrompt(
  systemPrompt: string,
  contentTypeHint: string | null | undefined,
): string {
  if (contentTypeHint && contentTypeHint !== "all") {
    if (contentTypeHint === "images") {
      return `${systemPrompt}\n\nFocus only on card_art[] image URL mapping. Do not extract class features, spells, or other rules content.`
    }
    const label =
      IMPORT_CONTENT_TYPE_HINTS.find((entry) => entry.value === contentTypeHint)?.label ??
      contentTypeHint
    return `${systemPrompt}\n\nFocus primarily on extracting: ${label}. You may still extract other content types if clearly present.`
  }
  return systemPrompt
}
