import { describe, expect, it } from "vitest"
import {
  descriptionHasLeftoverMarkdown,
  featureLooksUnwired,
  lintCompendiumRecords,
} from "@/lib/compendium/content-lint"

describe("content lint", () => {
  it("flags leftover markdown in HTML-wrapped descriptions", () => {
    expect(descriptionHasLeftoverMarkdown("<p>_Colossus Slayer._ Extra damage.</p>")).toBe(true)
    expect(descriptionHasLeftoverMarkdown("<p>Plain rules text.</p>")).toBe(false)
  })

  it("flags unwired choice features", () => {
    expect(featureLooksUnwired({ name: "Hunter's Prey", isChoice: true, choices: { options: [] } })).toBe(
      true,
    )
    expect(
      featureLooksUnwired({
        name: "Hunter's Prey",
        isChoice: true,
        choices: { options: [{ name: "Colossus Slayer" }] },
      }),
    ).toBe(false)
  })

  it("walks subclass features in seed-shaped records", () => {
    const issues = lintCompendiumRecords(
      [
        {
          name: "Hunter",
          features: [
            {
              name: "Hunter's Prey",
              description: "You gain one option.\n_Colossus Slayer._ Extra damage.",
              isChoice: true,
              choices: { options: [] },
            },
          ],
        },
      ],
      "subclasses",
    )
    expect(issues.some((issue) => issue.message.includes("markdown"))).toBe(true)
    expect(issues.some((issue) => issue.message.includes("Choice feature"))).toBe(true)
  })
})
