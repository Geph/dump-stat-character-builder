import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  detectClassNameFromImportText,
  preprocessImportText,
} from "@/lib/import/preprocess-import-text"

const ALT_FIGHTER_TABLE = `Alternate Fighter\tAlternate Fighter

<table>
<tr><th>Level</th><th>Proficiency Bonus</th><th>Fighting Styles</th><th>Exploits Known</th><th>Exploit Die</th><th>Exploit Dice</th><th>Features</th></tr>
<tr><td>1st</td><td>+2</td><td>1</td><td>—</td><td>—</td><td>—</td><td>Fighting Style</td></tr>
<tr><td>2nd</td><td>+2</td><td>1</td><td>2</td><td>d6</td><td>2</td><td>Martial Exploits</td></tr>
<tr><td>3rd</td><td>+2</td><td>1</td><td>3</td><td>d6</td><td>2</td><td>Eye for Talent</td></tr>
<tr><td>4th</td><td>+2</td><td>1</td><td>3</td><td>d6</td><td>3</td><td>ASI</td></tr>
<tr><td>5th</td><td>+3</td><td>1</td><td>4</td><td>d8</td><td>3</td><td>Extra Attack</td></tr>
</table>

Class Features
Hit Dice: 1d10 per Fighter level

Arcane Knight Spell List
Cantrips (0-Level)
blade ward
booming blade
1st-Level
absorb elements
magic missile
`

const PLAIN_PSI_TABLE = `The Psion\tThe Psion
Psion Level Table
1st \t+2 \t1 \t1 \tPsionic Archetype
2nd \t+2 \t2 \t1 \tPsionic Talents
3rd \t+2 \t3 \t2 \tSecondary Discipline
4th \t+2 \t4 \t2 \tAbility Score Improvement
5th \t+3 \t5 \t3 \tPsionic Mastery
`

describe("preprocessImportText", () => {
  it("detects class name from repeated PDF title tabs", () => {
    expect(detectClassNameFromImportText("Alternate Fighter\tAlternate Fighter\n")).toBe(
      "Alternate Fighter",
    )
  })

  it("strips HTML progression tables and builds class resources", () => {
    const result = preprocessImportText(ALT_FIGHTER_TABLE, { contentTypeHint: "classes" })

    expect(result.stats.detectedClassName).toBe("Alternate Fighter")
    expect(result.stats.inputCharsAfter).toBeLessThan(result.stats.inputCharsBefore)
    expect(result.stats.estimatedTokensSaved).toBeGreaterThan(0)
    expect(
      result.stats.subtractedRegions.some((region) => region.kind === "progression_table"),
    ).toBe(true)
    expect(result.aiText).toContain("[Class progression table parsed separately")
    expect(result.aiText).not.toContain("<table>")

    const resourceKeys = (result.deterministic.class_resources ?? []).map((row) => row.resource_key)
    expect(resourceKeys.length).toBeGreaterThan(0)
    expect(resourceKeys).toContain("exploit_dice")
    expect(resourceKeys).toContain("exploit_die_size")
  })

  it("strips plain-text progression table runs", () => {
    const result = preprocessImportText(PLAIN_PSI_TABLE, { contentTypeHint: "classes" })

    expect(
      result.stats.subtractedRegions.some((region) => region.kind === "progression_table"),
    ).toBe(true)
    expect(result.aiText).not.toMatch(/1st\s+\+2/)
    expect((result.deterministic.class_resources ?? []).map((row) => row.resource_key)).toContain(
      "psi_points",
    )
  })

  it("parses spell list regions and stubs class spell_list", () => {
    const result = preprocessImportText(ALT_FIGHTER_TABLE, { contentTypeHint: "classes" })

    expect(
      result.stats.subtractedRegions.some((region) => region.kind === "spell_list"),
    ).toBe(true)
    expect(result.aiText).toContain("[Spell list parsed separately")
    expect(result.deterministic.classes?.[0]?.name).toBe("Alternate Fighter")
    expect(result.deterministic.classes?.[0]?.spell_list).toEqual(
      expect.arrayContaining(["blade ward", "magic missile"]),
    )
  })

  it("skips class subtraction when content hint excludes classes", () => {
    const result = preprocessImportText(ALT_FIGHTER_TABLE, { contentTypeHint: "spells" })

    expect(result.stats.subtractedRegions.some((region) => region.kind === "progression_table")).toBe(
      false,
    )
    expect(result.deterministic.class_resources ?? []).toHaveLength(0)
  })
})

describe("preprocessImportText — Alternate Fighter fixture", () => {
  const fixturePath = resolve(process.cwd(), "agent-tools-alt-fighter.txt")

  it.runIf(existsSync(fixturePath))("reduces full sample text before AI", () => {
    const text = readFileSync(fixturePath, "utf8")
    const result = preprocessImportText(text, { contentTypeHint: "classes" })

    expect(result.stats.detectedClassName).toBe("Alternate Fighter")
    expect(result.stats.savedPercent).toBeGreaterThan(0)
    expect(result.stats.subtractedRegions.length).toBeGreaterThan(0)
    expect(result.aiText.length).toBeLessThan(text.length)
  })
})
