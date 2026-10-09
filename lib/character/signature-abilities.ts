import type { SheetActionEntry } from "@/lib/character/sheet-actions"

export type SignatureTarget = { kind: "action" | "spell"; id: string }
export type SignatureSlots = [SignatureTarget | null, SignatureTarget | null]
export const SIGNATURE_DRAG_TYPE = "application/x-dump-stat-signature"

export function parseSignatureTarget(value: unknown): SignatureTarget | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  return (row.kind === "action" || row.kind === "spell") && typeof row.id === "string" && row.id.trim()
    ? { kind: row.kind, id: row.id } : null
}

export function defaultSignatureAction(actions: SheetActionEntry[]): SignatureTarget | null {
  const action = actions.find((entry) => entry.classResourceKey ||
    entry.limitedUses?.classResourceKey)
  return action ? { kind: "action", id: action.id } : null
}

/** A target occupies only one slot. Explicit empty slots stay empty on reload. */
export function placeSignature(slots: SignatureSlots, index: 0 | 1, target: SignatureTarget | null): SignatureSlots {
  const next: SignatureSlots = [...slots]
  next[index] = target
  const other = index === 0 ? 1 : 0
  if (target && next[other]?.kind === target.kind && next[other]?.id === target.id) next[other] = null
  return next
}
