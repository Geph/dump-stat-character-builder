export type DurationReminder = {
  id: string
  label: string
  /** Free-text remaining duration, e.g. "1 minute" or "end of next turn". */
  remaining: string
}

export function normalizeDurationReminders(raw: unknown): DurationReminder[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const row = entry as Partial<DurationReminder>
      if (typeof row.id !== "string" || typeof row.label !== "string") return null
      return {
        id: row.id,
        label: row.label,
        remaining: typeof row.remaining === "string" ? row.remaining : "",
      }
    })
    .filter((entry): entry is DurationReminder => entry != null)
}

export function createDurationReminder(label: string, remaining = ""): DurationReminder {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { id, label: label.trim() || "Effect", remaining: remaining.trim() }
}
