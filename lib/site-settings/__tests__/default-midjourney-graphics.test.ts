import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT,
  DEFAULT_MIDJOURNEY_GRAPHICS_STORAGE_KEY,
  areDefaultMidjourneyGraphicsDisabled,
  setDefaultMidjourneyGraphicsDisabled,
} from "@/lib/site-settings/default-midjourney-graphics"

describe("default Midjourney graphics setting", () => {
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

  it("defaults to enabled bundled graphics", () => {
    expect(areDefaultMidjourneyGraphicsDisabled()).toBe(false)
  })

  it("persists the disable flag and broadcasts changes", () => {
    setDefaultMidjourneyGraphicsDisabled(true)
    expect(values.get(DEFAULT_MIDJOURNEY_GRAPHICS_STORAGE_KEY)).toBe("1")
    expect(areDefaultMidjourneyGraphicsDisabled()).toBe(true)
    expect(dispatchEvent.mock.calls[0]?.[0]?.type).toBe(DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT)

    setDefaultMidjourneyGraphicsDisabled(false)
    expect(values.has(DEFAULT_MIDJOURNEY_GRAPHICS_STORAGE_KEY)).toBe(false)
    expect(areDefaultMidjourneyGraphicsDisabled()).toBe(false)
  })
})
