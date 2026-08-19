import { describe, expect, it } from "vitest"
import {
  isBundledCardSourceOrigin,
  isBundledPublicCardArtPath,
} from "../../../scripts/bundled-card-art.mjs"

describe("bundled card art allowlist", () => {
  it("allows SRD, Kibbles, and Mage Hand Press origin folders", () => {
    expect(isBundledCardSourceOrigin("SRD")).toBe(true)
    expect(isBundledCardSourceOrigin("srd cantrips")).toBe(true)
    expect(isBundledCardSourceOrigin("kibbles")).toBe(true)
    expect(isBundledCardSourceOrigin("magehandpress")).toBe(true)
    expect(isBundledCardSourceOrigin("mage-hand-press")).toBe(true)
    expect(isBundledCardSourceOrigin("PHB")).toBe(false)
    expect(isBundledCardSourceOrigin("eberron")).toBe(false)
    expect(isBundledCardSourceOrigin("ravenloft")).toBe(false)
  })

  it("ships SRD / Kibbles public outputs and keeps setting-book art local-only", () => {
    expect(isBundledPublicCardArtPath("public/images/compendium/subclasses/cleric/life-domain.png")).toBe(
      true,
    )
    expect(isBundledPublicCardArtPath("public/images/compendium/subclasses/inventor/cursesmith.png")).toBe(
      true,
    )
    expect(isBundledPublicCardArtPath("public/images/compendium/classes/wizard.png")).toBe(true)
    expect(isBundledPublicCardArtPath("public/images/compendium/spells/fire-bolt.png")).toBe(true)
    expect(isBundledPublicCardArtPath("public/images/compendium/subclasses/bard/college-of-dance.png")).toBe(
      false,
    )
    expect(isBundledPublicCardArtPath("public/images/compendium/classes/artificer.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/species/warforged.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/backgrounds/noble.png")).toBe(false)
  })
})
