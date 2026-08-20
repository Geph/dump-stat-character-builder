import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { getCompendiumCardBlurb } from "@/lib/compendium/card-image"
import { KIBBLES_CLASS_CARD_BLURBS } from "@/lib/seed-packs/kibbles-tasty/class-card-blurbs"
import srdClasses from "@/lib/srd/seed-data/classes.json"
import srdSubclasses from "@/lib/srd/seed-data/subclasses.json"

type BlurbRow = { name: string; card_blurb?: string | null }

function rowsInPackFolder(folder: string): BlurbRow[] {
  const root = join(process.cwd(), "lib", "seed-packs", folder)
  return readdirSync(root)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => {
      const content = JSON.parse(readFileSync(join(root, file), "utf8")) as {
        classes?: BlurbRow[]
        subclasses?: BlurbRow[]
      }
      return [...(content.classes ?? []), ...(content.subclasses ?? [])]
    })
}

function expectValidBlurbs(rows: BlurbRow[]) {
  for (const row of rows) {
    const blurb = row.card_blurb?.trim() ?? ""
    expect(blurb.length, `${row.name} card_blurb`).toBeGreaterThan(0)
    expect(blurb.length, `${row.name} card_blurb`).toBeLessThanOrEqual(120)
    expect(blurb, `${row.name} card_blurb`).toMatch(/[.!?]["']?$/)
    expect(blurb, `${row.name} card_blurb`).not.toContain("…")
  }
}

describe("class and subclass card blurbs", () => {
  it("covers every bundled SRD class and subclass", () => {
    expectValidBlurbs([...(srdClasses as BlurbRow[]), ...(srdSubclasses as BlurbRow[])])
  })

  it("covers every Kibbles and Mage Hand Press class and subclass", () => {
    expectValidBlurbs([
      ...rowsInPackFolder("kibbles-tasty"),
      ...rowsInPackFolder("mage-hand-press"),
    ])
  })

  it("uses play-style defaults for Kibbles classes before they are re-imported", () => {
    for (const name of ["Inventor", "Occultist", "Psion", "Warden (Kibbles Tasty)"]) {
      expect(
        getCompendiumCardBlurb({
          name,
          description: "A long source description that should not be used for this fallback.",
        }),
      ).toBe(KIBBLES_CLASS_CARD_BLURBS[name])
    }
  })
})
