import { describe, expect, it } from "vitest"
import {
  collectSubclassGrantedDisciplineNames,
  formatGrantedDisciplineTag,
  subclassFeatureTitleRows,
} from "@/lib/builder/subclass-detail-display"
import type { Feature, Subclass } from "@/lib/types"

describe("subclass detail display", () => {
  it("collects granted discipline names from linked modifiers", () => {
    const subclass = {
      features: [
        {
          level: 1,
          name: "Awakened Mind",
          description: "",
          linkedModifiers: [
            {
              instanceId: "a",
              catalogRefId: "cat",
              characteristics: [
                { id: "g1", type: "grant_custom_ability", abilityNames: ["Telepathy Discipline"] },
                { id: "g2", type: "grant_custom_ability", abilityNames: ["Rift Strike"] },
              ],
            },
          ],
        },
      ],
    } as Pick<Subclass, "features">

    expect(collectSubclassGrantedDisciplineNames(subclass)).toEqual(["Telepathy Discipline"])
    expect(formatGrantedDisciplineTag("Telepathy Discipline")).toBe("Telepathy")
  })

  it("maps features to title rows without summaries", () => {
    const features = [
      { level: 3, name: "Opened Mind", description: "Long text." },
      { level: 1, name: "Mental Awareness", description: "More text." },
    ] as Feature[]
    expect(subclassFeatureTitleRows(features)).toEqual([
      { level: 1, name: "Mental Awareness", resourceRelated: false, summary: "" },
      { level: 3, name: "Opened Mind", resourceRelated: false, summary: "" },
    ])
  })
})
