import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { prepareImportedContent } from "@/lib/import/finalize-import"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"

const FIXTURE_PATH = "c:/Users/Geph/Desktop/gemini-code-1782185151058.json"

describe("Gunslinger BYO import pipeline", () => {
  it("prepares review payload without throwing and serializes to JSON", () => {
    let raw: string
    try {
      raw = readFileSync(FIXTURE_PATH, "utf8")
    } catch {
      return
    }

    const content = parseImportContentJson(raw)
    expect(content).not.toBeNull()

    const prepared = prepareImportedContent(content!, { collisions: [], charLength: raw.length })
    expect(prepared.kind).toBe("confirm")

    if (prepared.kind !== "confirm") return

    const payload = {
      needsConfirmation: true,
      proposals: prepared.proposals,
      pendingContent: prepared.pendingContent,
      previewSummary: prepared.previewSummary,
      collisions: prepared.collisions,
      stages: prepared.stages,
      stagingSummary: prepared.stagingSummary,
      isLarge: prepared.isLarge,
    }

    expect(() => JSON.stringify(payload)).not.toThrow()
    expect(JSON.stringify(payload).length).toBeGreaterThan(1000)
  })
})
