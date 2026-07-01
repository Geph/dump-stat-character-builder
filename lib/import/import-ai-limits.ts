/** Max structured-output tokens per import content hint (caps cost / runaway JSON). */
export function maxOutputTokensForImport(contentTypeHint?: string | null): number {
  const hint = contentTypeHint?.trim().toLowerCase()
  switch (hint) {
    case "classes":
    case "subclasses":
      return 4096
    case "species":
    case "backgrounds":
    case "feats":
      return 3072
    case "spells":
      return 8192
    case "spell_lists":
      return 8192
    case "equipment":
      return 4096
    default:
      return 12_288
  }
}

/** Input text chunk size — leave headroom for system prompt + JSON schema overhead. */
export function getImportChunkSize(): number {
  const raw = process.env.IMPORT_AI_CHUNK_SIZE?.trim()
  if (raw) {
    const parsed = parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 10_000 && parsed <= 80_000) {
      return parsed
    }
  }
  return 36_000
}
