import { describe, expect, it } from "vitest"
import {
  getCompendiumDetailFlavor,
  isClassSelectionBoilerplate,
  stripClassSelectionBoilerplate,
} from "@/lib/compendium/class-detail-flavor"
import { SRD_CLASS_DESCRIPTIONS, SRD_SUBCLASS_DESCRIPTIONS } from "@/lib/compendium/srd-flavor-descriptions"
import { MHP_CLASS_PRESENTATION } from "@/lib/seed-packs/mage-hand-press/class-presentation"

describe("class detail flavor", () => {
  it("strips Becoming checklists and leaves nothing to show", () => {
    const html =
      "<p><strong>Becoming an Alchemist</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all the traits.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the Hit Point Die.</li></ul>"
    expect(stripClassSelectionBoilerplate(html)).toBe("")
    expect(isClassSelectionBoilerplate(html)).toBe(true)
  })

  it("uses curated Alchemist flavor when the seed still has a Becoming block", () => {
    expect(
      getCompendiumDetailFlavor(
        { name: "Alchemist", description: MHP_CLASS_PRESENTATION.Alchemist.description },
        "class",
      ),
    ).toContain("lab bench")
    expect(
      getCompendiumDetailFlavor(
        {
          name: "Alchemist",
          description:
            "<p><strong>Becoming an Alchemist</strong></p><p><em>As a Level 1 Character</em></p><ul><li>Gain all the traits.</li></ul><p><em>As a Multiclass Character</em></p><ul><li>Gain the Hit Point Die.</li></ul>",
        },
        "class",
      ),
    ).toBe(MHP_CLASS_PRESENTATION.Alchemist.description)
  })

  it("uses PHB-based summaries for SRD classes and subclasses", () => {
    expect(getCompendiumDetailFlavor({ name: "Barbarian", description: "**Core Barbarian Traits**" }, "class")).toBe(
      SRD_CLASS_DESCRIPTIONS.Barbarian,
    )
    expect(
      getCompendiumDetailFlavor(
        { name: "Path of the Berserker", class_name: "Barbarian", description: null },
        "subclass",
      ),
    ).toBe(SRD_SUBCLASS_DESCRIPTIONS["Path of the Berserker"])
  })

  it("keeps a real imported flavor description instead of the curated fallback", () => {
    const custom = "You play this homebrew like a glass cannon who never stops running."
    expect(getCompendiumDetailFlavor({ name: "Alchemist", description: custom }, "class")).toBe(custom)
  })
})
