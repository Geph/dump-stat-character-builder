import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { planEquipmentGrants } from "@/lib/character/granted-equipment"
import { collectSheetActions, inferActivatableActionKinds } from "@/lib/character/sheet-actions"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { grantsExtraWeaponAttack } from "@/lib/character/weapon-attack-actions"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import {
  parseTrinketEntries,
  sanitizeInvestigatorImportContent,
  trinketCastingTime,
} from "@/lib/import/enrichment-presets/packs/investigator"
import type { ImportContent } from "@/lib/import/content-schema"
import { resolveFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import type { Equipment, Feature } from "@/lib/types"
import type { SheetActionEntry } from "@/lib/character/sheet-actions"

function loadInvestigatorSeed(): ImportContent {
  return JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        "lib",
        "seed-packs",
        "mage-hand-press",
        "magehandpress-investigator-class.json",
      ),
      "utf8",
    ),
  ) as ImportContent
}

function trinketFeature(content: ImportContent, subclassName: string): Feature | undefined {
  const subclass = content.subclasses?.find((entry) => entry.name === subclassName)
  return subclass?.features?.find((feature) => /^trinkets$/i.test(feature.name ?? "")) as
    | Feature
    | undefined
}

describe("trinket prose parsing", () => {
  it("splits a Trinkets feature into one entry per bolded trinket", () => {
    const entries = parseTrinketEntries(
      "<p>You can use the following trinkets.</p>" +
        "<p><strong>Fogstone Periapt.</strong> You can cast Misty Step without a spell slot.</p>" +
        "<p><strong>Glass Medallion.</strong> As a Bonus Action, you can cast Invisibility on yourself.</p>",
    )
    expect(entries.map((entry) => entry.name)).toEqual(["Fogstone Periapt", "Glass Medallion"])
    expect(entries[0]?.description).toBe("You can cast Misty Step without a spell slot.")
  })

  it("ignores the lead-in paragraph and repeated names", () => {
    const entries = parseTrinketEntries(
      "<p>You can use the following trinkets.</p>" +
        "<p><strong>Tongue Stone.</strong> First text.</p>" +
        "<p><strong>Tongue Stone.</strong> Duplicate text.</p>",
    )
    expect(entries).toHaveLength(1)
  })
})

describe("trinket action cost", () => {
  it("uses a stated Bonus Action", () => {
    expect(trinketCastingTime("As a Bonus Action, you can cast Knock without a spell slot.")).toBe(
      "1 bonus action",
    )
  })

  it("falls back to the casting time of the spell the trinket grants", () => {
    // Misty Step is a Bonus Action spell even though the trinket text states no cost.
    expect(trinketCastingTime("You can cast Misty Step without a spell slot or components.")).toBe(
      "Bonus Action",
    )
    expect(
      trinketCastingTime("You can cast Detect Evil and Good without a spell slot or components."),
    ).toBe("Action")
  })

  it("returns null rather than inventing a cost", () => {
    expect(trinketCastingTime("You always know which way is north.")).toBeNull()
  })
})

describe("Investigator subclass trinkets", () => {
  const sanitized = sanitizeInvestigatorImportContent(loadInvestigatorSeed())

  it("adds each subclass trinket to the inventory as a magic item", () => {
    const byName = new Map((sanitized.equipment ?? []).map((row) => [row.name, row]))
    for (const name of ["Fogstone Periapt", "Gilded Dragon Scale", "Engraved Lens"]) {
      const row = byName.get(name)
      expect(row, `${name} should be an equipment row`).toBeTruthy()
      expect(row?.magic_item_category).toBe("Wondrous Item")
      expect(row?.description).toBeTruthy()
    }
  })

  it("keeps authored Holy Trinket equipment rows untouched", () => {
    const amulet = (sanitized.equipment ?? []).filter((row) => row.name === "Amulet of Warding")
    expect(amulet).toHaveLength(1)
    expect(amulet[0]?.rarity).toBe("Uncommon")
  })

  it("gives every trinket its own ability that spends the Trinkets pool", () => {
    const abilities = sanitized.import_proposals?.custom_abilities ?? []
    const skeletonKey = abilities.find((ability) => ability.name === "Skeleton's Key")
    expect(skeletonKey?.source_type).toBe("subclass")
    expect(skeletonKey?.source_name).toBe("Detective")
    expect(skeletonKey?.ability_role).toBe("upgrade")
    expect((skeletonKey as unknown as { uses?: unknown })?.uses).toMatchObject({
      type: "class_resource",
      classResourceKey: "trinkets",
      classResourceAmount: 1,
    })
  })

  it("emits one ability per trinket, never a duplicate", () => {
    const names = (sanitized.import_proposals?.custom_abilities ?? []).map((a) => a.name)
    expect(names.length).toBe(new Set(names).size)
  })

  it("auto-grants the subclass trinkets from the Trinkets feature", () => {
    const feature = trinketFeature(sanitized, "Occultist")
    const grant = (feature?.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "grant_custom_ability") as { abilityNames?: string[] } | undefined
    expect(grant?.abilityNames).toEqual(
      expect.arrayContaining(["Cold Iron Pendant", "Dead Mist Vial", "Engraved Lens"]),
    )
  })

  it("also grants the trinkets as inventory items", () => {
    const feature = trinketFeature(sanitized, "Detective")
    const grant = (feature?.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "grant_equipment") as { equipmentNames?: string[] } | undefined
    expect(grant?.equipmentNames).toEqual(
      expect.arrayContaining(["Fogstone Periapt", "Glass Medallion", "Skeleton's Key"]),
    )
  })

  it("resolves the item grant against the equipment rows it emitted", () => {
    const detective = trinketFeature(sanitized, "Detective")
    const grants = aggregateCharacteristics(
      (detective?.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? []),
    ).grantedEquipment
    const catalog = (sanitized.equipment ?? []).map(
      (row, index) => ({ ...row, id: `eq-${index}` }) as unknown as Equipment,
    )
    const plan = planEquipmentGrants({
      grants,
      catalog,
      equipmentIds: [],
      quantities: {},
      alreadyGrantedNames: [],
    })
    expect(plan?.unresolvedNames).toEqual([])
    expect(plan?.addedItems.map((entry) => entry.name).sort()).toEqual([
      "Fogstone Periapt",
      "Glass Medallion",
      "Skeleton's Key",
    ])
  })

  it("leaves the umbrella Trinkets features on the Features tab only", () => {
    for (const subclassName of ["Detective", "Exterminator", "Occultist"]) {
      const feature = trinketFeature(sanitized, subclassName)
      expect(feature, `${subclassName} Trinkets feature`).toBeTruthy()
      const display = resolveFeatureSheetDisplay(feature as Feature)
      expect(display).toMatchObject({
        featuresTab: true,
        combatActions: false,
        abilitiesActions: false,
      })
    }
    const holy = sanitized.classes?.[0]?.features?.find((f) =>
      /^holy trinkets$/i.test(f.name ?? ""),
    ) as Feature | undefined
    expect(resolveFeatureSheetDisplay(holy as Feature).combatActions).toBe(false)
  })
})

