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
})

describe("resolveSpellNamesToIds", () => {
  it("resolves known spells and lists missing names", () => {
    const names = ["Command", "Detect Thoughts", "Synaptic Static"]
    const { resolved, missing } = resolveSpellNamesToIds(names, SAMPLE_CATALOG)

    expect(resolved.map((entry) => entry.name)).toEqual(["Command", "Detect Thoughts"])
    expect(missing).toEqual(["Synaptic Static"])
  })
})
