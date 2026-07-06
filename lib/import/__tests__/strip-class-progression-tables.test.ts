import { describe, expect, it } from "vitest"
import { enrichImportedClassRow } from "@/lib/import/enrich-import-classes"
import {
  isClassLevelProgressionTable,
  stripClassProgressionTablesFromText,
} from "@/lib/import/strip-class-progression-tables"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { prepareImportedContent } from "@/lib/import/finalize-import"
import { mergeTableParsedClassResources } from "@/lib/import/enrich-import-classes"
import type { ImportContent } from "@/lib/import/content-schema"

const GUNSLINGER_TABLE = `<table>
<tr><th>Level</th><th>Proficiency Bonus</th><th>Class Features</th><th>Risk Dice</th><th>Weapon Mastery</th></tr>
<tr><td>1st</td><td>+2</td><td>Fighting Style, Quick Draw</td><td>—</td><td>2</td></tr>
<tr><td>2nd</td><td>+2</td><td>Critical Shot, Risk</td><td>4d8</td><td>2</td></tr>
<tr><td>3rd</td><td>+2</td><td>Gunslinger Maneuvers</td><td>4d8</td><td>2</td></tr>
<tr><td>4th</td><td>+2</td><td>Ability Score Improvement</td><td>4d8</td><td>2</td></tr>
<tr><td>5th</td><td>+3</td><td>Extra Attack, Gut Shot</td><td>5d8</td><td>3</td></tr>
</table>`

describe("stripClassProgressionTablesFromText", () => {
  it("detects Gunslinger-style progression tables with resource columns", () => {
    expect(isClassLevelProgressionTable(GUNSLINGER_TABLE)).toBe(true)
    const parsed = parseClassProgressionTable(GUNSLINGER_TABLE)
    expect(parsed?.columns.map((col) => col.resourceKey)).toEqual(
      expect.arrayContaining(["risk_dice", "weapon_mastery"]),
    )
  })

  it("removes embedded progression tables but keeps flavor prose", () => {
    const description = `A Gunslinger lives by the gun.\n\n${GUNSLINGER_TABLE}\n\nClass Features\nHit Dice: 1d10`
    const stripped = stripClassProgressionTablesFromText(description)
    expect(stripped).toContain("A Gunslinger lives by the gun.")
    expect(stripped).toContain("Class Features")
    expect(stripped).not.toContain("<table>")
    expect(stripped).not.toContain("Risk Dice")
  })
})

describe("enrichImportedClassRow", () => {
  it("strips progression tables from class description on enrich", () => {
    const row = enrichImportedClassRow(
      {
        name: "Gunslinger",
        description: `Flavor text only before.\n${GUNSLINGER_TABLE}`,
        features: [{ level: 1, name: "Fighting Style", description: "Pick a style." }],
      },
      undefined,
    )

    expect(row.description).toContain("Flavor text only before.")
    expect(row.description).not.toContain("<table>")
  })
})

describe("mergeTableParsedClassResources", () => {
  it("fills atLevelTable from embedded table when AI proposal lacks levels", () => {
    const content = {
      classes: [
        {
          name: "Gunslinger",
          description: `Intro\n${GUNSLINGER_TABLE}`,
          features: [],
        },
      ],
      import_proposals: {
        class_resources: [
          {
            proposal_id: "risk_dice",
            class_name: "Gunslinger",
            resource_key: "risk_dice",
            name: "Risk Dice",
            definition: "Risk dice pool.",
            uses: { type: "at_level", atLevelMode: "tier" },
          },
        ],
      },
    }

    const merged = mergeTableParsedClassResources(content)
    const riskDice = merged.find((row) => row.resource_key === "risk_dice")
    expect(riskDice?.uses.atLevelTable?.length).toBeGreaterThan(0)

    const prepared = prepareImportedContent({
      ...content,
      class_resources: merged as ImportContent["class_resources"],
    } as unknown as ImportContent)
    expect(prepared.kind).toBe("confirm")
    if (prepared.kind !== "confirm") return

    const proposal = prepared.proposals.classResources.find((row) => row.resourceKey === "risk_dice")
    expect(proposal?.uses.atLevelTable?.length).toBeGreaterThan(0)
    expect(prepared.pendingContent.classes?.[0]?.description).not.toContain("<table>")
  })
})
