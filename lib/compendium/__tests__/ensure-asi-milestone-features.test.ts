import { describe, expect, it } from "vitest"
import {
  ensureMilestoneGrantFeatFeatures,
  resolveAsiMilestoneLevels,
} from "@/lib/compendium/ensure-asi-milestone-features"
import { getFeatPickSlots } from "@/lib/builder/class-feat-features"
import { GRANT_FEAT_CATALOG_ID } from "@/lib/compendium/grant-feat-catalog"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import type { DndClass, Feature } from "@/lib/types"

const catalog = [
  { id: GRANT_FEAT_CATALOG_ID, name: "Gain a Feat", group: "Feats & choices", characteristics: [] },
]

function dancerAsi(): Feature {
  return {
    level: 4,
    name: "Ability Score Improvement",
    description:
      "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Dancer levels 8, 12, and 16.",
    linkedModifiers: [
      {
        instanceId: "modinst_asi",
        catalogRefId: GRANT_FEAT_CATALOG_ID,
        characteristics: [
          {
            id: "mod_asi",
            type: "grant_feat",
            featCategories: ["General"],
            count: 1,
            label: "General feat",
          },
        ],
      },
    ],
    modifierRefs: [GRANT_FEAT_CATALOG_ID],
  }
}

describe("ensureMilestoneGrantFeatFeatures", () => {
  it("parses Dancer-style again-at levels without treating ASI +2/+1 prose as levels", () => {
    expect(resolveAsiMilestoneLevels(dancerAsi())).toEqual([4, 8, 12, 16])
    expect(
      resolveAsiMilestoneLevels({
        level: 4,
        name: "Ability Score Improvement",
        description: "Increase one ability score by 2 or two ability scores by 1.",
      }),
    ).toEqual([4, 8, 12, 16])
  })

  it("expands a single Dancer ASI into 8/12/16 grant features", () => {
    const features = ensureMilestoneGrantFeatFeatures([
      dancerAsi(),
      {
        level: 19,
        name: "Epic Boon",
        description: "You gain an Epic Boon feat or another feat of your choice for which you qualify.",
        linkedModifiers: [
          {
            instanceId: "modinst_epic",
            catalogRefId: GRANT_FEAT_CATALOG_ID,
            characteristics: [
              {
                id: "mod_epic",
                type: "grant_feat",
                featCategories: ["Epic Boon"],
                count: 1,
              },
            ],
          },
        ],
        modifierRefs: [GRANT_FEAT_CATALOG_ID],
      },
    ])
    const asiLevels = features
      .filter((feature) => /ability score improvement/i.test(feature.name))
      .map((feature) => feature.level)
    expect(asiLevels).toEqual([4, 8, 12, 16])
    expect(features.some((feature) => feature.level === 19 && /epic boon/i.test(feature.name))).toBe(
      true,
    )
  })
})

describe("Dancer feat pick slots", () => {
  it("offers General feat picks at 4, 8, 12, and 16 after class enrichment", () => {
    const [dancer] = enrichClassesList([
      {
        id: "class_dancer",
        name: "Dancer",
        source: "Mage Hand Press",
        features: [dancerAsi()],
      } as unknown as DndClass,
    ])

    const slots = getFeatPickSlots(
      [{ classId: "class_dancer", level: 8 }],
      [dancer],
      catalog,
      8,
    )
    const general = slots.filter((slot) => slot.featCategories.includes("General"))
    expect(general.map((slot) => slot.milestoneLevel)).toEqual([4, 8])
  })
})
