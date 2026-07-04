export const DASHBOARD_MIN_CHARACTERS = 2
export const DASHBOARD_MAX_CHARACTERS = 6

export type DashboardSelectionValidation =
  | { ok: true }
  | { ok: false; reason: string }

function dedupeIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function parseDashboardIdsParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean)
  return dedupeIds(parts).slice(0, DASHBOARD_MAX_CHARACTERS)
}

export function serializeDashboardIds(ids: string[]): string {
  return dedupeIds(ids).slice(0, DASHBOARD_MAX_CHARACTERS).join(",")
}

export function validateDashboardSelection(ids: string[]): DashboardSelectionValidation {
  const unique = dedupeIds(ids)
  if (unique.length < DASHBOARD_MIN_CHARACTERS) {
    return {
      ok: false,
      reason: `Select at least ${DASHBOARD_MIN_CHARACTERS} characters to open the GM Dashboard.`,
    }
  }
  if (unique.length > DASHBOARD_MAX_CHARACTERS) {
    return {
      ok: false,
      reason: `You can view at most ${DASHBOARD_MAX_CHARACTERS} characters at once.`,
    }
  }
  return { ok: true }
}

export function filterDashboardIds(
  ids: string[],
  knownIds: Set<string>,
): { valid: string[]; unknown: string[] } {
  const valid: string[] = []
  const unknown: string[] = []
  for (const id of dedupeIds(ids)) {
    if (knownIds.has(id)) valid.push(id)
    else unknown.push(id)
  }
  return { valid, unknown }
}

export function dashboardHref(ids: string[]): string {
  const serialized = serializeDashboardIds(ids)
  return serialized ? `/dashboard?ids=${encodeURIComponent(serialized)}` : "/dashboard"
}
