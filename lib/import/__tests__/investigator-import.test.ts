import { describe, expect, it } from "vitest"
import {
  applyActivationUsesSpend,
  canSpendActivationUses,
  readActivationUsesFromEquipment,
} from "@/lib/character/magic-item-activation"
import { collectMagicItemPowers } from "@/lib/character/magic-item-powers"
import { onHitTriggerMatchesTarget, targetConditionMatches } from "@/lib/compendium/characteristic-modifiers"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import { fxInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
import { enrichImportedClassList } from "@/lib/import/enrich-import-classes"
import { enrichInvestigatorFeatures } from "@/lib/import/enrichment-presets"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { detectSpellcastingAbilityFromText } from "@/lib/import/detect-governing-ability"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Equipment, Feature } from "@/lib/types"

const trinketItem = {
  id: "amulet-1",
  name: "Amulet of Warding",
  category: "Adventuring Gear",
  subcategory: null,
  description: "Test trinket",
  cost: null,
  weight: null,
  properties: null,
  icon: null,
  source: "Investigator",
  creator_url: null,
  created_at: "",
  magic_item_category: "Wondrous Item",
  rarity: "Uncommon",
  requires_attunement: true,
  magic_effects: [
    usesInstance(createModifierInstanceId(), {
      type: "class_resource",
      classResourceKey: "trinkets",
      classResourceAmount: 1,
    }),
    fxInstance("modinst_amulet", "cat_fx_boost_ac", {
      bonusAction: true,
      effects: [{ id: modId("amulet"), kind: "boost_ac", label: "Ward" }],
    }),
  ],
}

describe("Investigator trinket magic items", () => {
  it("wires imported holy trinkets by name without inventing item prose", () => {
    const enriched = enrichImportContentModifiers({
      classes: [
        {
          name: "Investigator",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [],
        },
      ],
      equipment: [
        {
          name: "Amulet of Warding",
          category: "Adventuring Gear",
          subcategory: null,
          description: "User-sourced item text from the PDF.",
          cost: null,
        },
      ],
    } as ImportContent)
    expect(enriched.equipment).toHaveLength(1)
    const amulet = enriched.equipment?.[0]
    expect(amulet?.description).toBe("User-sourced item text from the PDF.")
    const uses = readActivationUsesFromEquipment(amulet as Equipment)
    expect(uses).toMatchObject({
      type: "class_resource",
      classResourceKey: "trinkets",
      classResourceAmount: 1,
    })
  })

  it("does not invent Investigator trinkets for unrelated imports", () => {
    const enriched = enrichImportContentModifiers({
      abilities: [
        {
          name: "Enhancement Discipline",
          description: "Psionic discipline",
          source_type: "class",
          source_name: "Psion",
          level_requirement: 1,
        },
      ],
      class_resources: [
        {
          class_name: "Psion",
          resource_key: "psi_points",
          name: "Psi Points",
          description: null,
        },
      ],
    } as ImportContent)
    expect(enriched.equipment ?? []).toEqual([])
  })

  it("does not invent holy trinkets from class-only Investigator imports", () => {
    const enriched = enrichInvestigatorFeatures({
      classes: [
        {
          name: "Investigator",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [],
        },
      ],
    } as ImportContent)
    expect(enriched.equipment ?? []).toEqual([])
  })

  it("activating a trinket debits the shared Trinkets pool", () => {
    const resourceEntries = [
      { id: "class-1_trinkets", name: "Trinkets", uses: { type: "at_level" as const, atLevelTable: [{ level: 3, count: 2 }] }, classLevel: 7 },
    ]
    const uses = readActivationUsesFromEquipment(trinketItem)!
    expect(
      canSpendActivationUses({
        uses,
        resourceEntries,
        usedResourcesById: { "class-1_trinkets": 1 },
        resolveContext: {},
        classDetails: [{ row: { class_id: "class-1", level: 7, order: 0 }, class: { id: "class-1", name: "Investigator" } as never }],
      }),
    ).toBe(true)

    const next = applyActivationUsesSpend({
      uses,
      resourceEntries,
      usedResourcesById: { "class-1_trinkets": 0 },
      classDetails: [{ row: { class_id: "class-1", level: 7, order: 0 }, class: { id: "class-1", name: "Investigator" } as never }],
    })
    expect(next?.["class-1_trinkets"]).toBe(1)

    expect(
      canSpendActivationUses({
        uses,
        resourceEntries,
        usedResourcesById: { "class-1_trinkets": 2 },
        resolveContext: {},
        classDetails: [{ row: { class_id: "class-1", level: 7, order: 0 }, class: { id: "class-1", name: "Investigator" } as never }],
      }),
    ).toBe(false)
  })

  it("surfaces activatable magic item powers", () => {
    const powers = collectMagicItemPowers({
      equipment: [trinketItem],
      equippedArmorId: null,
      equippedShieldId: null,
      equippedWeaponId: null,
      attunedItemIds: ["amulet-1"],
      modifierCatalog: [],
    })
    expect(powers.some((row) => row.kind === "activation")).toBe(true)
    expect(powers.find((row) => row.kind === "activation")?.activationUses?.classResourceKey).toBe("trinkets")
  })
})

