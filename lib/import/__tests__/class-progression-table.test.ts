import { describe, expect, it } from "vitest"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { detectPsiPointCost, detectExploitDieCost, detectBattleDieCost } from "@/lib/import/enrich-import-classes"

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
    expect(keys).not.toContain("exploit_die_size")
    expect(keys).not.toContain("exploits_known")
    expect(keys).not.toContain("fighting_styles")

    const exploitDice = parsed!.columns.find((col) => col.resourceKey === "exploit_dice")
    expect(exploitDice?.valuesByLevel).toContainEqual({ level: 2, count: 2 })
    expect(exploitDice?.valuesByLevel).toContainEqual({ level: 5, count: 3 })
    expect(exploitDice?.dieSidesByLevel).toContainEqual({ level: 2, count: 6 })
    expect(exploitDice?.dieSidesByLevel).toContainEqual({ level: 5, count: 8 })
  })

  it("parses Captain Battle Dice column with NdM pool notation", () => {
    const text = `<table>
<tr><th>Level</th><th>Proficiency Bonus</th><th>Features</th><th>Battle Dice</th></tr>
<tr><td>1st</td><td>+2</td><td>Battle Tactics, Weapon Mastery</td><td>2d6</td></tr>
<tr><td>5th</td><td>+3</td><td>Blitz, Cohort</td><td>3d6</td></tr>
<tr><td>9th</td><td>+4</td><td>Cohort</td><td>3d8</td></tr>
<tr><td>20th</td><td>+6</td><td>Legendary Commander</td><td>5d8</td></tr>
</table>`

    const parsed = parseClassProgressionTable(text)
    expect(parsed).not.toBeNull()
    const battleDice = parsed!.columns.find((col) => col.resourceKey === "battle_dice")
    expect(battleDice?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 1, count: 2 },
        { level: 5, count: 3 },
        { level: 20, count: 5 },
      ]),
    )
    expect(battleDice?.dieSidesByLevel).toEqual(
      expect.arrayContaining([
        { level: 1, count: 6 },
        { level: 9, count: 8 },
      ]),
    )
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

describe("battle die cost detection", () => {
  it("detects expend battle die phrasing", () => {
    expect(detectBattleDieCost("you can expend one Battle Die to motivate an ally")).toBe(1)
    expect(detectBattleDieCost("expend a Battle Die as a Bonus Action")).toBe(1)
  })
})
