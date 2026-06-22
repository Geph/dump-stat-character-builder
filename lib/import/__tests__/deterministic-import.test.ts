import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { extractImportContentDeterministic } from "@/lib/import/extract-import-content-deterministic"
import { collectImportModifierPreviews } from "@/lib/import/import-modifier-previews"
import { parseClassShellFromText } from "@/lib/import/parse-class-shell"
import { parseProgressionTableFeatures } from "@/lib/import/parse-class-progression-table"
import {
  countMatchedTableFeatures,
  segmentClassFeaturesFromText,
} from "@/lib/import/segment-class-features"

const SAMPLE_SHELL = `Class Features
Hit Dice: 1d10 per Fighter level
Saving Throws: Strength, Constitution
Armor: All armor, shields
Weapons: Simple weapons, martial weapons
Skills: Choose two: Acrobatics, Athletics, Perception, and Stealth
`

describe("parseClassShellFromText", () => {
  it("parses hit die, saves, and proficiencies", () => {
    const shell = parseClassShellFromText(SAMPLE_SHELL, "Fighter")
    expect(shell.hit_die).toBe(10)
    expect(shell.saving_throws).toEqual(["Strength", "Constitution"])
    expect(shell.armor_proficiencies).toContain("All armor")
    expect(shell.weapon_proficiencies?.[0]).toMatch(/Simple weapons/i)
    expect(shell.skill_choices).toEqual({
      count: 2,
      options: expect.arrayContaining(["Acrobatics", "Athletics"]),
    })
  })
})

describe("parseProgressionTableFeatures", () => {
  it("reads feature names from HTML progression tables", () => {
    const text = `<table>
<tr><th>Level</th><th>Proficiency Bonus</th><th>Features</th></tr>
<tr><td>1st</td><td>+2</td><td>Fighting Style, Second Wind</td></tr>
<tr><td>5th</td><td>+3</td><td>Extra Attack</td></tr>
</table>`

    expect(parseProgressionTableFeatures(text)).toEqual([
      { level: 1, name: "Fighting Style" },
      { level: 1, name: "Second Wind" },
      { level: 5, name: "Extra Attack" },
    ])
  })
})

describe("segmentClassFeaturesFromText", () => {
  it("segments duplicated PDF feature headings into descriptions", () => {
    const text = `Fighting Style\tFighting Style
At 1st level, you learn one Fighting Style of your choice from the list at the end of this class description.

Second Wind\tSecond Wind
You can fight on where lesser warriors would fail. Also at 1st level, you can use your bonus action to regain hit points equal to 1d10 + your Fighter level.
`

    const tableFeatures = [
      { level: 1, name: "Fighting Style" },
      { level: 1, name: "Second Wind" },
    ]
    const segmented = segmentClassFeaturesFromText(text, tableFeatures)

    expect(segmented).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Fighting Style", level: 1 }),
        expect.objectContaining({ name: "Second Wind", level: 1 }),
      ]),
    )
    expect(countMatchedTableFeatures(tableFeatures, segmented)).toBe(2)
  })
})

describe("extractImportContentDeterministic", () => {
  const fixturePath = resolve(process.cwd(), "agent-tools-alt-fighter.txt")

  it.runIf(existsSync(fixturePath))(
    "reaches high confidence on Alternate Fighter sample",
    () => {
      const text = readFileSync(fixturePath, "utf8")
      const result = extractImportContentDeterministic(text, { contentTypeHint: "classes" })

      expect(result.className).toBe("Alternate Fighter")
      expect(result.confidence.level).toBe("high")
      expect(result.confidence.matchRatio).toBeGreaterThanOrEqual(0.8)
      expect(result.content.classes?.[0]?.hit_die).toBe(10)
      expect(result.content.classes?.[0]?.features?.length ?? 0).toBeGreaterThanOrEqual(8)
      expect(result.confidence.tableFeatureCount).toBeGreaterThanOrEqual(5)
    },
  )

  it.runIf(existsSync(fixturePath))(
    "wires modifiers on deterministic Alternate Fighter features",
    () => {
      const text = readFileSync(fixturePath, "utf8")
      const result = extractImportContentDeterministic(text, { contentTypeHint: "classes" })
      const previews = collectImportModifierPreviews(result.content)

      expect(previews.some((entry) => entry.summary.includes("attack"))).toBe(true)
      expect(previews.some((entry) => entry.summary.includes("ac"))).toBe(true)
    },
  )
})
