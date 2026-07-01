import { describe, expect, it, vi } from "vitest"
import { runClientByoJsonImport } from "@/lib/import/client-byo-import"

vi.mock("@/lib/import/detect-import-collisions-local", () => ({
  detectImportCollisionsLocal: vi.fn(async () => []),
}))

describe("runClientByoJsonImport", () => {
  it("returns review state for valid BYO JSON", async () => {
    const json = JSON.stringify({
      equipment: [
        {
          name: "Test Wondrous Item",
          category: "Other",
          description: "A test item.",
        },
      ],
    })

    const result = await runClientByoJsonImport(json, "Test Source")
    expect("needsConfirmation" in result && result.needsConfirmation).toBe(true)
    if ("needsConfirmation" in result && result.needsConfirmation) {
      expect(result.pendingContent.equipment?.[0]?.name).toBe("Test Wondrous Item")
      expect(result.proposals).toBeDefined()
    }
  })

  it("rejects invalid JSON", async () => {
    await expect(runClientByoJsonImport("not json", "Custom")).rejects.toThrow(/parse/i)
  })

  it("blocks multiple classes in one import", async () => {
    const json = JSON.stringify({
      classes: [{ name: "Alpha", features: [] }, { name: "Beta", features: [] }],
    })
    await expect(runClientByoJsonImport(json, "Custom")).rejects.toThrow(/one class at a time/i)
  })
})
