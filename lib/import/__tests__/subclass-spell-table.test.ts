import { describe, expect, it } from "vitest"
import {
  isSubclassSpellTableFeature,
  parseSubclassSpellTable,
  resolveSpellNamesToIds,
} from "@/lib/import/subclass-spell-table"

const SAMPLE_CATALOG = [
  { id: "spell-command", name: "Command" },
  { id: "spell-detect-thoughts", name: "Detect Thoughts" },
  { id: "spell-mind-spike", name: "Mind Spike" },
  { id: "spell-clairvoyance", name: "Clairvoyance" },
  { id: "spell-fear", name: "Fear" },
]

describe("parseSubclassSpellTable", () => {
  it("parses plain-text tab-separated domain spell tables", () => {
    const description = `Mind Domain Spells
Cleric Level 	Prepared Spells
3 	Command, Detect Thoughts, Dissonant Whispers, Mind Spike
5 	Clairvoyance, Fear
7 	Confusion, Phantasmal Killer
9 	Synaptic Static, Telekinesis`

    expect(isSubclassSpellTableFeature("Mind Domain Spells", description)).toBe(true)

    const parsed = parseSubclassSpellTable(description)
    expect(parsed).not.toBeNull()
    expect(parsed!.rows).toHaveLength(4)
    expect(parsed!.rows[0]).toEqual({
      unlocksAtClassLevel: 3,
      spellNames: ["Command", "Detect Thoughts", "Dissonant Whispers", "Mind Spike"],
    })
    expect(parsed!.allSpellNames).toContain("Synaptic Static")
  })

  it("parses HTML spell tables", () => {
    const description = `<p>Always prepared:</p>
<table>
<tbody>
<tr><th>Cleric Level</th><th>Prepared Spells</th></tr>
<tr><td>3</td><td>Command, Detect Thoughts, Mind Spike</td></tr>
<tr><td>5</td><td>Clairvoyance, Fear</td></tr>
</tbody>
</table>`

    const parsed = parseSubclassSpellTable(description)
    expect(parsed?.rows).toEqual([
      { unlocksAtClassLevel: 3, spellNames: ["Command", "Detect Thoughts", "Mind Spike"] },
      { unlocksAtClassLevel: 5, spellNames: ["Clairvoyance", "Fear"] },
    ])
  })

  it("parses prose At Nth level spell lists", () => {
    const description =
      "At 3rd: Enlarge/Reduce, Thaumaturgy. At 5th: Thunderwave. At 7th: Fear. At 9th: Fire Shield."

    expect(isSubclassSpellTableFeature("Circle of the Titan Spells", description)).toBe(true)
    const parsed = parseSubclassSpellTable(description)
    expect(parsed?.rows.map((row) => row.unlocksAtClassLevel)).toEqual([3, 5, 7, 9])
  })

  it("parses squished tables that lost all whitespace during PDF extraction", () => {
    // Real-world shape: "Cleric LevelPrepared Spells3Aid, Bless...5Mass Healing Word..." — no
    // separator at all between the level digit and the first spell name in each row.
    const description =
      "Your connection to this divine domain ensures you always have certain spells ready. " +
      "When you reach a Cleric level specified in the Life Domain Spells table, you thereafter " +
      "always have the listed spells prepared.Cleric LevelPrepared Spells3Aid, Bless, Cure Wounds, " +
      "Lesser Restoration5Mass Healing Word, Revivify7Aura of Life, Death Ward9Greater Restoration, Mass Cure Wounds"

    expect(isSubclassSpellTableFeature("Life Domain Spells", description)).toBe(true)
    const parsed = parseSubclassSpellTable(description)
    expect(parsed).not.toBeNull()
    expect(parsed!.rows).toEqual([
      { unlocksAtClassLevel: 3, spellNames: ["Aid", "Bless", "Cure Wounds", "Lesser Restoration"] },
      { unlocksAtClassLevel: 5, spellNames: ["Mass Healing Word", "Revivify"] },
      { unlocksAtClassLevel: 7, spellNames: ["Aura of Life", "Death Ward"] },
      { unlocksAtClassLevel: 9, spellNames: ["Greater Restoration", "Mass Cure Wounds"] },
    ])
  })

  it("does not false-positive squished-table parsing on ordinary prose digits", () => {
    // "30-foot", "2d10", "Cleric level" (unqualified) should never look like a table row —
    // none of them are a <=2 digit run immediately followed by an uppercase letter.
    const description =
      "As a Magic action, you emit a flash of light in a 30-foot Emanation. Each creature must " +
      "make a Constitution saving throw, taking Radiant damage equal to 2d10 plus your Cleric level " +
      "on a failed save or half as much damage on a successful one."

    expect(parseSubclassSpellTable(description)).toBeNull()
  })
})

describe("resolveSpellNamesToIds", () => {
  it("resolves known spells and lists missing names", () => {
    const names = ["Command", "Detect Thoughts", "Synaptic Static"]
    const { resolved, missing } = resolveSpellNamesToIds(names, SAMPLE_CATALOG)

    expect(resolved.map((entry) => entry.name)).toEqual(["Command", "Detect Thoughts"])
    expect(missing).toEqual(["Synaptic Static"])
  })
})