describe("Investigator Finisher", () => {
  it("wires Bloodied-gated on_hit_trigger with scaling damage", () => {
    const enriched = enrichInvestigatorFeatures({
      classes: [
        {
          name: "Investigator",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [{ level: 2, name: "Finisher", description: "Bloodied extra damage." }],
        },
      ],
    } as unknown as import("@/lib/import/content-schema").ImportContent)
    const finisher = enriched.classes?.[0]?.features?.[0] as Feature
    const trigger = (finisher.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "on_hit_trigger")
    expect(trigger?.onlyIfTargetBelowHalfHp).toBe(true)
    expect(trigger?.oncePerTurn).toBe(true)
  })

  it("matches target HP and size conditions", () => {
    expect(
      targetConditionMatches(
        { onlyIfTargetBelowHalfHp: true },
        { targetBelowHalfHp: true, targetSize: "Medium" },
      ),
    ).toBe(true)
    expect(
      targetConditionMatches(
        { onlyIfTargetBelowHalfHp: true },
        { targetBelowHalfHp: false },
      ),
    ).toBe(false)
    expect(
      onHitTriggerMatchesTarget(
        { type: "on_hit_trigger", onlyIfTargetMinSize: "Large" } as unknown as import("@/lib/compendium/characteristic-modifiers").OnHitTriggerCharacteristic,
        { targetSize: "Large" },
      ),
    ).toBe(true)
    expect(
      onHitTriggerMatchesTarget(
        { type: "on_hit_trigger", onlyIfTargetMinSize: "Large" } as unknown as import("@/lib/compendium/characteristic-modifiers").OnHitTriggerCharacteristic,
        { targetSize: "Medium" },
      ),
    ).toBe(false)
  })
})

describe("Investigator governing ability", () => {
  it("detects Intelligence spellcasting from Ritualist prose", () => {
    expect(
      detectSpellcastingAbilityFromText(
        "Intelligence is your spellcasting ability for your Investigator spells.",
      ),
    ).toBe("Intelligence")
  })

  it("populates spellcasting.ability on class import enrich", () => {
    const [row] = enrichImportedClassList(
      [
        {
          name: "Investigator",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [
            {
              level: 1,
              name: "Ritualist",
              description:
                "Intelligence is your spellcasting ability for your Investigator spells.",
            },
          ],
        },
      ],
      undefined,
    )
    expect(row.spellcasting).toMatchObject({ ability: "Intelligence" })
  })
})

describe("Investigator import integration", () => {
  it("clears Holy Trinkets feature-level pool in favor of item activations", () => {
    const content = enrichImportContentModifiers({
      classes: [
        {
          name: "Investigator",
          description: "",
          hit_die: 8,
          primary_ability: ["Intelligence"],
          features: [
            {
              level: 7,
              name: "Holy Trinkets",
              description: "You can use the following trinkets (expending a use of your Trinkets to do so).",
            },
          ],
        },
      ],
    } as unknown as import("@/lib/import/content-schema").ImportContent)
    const holy = content.classes?.[0]?.features?.find((f) => f.name === "Holy Trinkets") as unknown as Feature | undefined
    expect(holy?.limitedUses).toBeUndefined()
    expect(content.equipment ?? []).toEqual([])
  })
})
