import { describe, expect, it } from "vitest"
import {
  collectReplacedFeatureNames,
  featureIsReplaced,
  resolveFirstUseNoAction,
} from "@/lib/character/replace-feature"
import type { Feature } from "@/lib/types"

describe("replace_feature", () => {
  it("collects names superseded by an unlocked replacement", () => {
    const features = [
      {
        name: "Sacrificial Strike",
        level: 1,
      },
      {
        name: "Improved Sacrificial Strike",
        level: 11,
        linkedModifiers: [
          {
            instanceId: "modinst_replace",
            catalogRefId: "cat_char_replace_feature",
            characteristics: [
              {
                id: "mod_replace",
                type: "replace_feature",
                replacedFeatureNames: ["Sacrificial Strike"],
              },
            ],
          },
        ],
      },
    ] as Feature[]
    expect(collectReplacedFeatureNames(features, 10).size).toBe(0)
    const at11 = collectReplacedFeatureNames(features, 11)
    expect(featureIsReplaced({ name: "Sacrificial Strike" }, at11)).toBe(true)
    expect(featureIsReplaced({ name: "Improved Sacrificial Strike" }, at11)).toBe(false)
  })

  it("gates first-use-no-action by class level", () => {
    const activation = { firstUseNoAction: true, firstUseNoActionFromLevel: 17 }
    expect(resolveFirstUseNoAction(activation, 11)).toBe(false)
    expect(resolveFirstUseNoAction(activation, 17)).toBe(true)
    expect(resolveFirstUseNoAction({ firstUseNoAction: true }, 1)).toBe(true)
    expect(resolveFirstUseNoAction({ bonusAction: true }, 17)).toBe(false)
  })
})
