import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  assignFeatureClaims,
  collectClassClaimCoverage,
  decomposeFeatureDescription,
  formatClassClaimCoverageReport,
} from "@/lib/import/feature-claims"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { sanitizeImportContentForPersist } from "@/lib/import/sanitize-import-content"
import type { Feature } from "@/lib/types"

const FIXTURE_PATH = join(__dirname, "fixtures", "necromancer-class.json")
const DRIVE_PATH = resolveHomebrewImportJsonPath("magehandpress-necromancer-class")

describe("feature claim decomposition", () => {
  it("splits a multi-claim feature into atomic sentences", () => {
    const texts = decomposeFeatureDescription(
      [
        "<p>Flavor about commanding lifeless servants.</p>",
        "<p><strong>Animate.</strong> You can animate Undead companions by performing a ritual over 10 minutes.</p>",
        "<p><strong>Command.</strong> You can mentally control those companions without an action.</p>",
        "<p><strong>Mend.</strong> You can spend pool points to restore hit points to a companion.</p>",
      ].join(""),
    )
    expect(texts.length).toBeGreaterThanOrEqual(4)
    expect(texts.some((text) => /ritual/i.test(text))).toBe(true)
    expect(texts.some((text) => /mentally control/i.test(text))).toBe(true)
    expect(texts.some((text) => /restore hit points/i.test(text))).toBe(true)
  })

  it("marks companion, ritual, and leftover claims separately", () => {
    const claims = assignFeatureClaims({
      name: "Thralls",
      level: 2,
      description:
        "Flavor about lifeless servants. You can animate Undead companions. You do this by performing a ritual over 10 minutes. You can mentally control those companions without an action. You can spend pool points to restore hit points to a companion.",
      linkedModifiers: [
        {
          instanceId: "modinst_thralls_grant",
          catalogRefId: "cat_char_grant_creature",
          characteristics: [
            {
              id: "thralls_grant",
              type: "grant_creature",
              creatureNames: ["Skeleton"],
            },
          ],
        },
      ],
      sheetDisplay: { restDialogues: true },
      importModifierMeta: [
        {
          instanceId: "modinst_thralls_grant",
          ruleId: "ai.grant_creature",
          confidence: "high",
          matchedPhrase: "You can animate Undead companions",
          source: "ai",
        },
      ],
    })

    expect(claims.some((claim) => claim.status === "narrative")).toBe(true)
    const wired = claims.filter((claim) => claim.status === "wired")
    expect(wired.length).toBeGreaterThanOrEqual(2)
    expect(wired.some((claim) => claim.modifierId === "modinst_thralls_grant")).toBe(true)
    expect(claims.some((claim) => claim.status === "unresolved" && /restore hit points/i.test(claim.text))).toBe(
      true,
    )
  })
})

describe("Necromancer claim coverage", () => {
  it("reports the fixture class by level instead of one bit per feature", () => {
    const enriched = enrichImportContentModifiers(
      parseImportContentJson(readFileSync(FIXTURE_PATH, "utf8"))!,
    )
    const thralls = enriched.classes?.[0]?.features?.find((feature) => feature.name === "Thralls") as
      | Feature
      | undefined
    expect(thralls?.claims?.length).toBeGreaterThan(1)

    const reports = collectClassClaimCoverage(enriched)
    const necromancer = reports.find((report) => report.className === "Necromancer")
    expect(necromancer).toBeTruthy()
    expect(necromancer!.totals.total).toBeGreaterThan(necromancer!.features.length)
    expect(necromancer!.byLevel.some((row) => row.level === 2)).toBe(true)

    const printed = formatClassClaimCoverageReport(reports)
    expect(printed).toMatch(/Thralls: \d+ claims, \d+ wired/)
  })

  it("keeps claims when persisting an imported feature", () => {
    const enriched = enrichImportContentModifiers(
      parseImportContentJson(readFileSync(FIXTURE_PATH, "utf8"))!,
    )
    const sanitized = sanitizeImportContentForPersist(enriched)
    const thralls = sanitized.classes?.[0]?.features?.find((feature) => feature.name === "Thralls") as
      | (Feature & { mechanics?: unknown })
      | undefined
    expect(thralls?.claims?.length).toBeGreaterThan(1)
    expect(thralls?.mechanics).toBeUndefined()
  })
})

describe.skipIf(!DRIVE_PATH)("Necromancer Drive pack claim coverage", () => {
  it("keeps Thralls as several claims instead of one imported bit", () => {
    const enriched = enrichImportContentModifiers(
      applyClassSpellListsToImport(parseImportContentJson(readFileSync(DRIVE_PATH!, "utf8"))!),
    )
    const thralls = enriched.classes?.[0]?.features?.find((feature) => feature.name === "Thralls") as
      | Feature
      | undefined
    expect(thralls?.claims?.length).toBeGreaterThanOrEqual(4)
    expect(thralls?.claims?.filter((claim) => claim.status === "wired").length).toBeGreaterThanOrEqual(1)
    expect(thralls?.claims?.some((claim) => claim.status === "unresolved")).toBe(true)
  })
})
