import { describe, expect, it } from "vitest"
import { createDurationReminder } from "@/lib/character/duration-reminders"
import {
  removeRemindersForToggle,
  sheetToggleIdsClearedWithReminders,
  toggleIdsEndedByPlayState,
  upsertToggleDurationReminder,
} from "@/lib/character/sheet-toggle-duration"
import { getSheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"

const dancing = getSheetToggleDefinition("while_dancing")!

describe("sheet-toggle-duration", () => {
  it("upserts a 1-minute Dancing reminder and replaces an existing one", () => {
    const first = upsertToggleDurationReminder([], dancing)
    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({
      label: "Dancing",
      remaining: "1 minute",
      sheetToggleId: "while_dancing",
    })
    const refreshed = upsertToggleDurationReminder(
      [{ ...first[0], remaining: "almost done" }],
      dancing,
    )
    expect(refreshed).toHaveLength(1)
    expect(refreshed[0]?.remaining).toBe("1 minute")
    expect(refreshed[0]?.id).toBe(first[0]?.id)
  })

  it("does not add a reminder for toggles without a default duration", () => {
    const raging = getSheetToggleDefinition("while_raging")!
    expect(upsertToggleDurationReminder([], raging)).toEqual([])
  })

  it("removes only the linked toggle reminder", () => {
    const dancingReminder = createDurationReminder("Dancing", "1 minute", "while_dancing")
    const bless = createDurationReminder("Bless", "1 minute")
    expect(removeRemindersForToggle([dancingReminder, bless], "while_dancing")).toEqual([bless])
  })

  it("ends dancing when incapacitated or speed is 0", () => {
    const definitions = [dancing]
    expect(
      toggleIdsEndedByPlayState({
        definitions,
        activeToggleIds: ["while_dancing"],
        incapacitated: true,
        speedZero: false,
      }),
    ).toEqual(["while_dancing"])
    expect(
      toggleIdsEndedByPlayState({
        definitions,
        activeToggleIds: ["while_dancing"],
        incapacitated: false,
        speedZero: true,
      }),
    ).toEqual(["while_dancing"])
    expect(
      toggleIdsEndedByPlayState({
        definitions,
        activeToggleIds: ["while_dancing"],
        incapacitated: false,
        speedZero: false,
      }),
    ).toEqual([])
  })

  it("reports toggle ids whose linked reminders were cleared", () => {
    const dancingReminder = createDurationReminder("Dancing", "1 minute", "while_dancing")
    const bless = createDurationReminder("Bless", "1 minute")
    expect(sheetToggleIdsClearedWithReminders([dancingReminder, bless], [bless])).toEqual([
      "while_dancing",
    ])
  })
})
