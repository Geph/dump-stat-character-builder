import { describe, expect, it } from "vitest"
import {
  applyFeatureSheetDisplay,
  inferFeatureSheetDisplay,
  resolveFeatureSheetDisplay,
} from "@/lib/compendium/feature-sheet-display"
import type { Feature } from "@/lib/types"

describe("feature sheet display", () => {
  it("defaults passive features to Features tab only", () => {
    const feature: Feature = {
      level: 2,
      name: "Danger Sense",
      description: "You have advantage on Dexterity saving throws unless incapacitated.",
    }
    expect(inferFeatureSheetDisplay(feature)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: false,
    })
  })

  it("routes combat actions to Combat tab and Features tab", () => {
    const feature: Feature = {
      level: 2,
      name: "Action Surge",
      description: "On your turn, you can take one additional action.",
      activation: { action: true },
      limitedUses: { type: "class_resource", classResourceKey: "action_surge" },
    }
    expect(inferFeatureSheetDisplay(feature)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: true,
    })
  })

  it("respects explicit sheetDisplay overrides", () => {
    const feature: Feature = {
      level: 1,
      name: "Channel Divinity",
      description: "As a magic action...",
      activation: { action: true },
      sheetDisplay: {
        featuresTab: false,
        abilitiesActions: true,
        combatActions: false,
      },
    }
    expect(resolveFeatureSheetDisplay(feature)).toEqual({
      featuresTab: false,
      abilitiesActions: true,
      combatActions: false,
    })
  })

  it("stamps sheetDisplay when enriching SRD features", () => {
    const feature: Feature = {
      level: 1,
      name: "Rage",
      description: "As a bonus action, you can enter your Rage.",
      activation: { bonusAction: true },
    }
    const enriched = applyFeatureSheetDisplay(feature)
    expect(enriched.sheetDisplay).toEqual({
      featuresTab: true,
      abilitiesActions: true,
      combatActions: false,
    })
  })
})
