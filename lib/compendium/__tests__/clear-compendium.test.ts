import { describe, expect, it, beforeEach, vi } from "vitest"
import { COMPENDIUM_TABLES } from "@/lib/db/tables"
import { clearEntireCompendium, CLEAR_COMPENDIUM_API_PATH } from "@/lib/compendium/clear-compendium"

const mocks = vi.hoisted(() => ({
  canClearCompendiumViaApi: vi.fn<() => boolean>(() => false),
  clearIndexedDbStore: vi.fn<(table: string) => Promise<void>>(async () => {}),
  ensureModifierCatalog: vi.fn<() => Promise<void>>(async () => {}),
  resetSpellSchoolsToDefault: vi.fn<() => void>(() => {}),
}))

vi.mock("@/lib/config/deploy-mode", () => ({
  canClearCompendiumViaApi: mocks.canClearCompendiumViaApi,
}))
vi.mock("@/lib/data/indexed-db-store", () => ({
  clearIndexedDbStore: mocks.clearIndexedDbStore,
}))
vi.mock("@/lib/db/client", () => ({ createClient: () => ({}) }))
vi.mock("@/lib/compendium/ensure-modifier-catalog", () => ({
  ensureModifierCatalog: mocks.ensureModifierCatalog,
}))
vi.mock("@/lib/compendium/schools-of-magic", () => ({
  resetSpellSchoolsToDefault: mocks.resetSpellSchoolsToDefault,
}))

function clearedTables(): string[] {
  return mocks.clearIndexedDbStore.mock.calls.map((call) => call[0])
}

describe("clearEntireCompendium", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    mocks.canClearCompendiumViaApi.mockReturnValue(false)
  })

  it("clears every compendium store in static mode", async () => {
    const result = await clearEntireCompendium()

    expect(clearedTables()).toEqual([...COMPENDIUM_TABLES])
    expect(result.cleared).toEqual(COMPENDIUM_TABLES)
  })

  it("leaves characters, parties, and snapshots alone", async () => {
    await clearEntireCompendium()

    expect(clearedTables()).not.toContain("characters")
    expect(clearedTables()).not.toContain("parties")
    expect(clearedTables()).not.toContain("character_snapshots")
  })

  it("restores the system modifier catalog and default spell schools", async () => {
    await clearEntireCompendium()

    expect(mocks.ensureModifierCatalog).toHaveBeenCalledTimes(1)
    expect(mocks.resetSpellSchoolsToDefault).toHaveBeenCalledTimes(1)
  })

  it("posts to the clear-all route in hosted mode instead of touching IndexedDB", async () => {
    mocks.canClearCompendiumViaApi.mockReturnValue(true)
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })))
    vi.stubGlobal("fetch", fetchMock)

    await clearEntireCompendium()

    expect(fetchMock).toHaveBeenCalledWith(CLEAR_COMPENDIUM_API_PATH, { method: "POST" })
    expect(mocks.clearIndexedDbStore).not.toHaveBeenCalled()
    expect(mocks.resetSpellSchoolsToDefault).toHaveBeenCalledTimes(1)
  })

  it("surfaces the server error message when the hosted clear fails", async () => {
    mocks.canClearCompendiumViaApi.mockReturnValue(true)
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Database unavailable" }), { status: 503 }),
      ),
    )

    await expect(clearEntireCompendium()).rejects.toThrow("Database unavailable")
    expect(mocks.resetSpellSchoolsToDefault).not.toHaveBeenCalled()
  })
})