describe("Rushed Incantation", () => {
  it("always costs a Bonus Action despite the action-or-Bonus-Action wording", () => {
    const enriched = applyImportEnrichmentPresets(loadInvestigatorSeed())
    const rushed = enriched.classes?.[0]?.features?.find(
      (feature) => feature.name === "Rushed Incantation",
    ) as Feature | undefined
    expect(rushed?.activation).toMatchObject({ bonusAction: true })
    expect(rushed?.description).toMatch(/casting time of an action or Bonus Action/i)
    expect(inferActivatableActionKinds(rushed as Feature)).toEqual(["bonus"])
  })

  it("still spends the Rushed Incantation pool", () => {
    const enriched = applyImportEnrichmentPresets(loadInvestigatorSeed())
    const rushed = enriched.classes?.[0]?.features?.find(
      (feature) => feature.name === "Rushed Incantation",
    ) as Feature | undefined
    expect(rushed?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "rushed_incantation",
    })
  })
})

function action(name: string, description: string): SheetActionEntry {
  return {
    id: `ability:${name}`,
    name,
    sourceLabel: "Test",
    kinds: ["bonus"],
    category: "combat",
    limitedUses: null,
    classLevel: 6,
    description,
  }
}

describe("extra attack grants belong with weapon attacks", () => {
  it("routes the seed's Monster Slayer feature out of the generic bonus action column", () => {
    const seed = loadInvestigatorSeed()
    const exterminator = seed.subclasses?.find((entry) => entry.name === "Exterminator")
    const monsterSlayer = exterminator?.features?.find(
      (feature) => feature.name === "Monster Slayer",
    ) as Feature | undefined
    expect(monsterSlayer).toBeTruthy()

    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "class-1", level: 6, subclass_id: "sub-1", order: 0 },
          class: { id: "class-1", name: "Investigator", features: [] } as unknown as CharacterClassDetail["class"],
          subclass: {
            id: "sub-1",
            name: "Exterminator",
            features: [monsterSlayer],
          } as unknown as CharacterClassDetail["subclass"],
        },
      ],
      species: null,
    })
    const entry = actions.find((candidate) => candidate.name === "Monster Slayer")
    expect(entry?.kinds).toEqual(["bonus"])
    expect(entry?.category).toBe("combat")
    expect(grantsExtraWeaponAttack(entry as SheetActionEntry)).toBe(true)
  })

  it("detects Monster Slayer", () => {
    expect(
      grantsExtraWeaponAttack(
        action(
          "Monster Slayer",
          "<p>As a Bonus Action, you can make one attack with a weapon or an Unarmed Strike.</p>",
        ),
      ),
    ).toBe(true)
  })

  it("ignores riders that only add damage to an attack you already made", () => {
    expect(
      grantsExtraWeaponAttack(
        action(
          "Mimic-Tooth Necklace",
          "When you hit a creature with an attack using a weapon, you can take a Bonus Action to deal an extra 2d8 Acid damage.",
        ),
      ),
    ).toBe(false)
  })

  it("ignores unrelated bonus actions and spell attacks", () => {
    expect(
      grantsExtraWeaponAttack(
        action("Glass Medallion", "As a Bonus Action, you can cast Invisibility on yourself."),
      ),
    ).toBe(false)
    expect(
      grantsExtraWeaponAttack(
        action("Arcane Volley", "You can make one attack with a spell attack against each target."),
      ),
    ).toBe(false)
  })
})
