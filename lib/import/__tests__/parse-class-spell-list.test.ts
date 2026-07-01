import { describe, expect, it } from "vitest"
import { extractSpellListImportDeterministic } from "@/lib/import/extract-spell-list-import"
import { preprocessImportText } from "@/lib/import/preprocess-import-text"
import {
  parseClassSpellListDocument,
  parseStructuredSpellListBlock,
} from "@/lib/import/parse-class-spell-list"

const ARTIFICER_SPELL_LIST = `Artificer Spell List

This section presents the Artificer spell list. The spells are organized by spell level and then alphabetized, and each spell's school of magic is listed. In the Special column, C means the spell requires Concentration, R means it's a Ritual, and M means it requires a specific Material component.
Cantrips (Level 0 Artificer Spells)
Spell 	School 	Special
Acid Splash 	Evocation 	—
Dancing Lights 	Illusion 	C
Fire Bolt 	Evocation 	—
Guidance 	Divination 	C
Level 1 Artificer Spells
Spell 	School 	Special
Alarm 	Abjuration 	R
Cure Wounds 	Abjuration 	—
Detect Magic 	Divination 	C, R
Identify 	Divination 	R, M
Level 2 Artificer Spells
Spell 	School 	Special
Blur 	Illusion 	C
Homunculus Servant* 	Conjuration 	R, M
Invisibility 	Illusion 	C
*Appears in this chapter.
Level 3 Artificer Spells
Spell 	School 	Special
Fly 	Transmutation 	C
Revivify 	Necromancy 	M
`

describe("parseClassSpellListDocument", () => {
  it("parses PHB-style spell / school / special tables", () => {
    const document = parseClassSpellListDocument(ARTIFICER_SPELL_LIST)
    expect(document).not.toBeNull()
    expect(document?.className).toBe("Artificer")
    expect(document?.entries.length).toBeGreaterThanOrEqual(12)

    const acidSplash = document?.entries.find((entry) => entry.name === "Acid Splash")
    expect(acidSplash).toMatchObject({ level: 0, school: "Evocation", concentration: false })

    const dancingLights = document?.entries.find((entry) => entry.name === "Dancing Lights")
    expect(dancingLights?.concentration).toBe(true)

    const detectMagic = document?.entries.find((entry) => entry.name === "Detect Magic")
    expect(detectMagic).toMatchObject({ level: 1, concentration: true, ritual: true })

    const identify = document?.entries.find((entry) => entry.name === "Identify")
    expect(identify?.materialComponent).toBe(true)

    const homunculus = document?.entries.find((entry) => entry.name === "Homunculus Servant")
    expect(homunculus?.name).toBe("Homunculus Servant")
    expect(homunculus?.level).toBe(2)
  })

  it("parses structured block without main heading", () => {
    const block = `Cantrips (Level 0 Artificer Spells)
Spell 	School 	Special
True Strike 	Divination 	M
Level 1 Artificer Spells
Spell 	School 	Special
Grease 	Conjuration 	—`

    const parsed = parseStructuredSpellListBlock(block, "Artificer")
    expect(parsed.entries).toHaveLength(2)
    expect(parsed.entries[1]).toMatchObject({ name: "Grease", level: 1, school: "Conjuration" })
  })
})

describe("spell list import pipeline", () => {
  it("preprocesses spell_lists hint into classes and spells", () => {
    const result = preprocessImportText(ARTIFICER_SPELL_LIST, { contentTypeHint: "spell_lists" })

    expect(result.stats.detectedClassName).toBe("Artificer")
    expect(result.stats.subtractedRegions.some((region) => region.kind === "spell_list")).toBe(true)
    expect(result.deterministic.classes?.[0]?.name).toBe("Artificer")
    expect(result.deterministic.classes?.[0]?.spell_list?.length).toBeGreaterThanOrEqual(12)
    expect(result.deterministic.spells?.length).toBeGreaterThanOrEqual(12)
    expect(result.deterministic.spells?.some((spell) => spell.name === "Detect Magic")).toBe(true)
    expect(
      result.deterministic.spells?.find((spell) => spell.name === "Identify")?.components,
    ).toEqual(["M"])
  })

  it("extracts deterministically with high confidence", () => {
    const result = extractSpellListImportDeterministic(ARTIFICER_SPELL_LIST)
    expect(result.className).toBe("Artificer")
    expect(result.confidence.level).toBe("high")
    expect(result.content.spells?.length).toBeGreaterThanOrEqual(12)
    expect(result.content.spells?.some((spell) => spell.classes?.includes("Artificer"))).toBe(true)
    expect(result.content.spells?.map((spell) => spell.name)).toEqual(
      expect.arrayContaining(["Acid Splash", "Revivify"]),
    )
  })
})
