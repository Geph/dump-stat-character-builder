import { describe, expect, it } from "vitest"
import {
  applyFeatureSheetDisplay,
  inferFeatureSheetDisplay,
  resolveFeatureSheetDisplay,
} from "@/lib/compendium/feature-sheet-display"
import type { Feature } from "@/lib/types"

describe("feature sheet display", () => {
  it("defaults passive features to Features tab only", () => {
    const feature = {
      level: 2,
      name: "Danger Sense",
      description: "You have advantage on Dexterity saving throws unless incapacitated.",
    }
    expect(inferFeatureSheetDisplay(feature as unknown as import("@/lib/character/sheet-actions").ActivatableItem)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: false,
      restDialogues: false,
    })
  })

  it("routes combat actions to Combat tab and Features tab", () => {
    const feature = {
      level: 2,
      name: "Action Surge",
      description: "On your turn, you can take one additional action.",
      activation: { action: true },
      limitedUses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: [{ rest: "short_rest" }],
        atLevelTable: [
          { level: 2, count: 1 },
          { level: 17, count: 2 },
        ],
      },
      linkedModifiers: [
        {
          instanceId: "modinst_action_surge",
          catalogRefId: "cat_fx_extra_action",
          activation: { effects: [{ id: "fx1", kind: "extra_action" }] },
        },
      ],
    }
    expect(inferFeatureSheetDisplay(feature as unknown as import("@/lib/character/sheet-actions").ActivatableItem)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: true,
      restDialogues: false,
    })
  })

  it("respects explicit sheetDisplay overrides", () => {
    const feature = {
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
      restDialogues: false,
    })
  })

  it("keeps Potion Mixologist on Combat and Features when seed data filed it as Abilities-only", () => {
    const feature = {
      level: 15,
      name: "Potion Mixologist",
      description: "As a Bonus Action, you drink two potions at once.",
      activation: { bonusAction: true },
      sheetDisplay: {
        abilitiesActions: true,
      },
    }
    expect(resolveFeatureSheetDisplay(feature)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: true,
      restDialogues: false,
    })
  })

  it("surfaces Reckless Attack on combat actions even when sheetDisplay omitted combat", () => {
    const feature = {
      level: 2,
      name: "Reckless Attack",
      description: "When you make your first attack roll on your turn, you can attack recklessly.",
      sheetDisplay: {
        featuresTab: true,
        abilitiesActions: false,
        combatActions: false,
      },
    }
    expect(resolveFeatureSheetDisplay(feature)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: true,
      restDialogues: false,
    })
  })

  it("stamps sheetDisplay when enriching SRD features", () => {
    const feature = {
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
      restDialogues: false,
    })
  })

  it("routes short-rest choice features to rest dialogues only", () => {
    const feature = {
      level: 9,
      name: "Divine Respite",
      description:
        "When you finish a Short Rest, you can choose to regain up to 3 expended Hit Point Dice.",
      activation: { action: true, noEconomyCost: true },
    }
    expect(inferFeatureSheetDisplay(feature as unknown as import("@/lib/character/sheet-actions").ActivatableItem)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: false,
      restDialogues: true,
    })
  })

  it("files first-round-of-combat openers on Combat even when stamped Abilities-only", () => {
    const feature = {
      level: 6,
      name: "Sociable Start",
      description:
        "During the first round of combat, you can take the Influence action as a Bonus Action and have Advantage on ability checks you make using that action.",
      activation: { bonusAction: true },
      sheetDisplay: {
        featuresTab: true,
        abilitiesActions: true,
        combatActions: false,
      },
    }
    expect(resolveFeatureSheetDisplay(feature)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: true,
      restDialogues: false,
    })
  })

  it("routes non-action enemy combat impact to Combat tab", () => {
    const feature = {
      level: 10,
      name: "Beguiling Charm",
      description:
        "When you give a creature the Charmed condition, you can choose an effect. Friend of My Friends. The target subtracts your Dance Die from all its attack rolls.",
    }
    expect(inferFeatureSheetDisplay(feature as unknown as import("@/lib/character/sheet-actions").ActivatableItem)).toEqual({
      featuresTab: true,
      abilitiesActions: false,
      combatActions: true,
      restDialogues: false,
    })
  })
})
