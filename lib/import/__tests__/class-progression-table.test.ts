import { describe, expect, it } from "vitest"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { detectPsiPointCost, detectExploitDieCost } from "@/lib/import/enrich-import-classes"

describe("parseClassProgressionTable", () => {
  it("parses Psion level table with Psi Points and Psi Limit columns", () => {
    const text = `1st 	+2 	1 	1 	Psionic Archetype, Psionics 	—
2nd 	+2 	2 	1 	Psionic Talents 	2
3rd 	+2 	3 	2 	Secondary Discipline, Psionic Archetype feature 	2
5th 	+3 	5 	3 	Psionic Mastery 	3
20th 	+6 	20 	10 	Ascension 	8`

    const parsed = parseClassProgressionTable(text)
    expect(parsed).not.toBeNull()
    expect(parsed!.columns.map((col) => col.resourceKey)).toEqual(["psi_points", "psi_limit"])
    expect(parsed!.columns[0].valuesByLevel).toContainEqual({ level: 1, count: 1 })
    expect(parsed!.columns[0].valuesByLevel).toContainEqual({ level: 20, count: 20 })
    expect(parsed!.columns[1].valuesByLevel).toContainEqual({ level: 20, count: 10 })
  })

  it("parses Alternate Fighter exploit columns from HTML table", () => {
    const text = `<table>
<tr><th>Level</th><th>Proficiency Bonus</th><th>Fighting Styles</th><th>Exploits Known</th><th>Exploit Die</th><th>Exploit Dice</th><th>Features</th></tr>
<tr><td>1st</td><td>+2</td><td>1</td><td>—</td><td>—</td><td>—</td><td>Fighting Style</td></tr>
<tr><td>2nd</td><td>+2</td><td>1</td><td>2</td><td>d6</td><td>2</td><td>Martial Exploits</td></tr>
<tr><td>5th</td><td>+3</td><td>1</td><td>4</td><td>d8</td><td>3</td><td>Extra Attack</td></tr>
</table>`

    const parsed = parseClassProgressionTable(text)
    expect(parsed).not.toBeNull()
    const keys = parsed!.columns.map((col) => col.resourceKey)
    expect(keys).toContain("exploit_dice")
    expect(keys).toContain("exploit_die_size")
    expect(keys).not.toContain("exploits_known")
    expect(keys).not.toContain("fighting_styles")

    const dieSize = parsed!.columns.find((col) => col.resourceKey === "exploit_die_size")
    expect(dieSize?.valuesByLevel).toContainEqual({ level: 2, count: 6 })
    expect(dieSize?.valuesByLevel).toContainEqual({ level: 5, count: 8 })
  })
})

describe("psi point cost detection", () => {
  it("detects expend N psi points phrasing", () => {
    expect(detectPsiPointCost("you can expend 2 psi points to gain advantage")).toBe(2)
    expect(detectPsiPointCost("At the start of your turn, you can expend 2 psi points")).toBe(2)
  })
})

describe("exploit die cost detection", () => {
  it("detects expend exploit die phrasing", () => {
    expect(detectExploitDieCost("you can expend one exploit die to add to the roll")).toBe(1)
    expect(detectExploitDieCost("expend up to 2 exploit dice")).toBe(2)
  })
})
