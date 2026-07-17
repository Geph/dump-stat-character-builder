import { describe, expect, it } from "vitest"
import { collectMissingCreatureGrants } from "@/lib/import/collect-missing-creature-grants"
import type { ImportContent } from "@/lib/import/content-schema"

const beastMaster = {
  name: "Beast Master",
  class_name: "Ranger",
  features: [
    {
      name: "Primal Companion",
      level: 3,
      description: "You magically summon a primal beast.",
    },
  ],
}

describe("collectMissingCreatureGrants", () => {
  it("flags Beast Master's primal beasts as missing import dependencies", () => {
    const missing = collectMissingCreatureGrants({
      subclasses: [beastMaster],
    } as unknown as ImportContent)
    expect(missing.map((entry) => entry.name)).toEqual([
      "Beast of the Land",
      "Beast of the Sea",
      "Beast of the Sky",
    ])
    expect(missing[0].sources).toEqual(["Beast Master (Primal Companion)"])
  })

  it("clears the dependency when the creatures ship in the same batch", () => {
    const missing = collectMissingCreatureGrants({
      subclasses: [beastMaster],
      creatures: [
        { name: "Beast of the Land" },
        { name: "Beast of the Sea" },
        { name: "Beast of the Sky" },
      ],
    } as unknown as ImportContent)
    expect(missing).toHaveLength(0)
  })

  it("clears the dependency when the creatures already exist in the library", () => {
    const missing = collectMissingCreatureGrants(
      { subclasses: [beastMaster] } as unknown as ImportContent,
      [
        { name: "Beast of the Land" },
        { name: "Beast of the Sea" },
        { name: "Beast of the Sky" },
      ],
    )
    expect(missing).toHaveLength(0)
  })

  it("does not flag Faithful Steed since the Otherworldly Steed ships in the SRD seed", () => {
    const missing = collectMissingCreatureGrants({
      classes: [
        {
          name: "Paladin",
          features: [{ name: "Faithful Steed", level: 5, description: "" }],
        },
      ],
    } as unknown as ImportContent)
    expect(missing).toHaveLength(0)
  })

  it("reads grant_creature linked modifiers and companion_creature_names", () => {
    const missing = collectMissingCreatureGrants({
      classes: [
        {
          name: "Summoner",
          features: [
            {
              name: "Bound Ally",
              level: 1,
              description: "",
              companion_creature_names: ["Chained Horror"],
              linkedModifiers: [
                {
                  instanceId: "modinst_test",
                  catalogRefId: "cat_char_grant_creature",
                  characteristics: [
                    {
                      id: "mod_test",
                      type: "grant_creature",
                      creatureNames: ["Void Hound", "Wolf"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    // Wolf is in the SRD seed; the homebrew creatures are not.
    expect(missing.map((entry) => entry.name)).toEqual(["Chained Horror", "Void Hound"])
  })
})
