import { describe, expect, it } from "vitest"
import {
  ensureMigrationsApplied,
  resetMigrationsCacheForTests,
} from "@/lib/db/migrate"

describe("ensureMigrationsApplied", () => {
  it("returns the same in-flight promise for concurrent callers", () => {
    resetMigrationsCacheForTests()

    const pool = {
      query: async () => [[{ Field: "version" }], []] as const,
    } as unknown as import("mysql2/promise").Pool

    const first = ensureMigrationsApplied(pool)
    const second = ensureMigrationsApplied(pool)
    expect(first).toBe(second)
  })
})
