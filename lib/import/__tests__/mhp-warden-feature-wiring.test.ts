import { describe, expect, it } from "vitest"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { enrichImportedClassRow } from "@/lib/import/enrich-import-classes"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { applyProposalSelections, collectImportProposals } from "@/lib/import/import-proposals"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

function chars(feature: Feature | undefined) {
  return feature?.linkedModifiers?.flatMap((mod) => mod.characteristics ?? []) ?? []
}

describe("MHP Warden feature wiring", () => {
  it("wires Interrupt as a reaction spending the interrupt class resource", () => {
    const row = enrichImportedClassRow(
      {
        name: "Warden",
        features: [
          {
            level: 5,
            name: "Interrupt",
            description:
              "When an enemy within 5 feet of you takes an action, you can take a Reaction to prevent one of its attacks.",
          },
        ],
      },
      [
        {
          class_name: "Warden",
          resource_key: "interrupt",
          name: "Interrupt",
          uses: {
            type: "at_level",
            atLevelTable: [{ level: 5, count: 3 }],
            recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
          },
        },
      ],
    )
    const feature = (row.features as Feature[]).find((f) => f.name === "Interrupt")
    expect(feature?.activation?.reaction).toBe(true)
    expect(feature?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "interrupt",
    })
    expect(feature?.sheetDisplay?.combatActions).toBe(true)
  })

  it("wires Guardian Tactics menu with Extended Tactics unlock and Survive share key", () => {
    const content = applyImportEnrichmentPresets(
      {
        classes: [
          {
            name: "Warden",
            features: [
              {
                level: 2,
                name: "Guardian Tactics",
                description: "Block. Challenge. Grasp.",
                mechanics: [
                  {
                    kind: "resource_ability_menu",
                    resourceKey: "guardian_tactics",
                    waiveResourceCost: true,
                    menuAbilityNames: ["Block", "Challenge", "Grasp"],
                  },
                ],
              },
              {
                level: 9,
                name: "Survive",
                description:
                  "When you are reduced to 0 Hit Points, drop to 1 instead. Once per Long Rest.",
              },
            ],
          },
        ],
      } as ImportContent,
      new Set(["mhp_warden"]),
    )

    const tactics = content.classes?.[0]?.features?.find((f) => f.name === "Guardian Tactics") as
      | Feature
      | undefined
    expect(tactics?.activation?.bonusAction).toBe(true)
    const menu = chars(tactics).find((c) => c.type === "resource_ability_menu")
    expect(menu).toMatchObject({
      type: "resource_ability_menu",
      resourceKey: "guardian_tactics",
      waiveResourceCost: true,
    })
    if (menu?.type === "resource_ability_menu") {
      expect(menu.options?.map((o) => o.name)).toEqual([
        "Block",
        "Challenge",
        "Grasp",
        "Extended Tactics",
      ])
      expect(menu.options?.find((o) => o.name === "Extended Tactics")?.unlocksAtLevel).toBe(14)
      expect(menu.options?.find((o) => o.name === "Block")?.description).toMatch(/Bonus Action/)
    }

    const survive = content.classes?.[0]?.features?.find((f) => f.name === "Survive") as
      | Feature
      | undefined
    expect(survive?.limitedUses?.useShareKey).toBe("survive")
  })

  it("wires listed subclass features and preserves Grey Watchman subclass_name on battle_dice", () => {
    const content = applyImportEnrichmentPresets(
      {
        classes: [{ name: "Warden", features: [] }],
        subclasses: [
          {
            name: "Beastblood Guardian",
            class_name: "Warden",
            features: [
              {
                level: 3,
                name: "Roar",
                description:
                  "As a Bonus Action, you release a bellowing roar in a 5-foot Emanation.",
              },
            ],
          },
          {
            name: "Drake-Blooded",
            class_name: "Warden",
            features: [
              { level: 3, name: "Mortal Metamagic", description: "Hit Point Dice metamagic." },
              {
                level: 6,
                name: "Arcane Strike",
                description: "Replace one Attack with a Sorcerer cantrip.",
              },
              {
                level: 10,
                name: "Draconic Vengeance",
                description: "Reaction: expend a Hit Point Die for an emanation.",
              },
            ],
          },
          {
            name: "Godsworn",
            class_name: "Warden",
            features: [
              { level: 3, name: "Anointed Block", description: "When you use Block…" },
              {
                level: 10,
                name: "Selfless Survival",
                description: "Expend Survive for an ally.",
              },
            ],
          },
          {
            name: "Grey Watchman",
            class_name: "Warden",
            features: [
              {
                level: 3,
                name: "Battle Tactics",
                description: "Battle Dice fuel maneuvers.",
              },
              {
                level: 6,
                name: "Unyielding Surge",
                description: "When you become Bloodied, regain a Battle Die.",
              },
              {
                level: 10,
                name: "Hold the Line",
                description: "When you use Grasp…",
              },
            ],
          },
        ],
        import_proposals: {
          class_resources: [
            {
              proposal_id: "grey_watchman_battle_dice",
              class_name: "Warden",
              subclass_name: "Grey Watchman",
              resource_key: "battle_dice",
              name: "Battle Dice",
              definition: "Grey Watchman Battle Dice",
              uses: {
                type: "at_level",
                atLevelTable: [{ level: 3, count: 2 }],
                rechargeOnInitiative: true,
                recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
              },
            },
          ],
        },
      } as unknown as ImportContent,
      new Set(["mhp_warden"]),
    )

    const roar = content.subclasses
      ?.find((s) => s.name === "Beastblood Guardian")
      ?.features?.find((f) => f.name === "Roar") as Feature | undefined
    expect(roar?.activation?.bonusAction).toBe(true)
    expect(roar?.sheetDisplay?.combatActions).toBe(true)

    const metamagic = content.subclasses
      ?.find((s) => s.name === "Drake-Blooded")
      ?.features?.find((f) => f.name === "Mortal Metamagic") as Feature | undefined
    const metaMenu = chars(metamagic).find((c) => c.type === "resource_ability_menu")
    expect(metaMenu).toMatchObject({ type: "resource_ability_menu", waiveResourceCost: true })
    if (metaMenu?.type === "resource_ability_menu") {
      expect(metaMenu.options?.map((o) => o.name)).toEqual(["Empowered Spell", "Quickened Spell"])
      expect(metaMenu.options?.map((o) => o.hitDiceCost)).toEqual([1, 2])
    }

    const vengeance = content.subclasses
      ?.find((s) => s.name === "Drake-Blooded")
      ?.features?.find((f) => f.name === "Draconic Vengeance") as Feature | undefined
    expect(vengeance?.activation?.reaction).toBe(true)
    expect(vengeance?.activation?.spendHitDice).toBe(1)
    expect(chars(vengeance).some((c) => c.type === "special_attack")).toBe(true)

    const anointed = content.subclasses
      ?.find((s) => s.name === "Godsworn")
      ?.features?.find((f) => f.name === "Anointed Block") as Feature | undefined
    const anointedRider = chars(anointed).find((c) => c.type === "power_rider")
    expect(anointedRider).toMatchObject({
      type: "power_rider",
      parentPowerNames: ["Guardian Tactics"],
      parentMenuOptionNames: ["Block"],
    })

    const selfless = content.subclasses
      ?.find((s) => s.name === "Godsworn")
      ?.features?.find((f) => f.name === "Selfless Survival") as Feature | undefined
    expect(selfless?.limitedUses?.useShareKey).toBe("survive")
    expect(selfless?.activation?.existingClassFeatureName).toBe("Survive")

    const hold = content.subclasses
      ?.find((s) => s.name === "Grey Watchman")
      ?.features?.find((f) => f.name === "Hold the Line") as Feature | undefined
    const holdRider = chars(hold).find((c) => c.type === "power_rider")
    expect(holdRider).toMatchObject({
      type: "power_rider",
      parentPowerNames: ["Guardian Tactics"],
      parentMenuOptionNames: ["Grasp"],
    })

    const battle = content.subclasses
      ?.find((s) => s.name === "Grey Watchman")
      ?.features?.find((f) => f.name === "Battle Tactics") as Feature | undefined
    expect(battle?.choices?.optionsSource).toBe("class_knacks")

    const surge = content.subclasses
      ?.find((s) => s.name === "Grey Watchman")
      ?.features?.find((f) => f.name === "Unyielding Surge") as Feature | undefined
    expect(surge?.limitedUses?.rechargeOnInitiative).toBe(true)

    const proposals = collectImportProposals(content)
    const applied = applyProposalSelections(content, proposals, {
      classResourceIds: proposals.classResources.map((r) => r.id),
      customAbilityIds: [],
    })
    expect(applied.class_resources?.[0]).toMatchObject({
      resource_key: "battle_dice",
      subclass_name: "Grey Watchman",
    })
  })

  it("wires Nightgaunt / Stoneheart / Storm / Verdant riders and Earthshatter", () => {
    const content = applyImportEnrichmentPresets(
      {
        classes: [{ name: "Warden", features: [] }],
        subclasses: [
          {
            name: "Nightgaunt",
            class_name: "Warden",
            features: [
              { level: 3, name: "Death's Gambit", description: "When you deal damage…" },
              { level: 10, name: "Undying", description: "Survive three times…" },
            ],
          },
          {
            name: "Stoneheart",
            class_name: "Warden",
            features: [
              { level: 3, name: "Stonewall", description: "When you use Block…" },
              { level: 3, name: "Earthshatter", description: "Replace one Attack…" },
              { level: 10, name: "Legendary Interruption", description: "Legendary Action…" },
            ],
          },
          {
            name: "Storm Sentinel",
            class_name: "Warden",
            features: [{ level: 3, name: "Thunderblast", description: "When you use Grasp…" }],
          },
          {
            name: "Verdant Guardian",
            class_name: "Warden",
            features: [
              { level: 3, name: "Grasping Vines", description: "Grasp Emanation…" },
              { level: 10, name: "Verdant Resilience", description: "When you use Survive…" },
            ],
          },
        ],
      } as unknown as ImportContent,
      new Set(["mhp_warden"]),
    )

    const deaths = content.subclasses
      ?.find((s) => s.name === "Nightgaunt")
      ?.features?.find((f) => f.name === "Death's Gambit") as Feature | undefined
    expect(chars(deaths).find((c) => c.type === "power_rider")).toMatchObject({
      parentMenuOptionNames: ["Challenge"],
    })

    const undying = content.subclasses
      ?.find((s) => s.name === "Nightgaunt")
      ?.features?.find((f) => f.name === "Undying") as Feature | undefined
    expect(undying?.limitedUses).toMatchObject({ fixedAmount: 3, useShareKey: "survive" })

    const earth = content.subclasses
      ?.find((s) => s.name === "Stoneheart")
      ?.features?.find((f) => f.name === "Earthshatter") as Feature | undefined
    expect(earth?.activation?.action).toBe(true)
    expect(earth?.sheetDisplay?.combatActions).toBe(true)
    expect(chars(earth).some((c) => c.type === "special_attack")).toBe(true)

    const legend = content.subclasses
      ?.find((s) => s.name === "Stoneheart")
      ?.features?.find((f) => f.name === "Legendary Interruption") as Feature | undefined
    expect(chars(legend).find((c) => c.type === "power_rider")).toMatchObject({
      parentPowerNames: ["Interrupt"],
    })

    const vines = content.subclasses
      ?.find((s) => s.name === "Verdant Guardian")
      ?.features?.find((f) => f.name === "Grasping Vines") as Feature | undefined
    expect(chars(vines).find((c) => c.type === "power_rider")).toMatchObject({
      parentMenuOptionNames: ["Grasp"],
    })
  })

  it("surfaces Interrupt and Roar on the combat actions panel", () => {
    const content = applyImportEnrichmentPresets(
      {
        classes: [
          {
            name: "Warden",
            features: [
              {
                level: 5,
                name: "Interrupt",
                description: "You can take a Reaction to interrupt.",
              },
            ],
          },
        ],
        subclasses: [
          {
            name: "Beastblood Guardian",
            class_name: "Warden",
            features: [
              {
                level: 3,
                name: "Roar",
                description: "As a Bonus Action, you roar.",
              },
            ],
          },
        ],
      } as unknown as ImportContent,
      new Set(["mhp_warden"]),
    )

    const classFeatures = (content.classes?.[0]?.features ?? []) as Feature[]
    const subclassFeatures = (content.subclasses?.[0]?.features ?? []) as Feature[]
    const actions = collectSheetActions({
      classDetails: [
        {
          row: {
            class_id: "w1",
            level: 5,
            subclass_id: "s1",
            order: 0,
          },
          class: {
            id: "w1",
            name: "Warden",
            features: classFeatures,
          } as never,
          subclass: {
            id: "s1",
            name: "Beastblood Guardian",
            features: subclassFeatures,
          } as never,
        },
      ],
      species: null,
    })

    expect(actions.find((a) => a.name === "Interrupt")?.kinds).toEqual(["reaction"])
    expect(actions.find((a) => a.name === "Interrupt")?.category).toBe("combat")
    expect(actions.find((a) => a.name === "Roar")?.kinds).toEqual(["bonus"])
    expect(actions.find((a) => a.name === "Roar")?.category).toBe("combat")
  })

  it("surfaces Survive on the combat panel and scales Earthshatter at 14", () => {
    const content = applyImportEnrichmentPresets(
      {
        classes: [
          {
            name: "Warden",
            features: [
              {
                level: 1,
                name: "Guardian Tactics",
                description: "As a Bonus Action, choose Block, Challenge, or Grasp.",
              },
              {
                level: 9,
                name: "Survive",
                description: "When you drop to 0 Hit Points…",
              },
            ],
          },
        ],
        subclasses: [
          {
            name: "Stoneheart Defender",
            class_name: "Warden",
            features: [
              {
                level: 3,
                name: "Earthshatter",
                description: "Replace one Attack with a slam.",
              },
              {
                level: 3,
                name: "Grasping Vines",
                description: "Grasp Emanation increases.",
              },
            ],
          },
        ],
      } as unknown as ImportContent,
      new Set(["mhp_warden"]),
    )

    const classFeatures = (content.classes?.[0]?.features ?? []) as Feature[]
    const subclassFeatures = (content.subclasses?.[0]?.features ?? []) as Feature[]

    const at3 = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "w1", level: 3, subclass_id: "s1", order: 0 },
          class: { id: "w1", name: "Warden", hit_die: 10, features: classFeatures } as never,
          subclass: {
            id: "s1",
            name: "Stoneheart Defender",
            features: subclassFeatures,
          } as never,
        },
      ],
      species: null,
    })
    // Survive is level 9 — not on the sheet at level 3
    expect(at3.find((a) => a.name === "Survive")).toBeUndefined()
    expect(at3.find((a) => a.name === "Earthshatter")?.specialAttack?.areaLengthFeet).toBe(5)

    const at14 = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "w1", level: 14, subclass_id: "s1", order: 0 },
          class: { id: "w1", name: "Warden", hit_die: 10, features: classFeatures } as never,
          subclass: {
            id: "s1",
            name: "Stoneheart Defender",
            features: subclassFeatures,
          } as never,
        },
      ],
      species: null,
    })
    expect(at14.find((a) => a.name === "Survive")?.kinds).toEqual(["reaction"])
    expect(at14.find((a) => a.name === "Survive")?.category).toBe("combat")
    expect(at14.find((a) => a.name === "Earthshatter")?.specialAttack?.areaLengthFeet).toBe(10)
    expect(
      at14
        .find((a) => a.name === "Guardian Tactics")
        ?.relatedTalentAlerts?.find((alert) => /grasping vines/i.test(alert.name))?.summary,
    ).toMatch(/15 feet/)
  })
})
