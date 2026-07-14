import type { UsesConfig } from "@/lib/types"

/** Stable key for sheet use-tracking (per-action or shared feature pool). */
export function resolveActionUsesTrackingKey(action: {
  id: string
  limitedUses?: UsesConfig | null
}): string {
  const share = action.limitedUses?.useShareKey?.trim()
  return share ? `share:${share}` : action.id
}
