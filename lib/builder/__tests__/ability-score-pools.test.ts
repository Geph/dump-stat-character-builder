import { describe, expect, it } from "vitest"
import {
  asiPoolPointsFromFeatSelections,
  collectAbilityScorePoolGrants,
  shouldUseLegacyMilestoneAsiUi,
  type AbilityScorePoolGrant,
} from "@/lib/builder/ability-score-pools"
import type { FeatSelectionEntry } from "@/lib/builder/feat-choices"
import { GRANT_FEAT_CATALOG_ID } from "@/lib/compendium/grant-feat-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { DndClass, Feat, Feature } from "@/lib/types"

const asiFeat = {
  id: "feat_asi",
  name: "Ability Score Improvement",
  description: "",
  category: "General",
  level_requirement: 4,
  prerequisite: null,
  benefits: null,
  isChoice: false,
  choices: undefined,
  modifierRefs: [],
  linkedModifiers: [
    {
      instanceId: "inst_feat_asi",
      catalogRefId: "cat_asi",
      characteristics: [
        {
          id: "mod_asi_feat",
          type: "ability_scores",
          mode: "asi_pool",
          points: 2,
          label: "ASI: +2 to one ability or +1 to two",
        },
      ],
    },
  ],
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as Feat

const catalog: ModifierCatalogEntry[] = [
  {
    id: "cat_asi",
    name: "Ability Score Improvement",
    characteristics: [
      {
        id: "mod_asi_pool",
        type: "ability_scores",
        mode: "asi_pool",
        points: 2,
        label: "ASI: +2 to one ability or +1 to two",
      },
    ],
  } as ModifierCatalogEntry,
  {
    id: GRANT_FEAT_CATALOG_ID,
    name: "Grant Feat",
    characteristics: [
      {
        id: "mod_grant_feat",
        type: "grant_feat",
        featCategories: ["General"],
        count: 1,
      },
    ],
  } as ModifierCatalogEntry,
]

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

  it("hides legacy UI when Feat · ASI pools cover via source label fallback", () => {
    expect(
      shouldUseLegacyMilestoneAsiUi({
        milestoneAsiFeatCount: 1,
        grants: [
          {
            allocationKey: "feat:odd-key::ref::cat_asi::mod_asi_feat",
            label: "ASI: +2 to one ability or +1 to two",
            sourceLabel: "Feat · Ability Score Improvement",
            points: 2,
          },
        ],
        featSelectionEntries: [{ featId: asiFeat.id, choicePickKey: "feat:milestone:4" }],
        feats: [asiFeat],
      }),
    ).toBe(false)
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

describe("collectAbilityScorePoolGrants", () => {
  it("skips class-feature asi_pool when the feature also grants a feat pick", () => {
    const doubleWiredAsiFeature = {
      name: "Ability Score Improvement",
      level: 4,
      description: "You can take a feat or improve ability scores.",
      isChoice: false,
      linkedModifiers: [
        {
          instanceId: "inst_grant",
          catalogRefId: GRANT_FEAT_CATALOG_ID,
          characteristics: [
            {
              id: "mod_grant",
              type: "grant_feat",
              featCategories: ["General"],
              count: 1,
            },
          ],
        },
        {
          instanceId: "inst_pool",
          catalogRefId: "cat_asi",
          characteristics: [
            {
              id: "mod_pool",
              type: "ability_scores",
              mode: "asi_pool",
              points: 2,
              label: "ASI: +2 to one ability or +1 to two",
            },
          ],
        },
      ],
    } as unknown as Feature

    const fighter = {
      id: "class_fighter",
      name: "Fighter",
      features: [doubleWiredAsiFeature],
    } as unknown as DndClass

    const grants = collectAbilityScorePoolGrants({
      catalog,
      speciesTraitPicks: {},
      feats: [asiFeat],
      selectedFeatIds: [asiFeat.id],
      featSelectionEntries: [{ featId: asiFeat.id, choicePickKey: "feat:milestone:4" }],
      classLevels: [{ classId: fighter.id, level: 4 }],
      classes: [fighter],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
    })

    const featurePools = grants.filter((g) => g.sourceLabel?.startsWith("Feature ·"))
    const featPools = grants.filter((g) => g.sourceLabel?.startsWith("Feat ·"))

    expect(featurePools).toHaveLength(0)
    expect(featPools).toHaveLength(1)
    expect(featPools[0]?.points).toBe(2)
  })

  it("keeps class-feature asi_pool when the feature does not grant a feat", () => {
    const classicAsiFeature = {
      name: "Ability Score Improvement",
      level: 4,
      description: "Increase one ability by 2, or two by 1.",
      isChoice: false,
      linkedModifiers: [
        {
          instanceId: "inst_pool",
          catalogRefId: "cat_asi",
          characteristics: [
            {
              id: "mod_pool",
              type: "ability_scores",
              mode: "asi_pool",
              points: 2,
              label: "ASI: +2 to one ability or +1 to two",
            },
          ],
        },
      ],
    } as unknown as Feature

    const fighter = {
      id: "class_fighter",
      name: "Fighter",
      features: [classicAsiFeature],
    } as unknown as DndClass

    const grants = collectAbilityScorePoolGrants({
      catalog,
      speciesTraitPicks: {},
      feats: [],
      selectedFeatIds: [],
      classLevels: [{ classId: fighter.id, level: 4 }],
      classes: [fighter],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
    })

    expect(grants).toHaveLength(1)
    expect(grants[0]?.sourceLabel).toBe("Feature · Ability Score Improvement")
  })
})
