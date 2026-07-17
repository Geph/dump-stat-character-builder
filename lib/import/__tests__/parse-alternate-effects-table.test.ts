import { describe, expect, it } from "vitest"
import {
  alternateEffectsSpellsKnownModifier,
  parseAlternateEffectsSpellNames,
} from "@/lib/import/parse-alternate-effects-table"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"

describe("parseAlternateEffectsSpellNames", () => {
  it("extracts spell names from a Kibbles Alternate Effects HTML table", () => {
    const html = `<p><strong>Alternate Effects.</strong> When you learn this discipline, you can use your Psionics feature to cast the following spells.</p><table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>heroism, longstrider, unlocked potential</td></tr><tr><td>2</td><td>alter self, enlarge/reduce, lesser restoration</td></tr><tr><td>3</td><td>haste, protection from energy</td></tr></tbody></table>`
    expect(parseAlternateEffectsSpellNames(html)).toEqual([
      "heroism",
      "longstrider",
      "unlocked potential",
      "alter self",
      "enlarge/reduce",
      "lesser restoration",
      "haste",
      "protection from energy",
    ])
  })

  it("ignores non-Alternate-Effects tables", () => {
    const html = `<table><tr><td>Level</td><td>Features</td></tr><tr><td>1</td><td>Psionics</td></tr></table>`
    expect(parseAlternateEffectsSpellNames(html)).toEqual([])
  })

  it("builds a spells_known modifier labeled as Alternate Effects", () => {
    const mod = alternateEffectsSpellsKnownModifier(["heroism", "haste"], "test_enhancement")
    expect(mod?.catalogRefId).toBe("cat_char_spells_known")
    const char = mod?.characteristics?.[0]
    expect(char?.type).toBe("spells_known")
    if (char?.type === "spells_known") {
      expect(char.spells).toHaveLength(2)
      expect(char.label).toContain("Alternate Effects")
    }
  })
})

describe("grant.creature.mephit_choice", () => {
  it("wires Ice / Magma / Dust Mephit as a grant_creature choice", () => {
    const text =
      "While in an elemental emotion, you can expend 2 psi points as a bonus action to manifest it as a mephit: an ice mephit for cold, magma mephit for fire, or dust mephit for lightning."
    const detections = detectFeatureModifiers(text, {
      contentKind: "ability",
      featureName: "Manifested Emotions",
      sourceName: "Psion",
    })
    const mephit = detections.find((d) => d.ruleId === "grant.creature.mephit_choice")
    expect(mephit).toBeDefined()
    const char = mephit?.instance.characteristics?.[0]
    expect(char?.type).toBe("grant_creature")
    if (char?.type === "grant_creature") {
      expect(char.choiceOptions).toEqual(["Ice Mephit", "Magma Mephit", "Dust Mephit"])
      expect(char.count).toBe(1)
    }
  })
})
