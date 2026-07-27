/**
 * Read-only character snapshot for share links (/share/[token]).
 * Payload is a frozen export of the character at share time.
 */
export type CharacterShareSnapshot = {
  id: string
  /** Public token used in /share/[token] (may equal id). */
  token: string
  character_name: string
  /** Full character export-shaped payload (includes derived display fields). */
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export function normalizeShareSnapshotRow(row: Record<string, unknown>): CharacterShareSnapshot {
  const now = new Date().toISOString()
  const id = String(row.id ?? "")
  const token = String(row.token ?? id).trim() || id
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {}
  return {
    id,
    token,
    character_name: String(row.character_name ?? payload.name ?? "Character").trim() || "Character",
    payload,
    created_at: typeof row.created_at === "string" ? row.created_at : now,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : now,
  }
}

export function shareSnapshotHref(token: string): string {
  return `/share/${encodeURIComponent(token)}`
}
