import { describe, expect, it } from "vitest"
import {
  asiPoolPointsFromFeatSelections,
  shouldUseLegacyMilestoneAsiUi,
  type AbilityScorePoolGrant,
} from "@/lib/builder/ability-score-pools"
import type { FeatSelectionEntry } from "@/lib/builder/feat-choices"
import type { Feat } from "@/lib/types"

const asiFeat: Feat = {
  id: "feat_asi",
  name: "Ability Score Improvement",
  description: "",
  category: "General",
  level_requirement: 4,
  prerequisite: null,
  benefits: null,
  isChoice: false,
  choices: null,
  modifierRefs: [],
  linkedModifiers: [],
  source: "SRD",
  creator_url: null,
  created_at: "",
}

describe("shouldUseLegacyMilestoneAsiUi", () => {
  it("hides legacy UI when catalog pool grants cover ASI feat picks", () => {
    const entries: FeatSelectionEntry[] = [
      { featId: asiFeat.id, choicePickKey: "feat:milestone:4" },
    ]
    const grants: AbilityScorePoolGrant[] = [
      {
        allocationKey: "feat:milestone:4::ref::cat_asi::mod_1",
        label: "SRD ASI: +2 to one ability or +1 to two",
        points: 2,
      },
    ]

    expect(
      shouldUseLegacyMilestoneAsiUi({
        milestoneAsiFeatCount: 1,
        grants,
        featSelectionEntries: entries,
        feats: [asiFeat],
      }),
    ).toBe(false)
    expect(asiPoolPointsFromFeatSelections(grants, entries, [asiFeat])).toBe(2)
  })

  it("shows legacy UI when ASI feats lack pool grants", () => {
    expect(
      shouldUseLegacyMilestoneAsiUi({
        milestoneAsiFeatCount: 1,
        grants: [],
        featSelectionEntries: [{ featId: asiFeat.id, choicePickKey: "feat:milestone:4" }],
        feats: [asiFeat],
      }),
    ).toBe(true)
  })
})
