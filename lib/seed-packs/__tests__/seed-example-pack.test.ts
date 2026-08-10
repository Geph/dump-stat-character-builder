import { describe, expect, it, vi } from "vitest"
import { seedExamplePack } from "@/lib/seed-packs/seed-example-pack"

describe("seedExamplePack resilience", () => {
  it("continues after a per-file persist error and reports partial success", async () => {
    const persist = vi.fn(async (content: { classes?: { name: string }[] }) => {
      const name = content.classes?.[0]?.name
      if (name === "Captain") {
        throw new Error("Creature import record failed validation")
      }
      return { totalImported: 1, breakdown: { classes: 1 }, warnings: [] }
    })

    const result = await seedExamplePack("mage-hand-press", persist as never)

    expect(result.filesAttempted).toBeGreaterThan(2)
    expect(result.filesSucceeded).toBe(result.filesAttempted - result.errors.length)
    expect(result.errors.some((e) => e.fileLabel === "Captain")).toBe(true)
    expect(result.partial || result.filesSucceeded > 0).toBe(true)
    expect(result.total).toBe(result.filesSucceeded)
  })

  it("retries only requested file indexes", async () => {
    const persist = vi.fn(async () => ({
      totalImported: 2,
      breakdown: { classes: 1, subclasses: 1 },
      warnings: [] as string[],
    }))

    const result = await seedExamplePack("mage-hand-press", persist as never, {
      onlyFileIndexes: [2],
    })

    expect(persist).toHaveBeenCalledTimes(1)
    expect(result.filesAttempted).toBe(1)
    expect(result.filesSucceeded).toBe(1)
    expect(result.errors).toEqual([])
  })
})
