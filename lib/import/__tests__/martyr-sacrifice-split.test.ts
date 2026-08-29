import { describe, expect, it } from "vitest"
import {
  expandMartyrSacrificeFeatures,
  extractMartyrSacrificeBenefit,
} from "@/lib/import/enrichment-presets/packs/homebrew"
import type { Feature } from "@/lib/types"

const COMBINED = `
<p>The gods demand that you undergo trials to curry their favor, granting you the following benefits.</p>
<p><strong>Sacrificial Strike.</strong> When you deal damage to a creature with a Melee weapon or Unarmed Strike, you can take a Bonus Action to enhance the strike. You take 5 Radiant damage and the target takes an extra 10 Radiant damage.</p>
<p><strong>Sacrificial Skill.</strong> Once per turn when you fail a D20 Test, you can take 10 Radiant damage to gain a +5 bonus to that roll. If the test still fails, you don't take this Radiant damage.</p>
<p>Sacrificial Strike / Sacrificial Skill self-damage riders stay narrative/play-time unless a clear passive sheet bonus exists.</p>
`

describe("Martyr Sacrifice split", () => {
  it("extracts each named benefit without the sibling or wiring note", () => {
    const strike = extractMartyrSacrificeBenefit(COMBINED, "Sacrificial Strike")
    const skill = extractMartyrSacrificeBenefit(COMBINED, "Sacrificial Skill")
    expect(strike).toMatch(/Bonus Action to enhance the strike/)
    expect(strike).not.toMatch(/fail a D20 Test/)
    expect(skill).toMatch(/fail a D20 Test/)
    expect(skill).not.toMatch(/Bonus Action to enhance/)
    expect(strike).not.toMatch(/self-damage riders/)
    expect(skill).not.toMatch(/self-damage riders/)
  })

  it("expands a combined Sacrifice row into Strike and Skill", () => {
    const features = expandMartyrSacrificeFeatures(
      [{ name: "Sacrifice", level: 1, description: COMBINED } as Feature],
      "Martyr",
    )
    expect(features.map((feature) => feature.name)).toEqual([
      "Sacrificial Strike",
      "Sacrificial Skill",
    ])
    expect(features[0]?.activation?.bonusAction).toBe(true)
  })

  it("hides a leftover combined Sacrifice when Strike and Skill already exist", () => {
    const features = expandMartyrSacrificeFeatures(
      [
        { name: "Sacrifice", level: 1, description: COMBINED },
        { name: "Sacrificial Strike", level: 1, description: "Strike" },
        { name: "Sacrificial Skill", level: 1, description: "Skill" },
      ] as Feature[],
      "Martyr",
    )
    const parent = features.find((feature) => feature.name === "Sacrifice")
    expect(parent?.sheetDisplay).toMatchObject({
      combatActions: false,
      featuresTab: false,
    })
    expect(features.filter((feature) => feature.name === "Sacrificial Strike")).toHaveLength(1)
  })
})
