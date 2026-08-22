import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  DISPLAY_NON_COMBAT_ACTIONS_CHANGE_EVENT,
  DISPLAY_NON_COMBAT_ACTIONS_STORAGE_KEY,
  isDisplayNonCombatActionsEnabled,
  setDisplayNonCombatActionsEnabled,
} from "@/lib/site-settings/display-non-combat-actions"

describe("display non-combat actions setting", () => {
  const values = new Map<string, string>()
  const localStorageStub = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  }
  const dispatchEvent = vi.fn()

  beforeEach(() => {
    values.clear()
    vi.stubGlobal("localStorage", localStorageStub)
    vi.stubGlobal("window", { dispatchEvent })
    vi.stubGlobal("CustomEvent", class {
      constructor(public type: string) {}
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("defaults to enabled", () => {
    expect(isDisplayNonCombatActionsEnabled()).toBe(true)
  })

  it("persists only the disabled override and broadcasts changes", () => {
    setDisplayNonCombatActionsEnabled(false)
    expect(values.get(DISPLAY_NON_COMBAT_ACTIONS_STORAGE_KEY)).toBe("0")
    expect(isDisplayNonCombatActionsEnabled()).toBe(false)
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe(DISPLAY_NON_COMBAT_ACTIONS_CHANGE_EVENT)

    setDisplayNonCombatActionsEnabled(true)
    expect(values.has(DISPLAY_NON_COMBAT_ACTIONS_STORAGE_KEY)).toBe(false)
    expect(isDisplayNonCombatActionsEnabled()).toBe(true)
  })
})
