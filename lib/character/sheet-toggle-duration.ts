import {
  createDurationReminder,
  type DurationReminder,
} from "@/lib/character/duration-reminders"
import { formatFeatureDuration } from "@/lib/compendium/feature-duration"
import type { SheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"

export function upsertToggleDurationReminder(
  reminders: DurationReminder[],
  toggle: Pick<SheetToggleDefinition, "id" | "label" | "defaultDuration">,
): DurationReminder[] {
  if (!toggle.defaultDuration) return reminders
  const remaining = formatFeatureDuration(toggle.defaultDuration)
  const existing = reminders.find((row) => row.sheetToggleId === toggle.id)
  if (existing) {
    return reminders.map((row) =>
      row.sheetToggleId === toggle.id
        ? { ...row, label: toggle.label, remaining }
        : row,
    )
  }
  return [...reminders, createDurationReminder(toggle.label, remaining, toggle.id)]
}

export function removeRemindersForToggle(
  reminders: DurationReminder[],
  toggleId: string,
): DurationReminder[] {
  return reminders.filter((row) => row.sheetToggleId !== toggleId)
}

export function reminderForSheetToggle(
  reminders: DurationReminder[],
  toggleId: string,
): DurationReminder | undefined {
  return reminders.find((row) => row.sheetToggleId === toggleId)
}

export function toggleIdsEndedByPlayState(params: {
  definitions: SheetToggleDefinition[]
  activeToggleIds: string[]
  incapacitated: boolean
  speedZero: boolean
}): string[] {
  const byId = new Map(params.definitions.map((entry) => [entry.id, entry]))
  return params.activeToggleIds.filter((id) => {
    const endsWhen = byId.get(id)?.endsWhen
    if (!endsWhen) return false
    if (endsWhen.incapacitated && params.incapacitated) return true
    if (endsWhen.speedZero && params.speedZero) return true
    return false
  })
}

export function sheetToggleIdsClearedWithReminders(
  previous: DurationReminder[],
  next: DurationReminder[],
): string[] {
  const stillLinked = new Set(
    next.map((row) => row.sheetToggleId).filter((id): id is string => Boolean(id)),
  )
  const cleared = new Set<string>()
  for (const row of previous) {
    if (row.sheetToggleId && !stillLinked.has(row.sheetToggleId)) {
      cleared.add(row.sheetToggleId)
    }
  }
  return [...cleared]
}
