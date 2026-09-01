export type DurationReminder = {
  id: string
  label: string
  /** Free-text remaining duration, e.g. "1 minute" or "end of next turn". */
  remaining: string
  /** When set, clearing this reminder also turns off the linked banner toggle. */
  sheetToggleId?: string
}

export function normalizeDurationReminders(raw: unknown): DurationReminder[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry): DurationReminder | null => {
      if (!entry || typeof entry !== "object") return null
      const row = entry as Partial<DurationReminder>
      if (typeof row.id !== "string" || typeof row.label !== "string") return null
      const reminder: DurationReminder = {
        id: row.id,
        label: row.label,
        remaining: typeof row.remaining === "string" ? row.remaining : "",
      }
      if (typeof row.sheetToggleId === "string") reminder.sheetToggleId = row.sheetToggleId
      return reminder
    })
    .filter((entry): entry is DurationReminder => entry != null)
}

export function createDurationReminder(
  label: string,
  remaining = "",
  sheetToggleId?: string,
): DurationReminder {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    label: label.trim() || "Effect",
    remaining: remaining.trim(),
    sheetToggleId,
  }
}
