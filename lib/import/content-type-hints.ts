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
  { value: "invocations_metamagic", label: "Custom Invocations / Metamagic" },
] as const

export type ImportContentTypeHint = (typeof IMPORT_CONTENT_TYPE_HINTS)[number]["value"]

/** Hints that extract via the custom abilities / import_proposals.custom_abilities pipeline. */
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
    const label =
      IMPORT_CONTENT_TYPE_HINTS.find((entry) => entry.value === contentTypeHint)?.label ??
      contentTypeHint
    return `${systemPrompt}\n\nFocus primarily on extracting: ${label}. You may still extract other content types if clearly present.`
  }
  return systemPrompt
}
