import { describe, expect, it } from "vitest"

import {
  descriptionBeforeChooseOneOptions,
  parseChooseOneNamedOptions,
} from "@/lib/compendium/choose-one-named-options"

describe("parseChooseOneNamedOptions", () => {
  it("splits named benefits and infers Assault as a Bonus Action", () => {
    const options = parseChooseOneNamedOptions(
      "Once per turn when you reduce an enemy to 0 Hit Points, choose one of the following benefits.\n\nAssault. As a Bonus Action, you can move up to 15 feet and make a melee attack.\n\nBreak Spells. The creature's spells and ongoing effects end.\n\nShatter Morale. Nearby allies of the creature have the Frightened condition.",
    )
    expect(options.map((option) => option.name)).toEqual([
      "Assault",
      "Break Spells",
      "Shatter Morale",
    ])
    expect(options[0]?.actionKind).toBe("bonus")
    expect(options[1]?.actionKind).toBeUndefined()
  })

  it("reads Name. headings from HTML strong tags", () => {
    const options = parseChooseOneNamedOptions(
      "<p>Once per turn when you reduce an enemy to 0 Hit Points, choose one of the following benefits.</p><p><strong>Assault.</strong> As a Bonus Action, you can move up to 15 feet and make a melee attack.</p><p><strong>Break Spells.</strong> The creature's spells and ongoing effects end.</p>",
    )
    expect(options.map((option) => option.name)).toEqual(["Assault", "Break Spells"])
    expect(options[0]?.actionKind).toBe("bonus")
  })

  it("does not treat Energy Mastery damage-type picks or Repeatable as a menu", () => {
    expect(
      parseChooseOneNamedOptions(
        "<p><strong>Energy Mastery.</strong> Choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder. You have Resistance to damage of the chosen type. In addition, when you roll damage for a spell you cast that deals damage of that type, you can treat any 1 on a damage die as a 2.</p><p><strong>Repeatable.</strong> You can take this feat more than once, but you must choose a different damage type each time for Energy Mastery.</p>",
      ),
    ).toEqual([])
  })

  it("does not treat always-on following-benefits lists as a menu", () => {
    expect(
      parseChooseOneNamedOptions(
        "Your zeal for freedom grants you the following benefits.\n\nRanged Reprisal. You can use Reprisal at range.\n\nSacrificial Inspiration. As a Bonus Action, you can take damage to grant inspiration.",
      ),
    ).toEqual([])
  })

  it("keeps parent economy text out of the option tail", () => {
    expect(
      descriptionBeforeChooseOneOptions(
        "As a Bonus Action, choose one of the following benefits.\n\nBlock. Raise a shield.\n\nGrasp. Pull a foe.",
      ),
    ).toMatch(/as a bonus action/i)
  })
})
