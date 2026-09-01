import { describe, expect, it } from "vitest"
import {
  isBundledCardSourceOrigin,
  isBundledPublicCardArtPath,
} from "../../../scripts/bundled-card-art.mjs"

describe("bundled card art allowlist", () => {
  it("allows SRD origin folders only, not Mage Hand Press, Kibbles, or setting books", () => {
    expect(isBundledCardSourceOrigin("SRD")).toBe(true)
    expect(isBundledCardSourceOrigin("srd cantrips")).toBe(true)
    expect(isBundledCardSourceOrigin("kibbles")).toBe(false)
    expect(isBundledCardSourceOrigin("magehandpress")).toBe(false)
    expect(isBundledCardSourceOrigin("mage-hand-press")).toBe(false)
    expect(isBundledCardSourceOrigin("mhp")).toBe(false)
    expect(isBundledCardSourceOrigin("PHB")).toBe(false)
    expect(isBundledCardSourceOrigin("eberron")).toBe(false)
    expect(isBundledCardSourceOrigin("ravenloft")).toBe(false)
  })

  it("ships SRD public outputs and keeps Kibbles / setting-book art local-only", () => {
    expect(isBundledPublicCardArtPath("public/images/compendium/subclasses/cleric/life-domain.png")).toBe(
      true,
    )
    expect(isBundledPublicCardArtPath("public/images/compendium/subclasses/inventor/cursesmith.png")).toBe(
      false,
    )
    expect(isBundledPublicCardArtPath("public/images/compendium/classes/wizard.png")).toBe(true)
    expect(isBundledPublicCardArtPath("public/images/compendium/classes/inventor.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/spells/fire-bolt.png")).toBe(true)
    expect(isBundledPublicCardArtPath("public/images/compendium/spells/aether-lance.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/subclasses/bard/college-of-dance.png")).toBe(
      false,
    )
    expect(isBundledPublicCardArtPath("public/images/compendium/classes/artificer.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/species/warforged.png")).toBe(true)
    expect(isBundledPublicCardArtPath("public/images/compendium/species/aasimar-eberron.png")).toBe(true)
    expect(isBundledPublicCardArtPath("public/images/compendium/species/augmented.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/species/minotaur.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/classes/gunslinger.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/backgrounds/noble.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/backgrounds/apothecary.png")).toBe(false)
    expect(isBundledPublicCardArtPath("public/images/compendium/backgrounds/acolyte.png")).toBe(true)
    expect(
      isBundledPublicCardArtPath("public/images/compendium/subclasses/alchemist/ooze-rancher.png"),
    ).toBe(false)
    expect(
      isBundledPublicCardArtPath("public/images/compendium/subclasses/alchemist/amorist.png"),
    ).toBe(false)
  })
})
