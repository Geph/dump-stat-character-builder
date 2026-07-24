import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  collectImportModifierReview,
  collectUnmatchedModifierFeatures,
} from "@/lib/import/import-modifier-previews"
import { collectBackgroundFeatGrantGaps } from "@/lib/import/collect-missing-background-feat-grants"
import { getBackgroundFeatPickSlots } from "@/lib/builder/background-feat-options"
import { buildDefaultModifierCatalog } from "@/lib/compendium/modifier-catalog"
import type { Background } from "@/lib/types"

const BG_PATH =
  "/Users/geph/Library/CloudStorage/GoogleDrive-thejeffginger@gmail.com/My Drive/Code Projects/dump stat working files/import-json/wotc-backgrounds"
const FEATS_PATH =
  "/Users/geph/Library/CloudStorage/GoogleDrive-thejeffginger@gmail.com/My Drive/Code Projects/dump stat working files/import-json/wotc-feats"

function loadDriveJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"))
}

describe("wotc-backgrounds + wotc-feats Drive wiring", () => {
  it("wires Planar Infusion / Conviction via feat_granted (Scion loaded with batch)", () => {
    const backgrounds = (loadDriveJson(BG_PATH) as { backgrounds: unknown[] }).backgrounds
    const feats = (loadDriveJson(FEATS_PATH) as { feats: unknown[] }).feats
    const content = enrichImportContentModifiers({
      backgrounds: backgrounds as never,
      feats: feats as never,
    })

    expect(collectBackgroundFeatGrantGaps(content)).toEqual([])

    const review = collectImportModifierReview(content)
    const planar = review.find(
      (row) => row.sourceLabel === "Background: Gate Warden" && row.featureName === "Planar Infusion",
    )
    const conviction = review.find(
      (row) =>
        row.sourceLabel === "Background: Planar Philosopher" && row.featureName === "Conviction",
    )
    expect(planar?.status).toBe("wired")
    expect(planar?.modifiers.some((m) => /Scion of the Outer Planes/i.test(m.summary))).toBe(true)
    expect(conviction?.status).toBe("wired")
    expect(conviction?.modifiers.some((m) => /Scion of the Outer Planes/i.test(m.summary))).toBe(
      true,
    )

    const gate = content.backgrounds?.find((b) => b.name === "Gate Warden")
    expect(gate?.feat_granted).toBe("Scion of the Outer Planes")

    const unmatchedBg = collectUnmatchedModifierFeatures(content).filter((e) =>
      e.sourceLabel.startsWith("Background:"),
    )
    expect(unmatchedBg.map((e) => `${e.sourceLabel}::${e.featureName}`)).toEqual([])
  })

  it("wires all Drive feats after enrichment; Planescape follow-ups keep real benefits", () => {
    const feats = (loadDriveJson(FEATS_PATH) as { feats: unknown[] }).feats
    const content = enrichImportContentModifiers({ feats: feats as never })
    const review = collectImportModifierReview(content).filter((r) =>
      r.sourceLabel.startsWith("Feat:"),
    )
    const unwired = review.filter((r) => r.status === "unwired").map((r) => r.featureName)
    expect(unwired).toEqual([])

    const cohort = content.feats?.find((f) => f.name === "Cohort of Chaos") as
      | { linkedModifiers?: { characteristics?: { type: string }[] }[] }
      | undefined
    const cohortChars = (cohort?.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? [])
    expect(cohortChars.some((c) => c.type === "uses")).toBe(true)

    const wanderer = content.feats?.find((f) => f.name === "Planar Wanderer") as
      | { linkedModifiers?: { activation?: { action?: boolean } }[] }
      | undefined
    expect((wanderer?.linkedModifiers ?? []).some((m) => m.activation?.action)).toBe(true)
  })

  it("wires Ravenloft Dark Gift choice backgrounds into feat pick slots", () => {
    const backgrounds = (loadDriveJson(BG_PATH) as { backgrounds: unknown[] }).backgrounds
    const content = enrichImportContentModifiers({ backgrounds: backgrounds as never })
    const catalog = buildDefaultModifierCatalog()
    const haunted = content.backgrounds?.find((b) => b.name === "Haunted One")
    const mist = content.backgrounds?.find((b) => b.name === "Mist Wanderer")
    expect(haunted?.feat_granted).toBeNull()
    expect(mist?.feat_granted).toBeNull()
    const hauntedSlots = getBackgroundFeatPickSlots(haunted as unknown as Background, catalog)
    const mistSlots = getBackgroundFeatPickSlots(mist as unknown as Background, catalog)
    expect(hauntedSlots[0]?.featCategories).toEqual(["Dark Gift"])
    expect(hauntedSlots[0]?.alsoFeatNames).toEqual(["Survivor"])
    expect(mistSlots[0]?.featCategories).toEqual(["Dark Gift"])
  })
})
