import { describe, expect, it } from "vitest"
import { knackAbilitiesForClass } from "@/lib/builder/knack-choices"
import { ownedEquipmentQuantity } from "@/lib/character/equipment-quantities"
import { resolvePackageEquipment } from "@/lib/builder/equipment-utils"
import { collectUnmatchedStartingEquipmentNames } from "@/lib/import/collect-unmatched-starting-equipment"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import {
  GUNSLINGER_BASE_MANEUVERS,
  sanitizeGunslingerImportContent,
} from "@/lib/import/enrichment-presets/packs/gunslinger"
import { usesConfigForProgressionColumn } from "@/lib/import/parse-class-progression-table"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility, Equipment, Feature } from "@/lib/types"
import gunslingerSeed from "@/lib/seed-packs/mage-hand-press/magehandpress-gunslinger-class.json"
import equipmentSeed from "@/lib/srd/seed-data/equipment.json"

describe("Gunslinger enrichment", () => {
  it("grants base Risk maneuvers and strips early initiative recharge", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Gunslinger",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [
            {
              level: 2,
              name: "Risk",
              description: "You have Risk Dice and know Maneuver Options.",
            },
            {
              level: 15,
              name: "Dire Gambit",
              description: "Regain one Risk Die on Initiative.",
            },
            {
              level: 20,
              name: "Headshot",
              description: "Critical Headshot once per rest.",
            },
          ],
        },
      ],
      class_resources: [
        {
          class_name: "Gunslinger",
          resource_key: "risk_dice",
          name: "Risk Dice",
          uses: {
            type: "at_level",
            atLevelMode: "tier",
            atLevelTable: [{ level: 2, count: 4 }],
            recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
            // Incorrect early initiative refill from LLM — Dire Gambit is present so keep/set to 1.
            rechargeOnInitiative: true,
          },
        },
      ],
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "bite",
            name: "Bite the Bullet",
            ability_role: "knack",
            definition: "Base",
            description: "Expend one Risk Die.",
            source_type: "class",
            source_name: "Gunslinger",
            eligible_classes: ["Gunslinger"],
          },
          {
            proposal_id: "bolster",
            name: "Bolster",
            ability_role: "knack",
            definition: "Captain only",
            description: "Battle Die.",
            source_type: "compendium",
            source_name: null,
            eligible_classes: ["Captain", "Vagabond"],
          },
        ],
      },
    } as unknown as ImportContent)

    const risk = enriched.classes?.[0]?.features?.find((f) => f.name === "Risk") as Feature
    const grant = (risk.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "grant_custom_ability")
    expect(grant).toMatchObject({
      type: "grant_custom_ability",
      abilityNames: [...GUNSLINGER_BASE_MANEUVERS],
    })
    expect(enriched.classes?.[0]?.special_ability).toMatchObject({
      save_dc_ability: "dexterity",
      label: "Maneuver save DC",
    })

    expect(
      (enriched.class_resources?.[0]?.uses as { rechargeOnInitiative?: boolean | number })
        ?.rechargeOnInitiative,
    ).toBeUndefined()

    const dire = enriched.classes?.[0]?.features?.find((f) => f.name === "Dire Gambit") as Feature
    const direRefresh = (dire.linkedModifiers ?? []).flatMap(
      (mod) => mod.activation?.effects ?? [],
    ).find((effect) => effect.resourceRefreshOnInitiative)
    expect(direRefresh).toMatchObject({
      classResourceKey: "risk_dice",
      classResourceAmount: 1,
      resourceRefreshOnInitiative: true,
    })

    const names = enriched.import_proposals?.custom_abilities?.map((a) => a.name) ?? []
    expect(names).toContain("Skin of Your Teeth")
    expect(names).not.toContain("Bolster")
    expect(names).toContain("Bite the Bullet")

    const headshot = enriched.classes?.[0]?.features?.find((f) => f.name === "Headshot") as Feature
    expect(headshot.limitedUses).toMatchObject({
      type: "fixed",
      fixedAmount: 1,
      restoreByResource: { resourceKey: "risk_dice", resourceAmount: 3, restores: 1 },
    })
  })

  it("wires Overkill to add ability modifier or extra 1d8 on ranged damage", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Gunslinger",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [
            {
              level: 11,
              name: "Overkill",
              description:
                "When you deal damage with a Ranged weapon that doesn't add your ability modifier to the roll, you add your ability modifier nonetheless.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const overkill = enriched.classes?.[0]?.features?.find((f) => f.name === "Overkill") as Feature
    const damage = (overkill.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "damage_roll_modifiers")
    expect(damage).toMatchObject({
      type: "damage_roll_modifiers",
      entries: [
        {
          target: "ranged",
          grantAbilityModifierWhenMissing: true,
          bonusDiceWhenModifierIncluded: "1d8",
          bonusDiceUsesWeaponDamageType: true,
        },
      ],
    })
  })

  it("strips rechargeOnInitiative when Dire Gambit is absent", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Gunslinger",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [{ level: 2, name: "Risk", description: "Risk Dice." }],
        },
      ],
      class_resources: [
        {
          class_name: "Gunslinger",
          resource_key: "risk_dice",
          name: "Risk Dice",
          uses: {
            type: "at_level",
            atLevelMode: "tier",
            atLevelTable: [{ level: 2, count: 4 }],
            rechargeOnInitiative: 1,
          },
        },
      ],
    } as unknown as ImportContent)

    expect(
      (enriched.class_resources?.[0]?.uses as { rechargeOnInitiative?: boolean | number })
        ?.rechargeOnInitiative,
    ).toBeUndefined()
  })

  it("wires Gun Tank / Trick Shot / White Hat subclass passives", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Gun Tank",
          class_name: "Gunslinger",
          description: null,
          features: [
            {
              level: 3,
              name: "Heavy Gunner",
              description: "Medium and Heavy armor. Strength for ranged.",
            },
            {
              level: 3,
              name: "Walking Turret",
              description: "Mounted Arsenal while holding a Ranged weapon whose mastery you can use.",
            },
            {
              level: 6,
              name: "Lightning Disarm [Maneuver]",
              description: "Expend one Risk Die as a Bonus Action.",
            },
            {
              level: 14,
              name: "Flash Assault",
              description: "Once per rest or expend two Risk Dice.",
            },
          ],
        },
        {
          name: "Trick Shot",
          class_name: "Gunslinger",
          description: null,
          features: [
            {
              level: 3,
              name: "Creative Trajectory",
              description: "Ignore Half Cover and Three-Quarters Cover.",
            },
          ],
        },
        {
          name: "White Hat",
          class_name: "Gunslinger",
          description: null,
          features: [
            {
              level: 3,
              name: "Steely-Eyed Aura",
              description: "Advantage on saves vs Frightened.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const heavy = enriched.subclasses?.[0]?.features?.[0] as Feature
    const chars = (heavy.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? [])
    expect(chars.some((c) => c.type === "armor_proficiencies")).toBe(true)
    const armor = chars.find((c) => c.type === "armor_proficiencies") as { values?: string[] }
    expect(armor.values).toEqual(expect.arrayContaining(["Medium Armor", "Heavy Armor"]))
    const override = chars.find((c) => c.type === "weapon_ability_override") as {
      ability?: string
      appliesTo?: string
      scope?: string
    }
    expect(override).toMatchObject({ ability: "strength", appliesTo: "both", scope: "ranged" })

    const turret = enriched.subclasses?.[0]?.features?.[1] as Feature
    expect(turret.description).toMatch(/Move While Mounted/)

    const lightning = enriched.subclasses?.[0]?.features?.[2] as Feature
    expect(lightning.sheetDisplay?.combatActions).toBe(true)

    const flash = enriched.subclasses?.[0]?.features?.[3] as Feature
    expect(flash.limitedUses?.restoreByResource).toMatchObject({
      resourceKey: "risk_dice",
      resourceAmount: 2,
    })

    const cover = (enriched.subclasses?.[1]?.features?.[0] as Feature).linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "attack_roll_modifiers")
    expect(cover).toMatchObject({
      type: "attack_roll_modifiers",
    })

    const aura = enriched.subclasses?.[2]?.features?.[0] as Feature
    expect(
      aura.linkedModifiers?.some((m) => (m.activation?.effects?.length ?? 0) > 0),
    ).toBe(true)
  })

  it("keeps dieSidesByLevel on Risk Dice table parse", () => {
    const uses = usesConfigForProgressionColumn(
      {
        header: "Risk Dice",
        resourceKey: "risk_dice",
        resourceName: "Risk Dice",
        valuesByLevel: [
          { level: 2, count: 4 },
          { level: 6, count: 5 },
        ],
        dieSidesByLevel: [
          { level: 2, count: 8 },
          { level: 10, count: 10 },
          { level: 18, count: 12 },
        ],
      },
      "Gunslinger",
    )
    expect(uses.dieSidesByLevel).toEqual([
      { level: 2, count: 8 },
      { level: 10, count: 10 },
      { level: 18, count: 12 },
    ])
  })

  it("includes subclass-attached knacks when aggregating", () => {
    const abilities = [
      {
        id: "1",
        name: "Fan the Hammer",
        ability_role: "knack",
        attached_to_type: "subclass",
        attached_to_id: "Pistolero",
        description: "",
      },
      {
        id: "2",
        name: "Bite the Bullet",
        ability_role: "knack",
        attached_to_type: "class",
        attached_to_id: "Gunslinger",
        description: "",
      },
    ] as CustomAbility[]

    expect(knackAbilitiesForClass(abilities, ["Gunslinger"]).map((a) => a.name)).toEqual([
      "Bite the Bullet",
    ])
    expect(
      knackAbilitiesForClass(abilities, ["Gunslinger"], { subclassName: "Pistolero" }).map(
        (a) => a.name,
      ),
    ).toEqual(["Fan the Hammer", "Bite the Bullet"])
  })

  it("sanitize injects Skin of Your Teeth when missing", () => {
    const next = sanitizeGunslingerImportContent({
      classes: [{ name: "Gunslinger", description: "", hit_die: 8, features: [] }],
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "bite",
            name: "Bite the Bullet",
            ability_role: "knack",
            definition: "Base",
            description: "x",
            eligible_classes: ["Gunslinger"],
            source_type: "class",
            source_name: "Gunslinger",
          },
        ],
      },
    } as unknown as ImportContent)

    expect(
      next.import_proposals?.custom_abilities?.some((a) => a.name === "Skin of Your Teeth"),
    ).toBe(true)
  })

  it("ships Revolver as a catalog equipment row so starting gear is not flagged", () => {
    const content = gunslingerSeed as ImportContent
    const revolver = content.equipment?.find((item) => item.name === "Revolver")
    expect(revolver).toMatchObject({
      category: "Weapon",
      subcategory: "Martial Ranged Weapons",
      weight: 3,
      cost: { amount: 125, unit: "GP" },
    })
    const props = revolver?.properties as {
      damage?: string
      mastery?: string
      properties?: string[]
    }
    expect(props.damage).toBe("2d6 Piercing")
    expect(props.mastery).toBe("Slow")
    expect(props.properties).toEqual(
      expect.arrayContaining([
        "Ammunition (Range 30/120; Bullet)",
        "Firearm",
        "Recoil",
        "Reload (6)",
      ]),
    )
    const packageA = content.classes?.[0]?.starting_equipment_groups?.[0]?.options.find(
      (option) => option.label === "A",
    )
    expect(packageA?.items.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Revolver", "Bullets, Firearm"]),
    )
    expect(collectUnmatchedStartingEquipmentNames(content).map((row) => row.name)).not.toContain(
      "Revolver",
    )
  })

  it("resolves Revolver and firearm bullets as separate starting-gear items", () => {
    const content = gunslingerSeed as ImportContent
    const catalog: Equipment[] = [
      ...(equipmentSeed as unknown as Equipment[]).map((row, index) => ({
        ...row,
        id: `srd-${index}`,
      })),
      ...(content.equipment ?? []).map((row, index) => ({
        ...(row as unknown as Equipment),
        id: `mhp-${index}`,
      })),
    ]
    const packageA = content.classes?.[0]?.starting_equipment_groups?.[0]?.options.find(
      (option) => option.label === "A",
    )
    const resolved = resolvePackageEquipment(packageA?.items ?? [], catalog)
    const names = resolved.ids.map((id) => catalog.find((item) => item.id === id)?.name)
    expect(names).toEqual(
      expect.arrayContaining(["Revolver", "Bullets, Firearm", "Dagger", "Leather Armor"]),
    )
    const revolverId = catalog.find((item) => item.name === "Revolver")!.id
    const bulletsId = catalog.find((item) => item.name === "Bullets, Firearm")!.id
    expect(ownedEquipmentQuantity(resolved.ids, resolved.quantities, revolverId)).toBe(1)
    expect(ownedEquipmentQuantity(resolved.ids, resolved.quantities, bulletsId)).toBe(50)
  })
})
