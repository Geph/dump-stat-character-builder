import { describe, expect, it } from "vitest"
import { featureChoiceKey } from "@/lib/builder/choices"
import { aggregateUpgradeOptions } from "@/lib/builder/upgrade-choices"
import { collectFreeCastSpellKeys } from "@/lib/character/free-cast-spells"
import { filterDisplaySpeedEntries, resolveAllSpeeds } from "@/lib/character/resolve-all-speeds"
import { inferActivatableActionCategory } from "@/lib/character/sheet-actions"
import { resolveFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import { canonicalSpellLookupKey } from "@/lib/compendium/spell-name-aliases"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import craftsmanSeed from "@/lib/seed-packs/mage-hand-press/magehandpress-craftsman-class.json"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility, DndClass, Feature } from "@/lib/types"

describe("Craftsman enrichment", () => {
  it("wires Expert Crafting Instant uses and Customize Armor choices", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Craftsman",
          description: "",
          hit_die: 10,
          primary_ability: ["Strength", "Dexterity"],
          features: [
            {
              level: 1,
              name: "Expert Crafting",
              description: "Instant Crafting twice. Overnight Crafting.",
            },
            {
              level: 6,
              name: "Customize Armor",
              description: "Customize Masterwork armor with one benefit.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const expert = enriched.classes?.[0]?.features?.[0] as Feature
    expect(expert.limitedUses).toMatchObject({
      type: "fixed",
      fixedAmount: 2,
      useShareKey: "instant_crafting",
    })
    expect(expert.activation?.action).toBe(true)

    const armor = enriched.classes?.[0]?.features?.[1] as Feature
    expect(armor.choices?.category).toBe("Armor Customization")
    expect(armor.choices?.options?.some((opt) => opt.name === "Climbing")).toBe(true)
    const climbing = armor.choices?.options?.find((opt) => opt.name === "Climbing")
    expect(
      (climbing?.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? []).some(
        (char) => char.type === "speed" && char.speedType === "climb" && char.mode === "equal_to_walk",
      ),
    ).toBe(true)
  })

  it("Climbing Customize Armor pick grants climb speed equal to walk", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Craftsman",
          description: "",
          hit_die: 10,
          primary_ability: ["Strength", "Dexterity"],
          features: [
            {
              level: 6,
              name: "Customize Armor",
              description: "Customize Masterwork armor with one benefit.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const cls = {
      ...(enriched.classes![0] as object),
      id: "class_craftsman",
      features: enriched.classes![0]!.features as Feature[],
    } as DndClass

    const pickKey = featureChoiceKey("class_craftsman", "Customize Armor", 6)
    const mods = collectBuilderModifierRefIds({
      catalog: [],
      speciesTraitPicks: {},
      feats: [],
      selectedFeatIds: [],
      classLevels: [{ classId: "class_craftsman", level: 6 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: { [pickKey]: ["Climbing"] },
    })

    expect(
      mods.some((m) => m.type === "speed" && m.speedType === "climb" && m.mode === "equal_to_walk"),
    ).toBe(true)

    const aggregated = aggregateCharacteristics(mods)
    const speeds = filterDisplaySpeedEntries(
      resolveAllSpeeds({
        walkSpeed: 30,
        aggregatedSpeed: aggregated.speed,
        speedEqualToWalk: aggregated.speedEqualToWalk,
      }),
    )
    expect(speeds.some((e) => e.type === "climb" && e.feet === 30)).toBe(true)
  })

  it("keeps Magazine on the Combat tab despite its Crafting Tools wording", () => {
    const description =
      "<p>When you finish a Long Rest, you can use your Crafting Tools and materials worth 50+ GP to modify a Ranged weapon that has the Loading or Reload property.</p><p><strong>Reload.</strong> If you are proficient with the weapon, reloading it takes an action or a Bonus Action; otherwise, reloading it takes an action.</p>"
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Calibarons' Guild",
          class_name: "Craftsman",
          description: null,
          features: [{ level: 6, name: "Magazine", description }],
        },
      ],
    } as unknown as ImportContent)

    const magazine = enriched.subclasses?.[0]?.features?.[0] as Feature
    expect(magazine.sheetDisplay).toMatchObject({ combatActions: true, featuresTab: true })
    expect(resolveFeatureSheetDisplay(magazine).combatActions).toBe(true)

    // Without the preset the "Crafting Tools" wording files it under Non-Combat.
    expect(
      inferActivatableActionCategory({ name: "Magazine", description }),
    ).toBe("utility")
  })

  it("wires Eye for Quality free casts with Intelligence, whichever order presets run in", () => {
    const description =
      "<p>You can cast Identify and Locate Object without a spell slot or components. When you cast Identify, you also appraise the target item, learning its market value in Gold Pieces.</p>"
    const content = () =>
      ({
        classes: [
          {
            name: "Craftsman",
            description: "",
            hit_die: 10,
            primary_ability: ["Strength"],
            features: [{ level: 9, name: "Eye for Quality", description }],
          },
        ],
      }) as unknown as ImportContent

    // enrichImportContentModifiers applies presets after phrase detection, while the seed build
    // applies them before as well. Both orders must land the same wiring, exactly once.
    for (const enriched of [
      enrichImportContentModifiers(content()),
      enrichImportContentModifiers(applyImportEnrichmentPresets(content())),
    ]) {
      const feature = enriched.classes?.[0]?.features?.[0] as Feature
      const instances = feature.linkedModifiers ?? []

      const freeCasts = instances.flatMap((instance) =>
        (instance.activation?.effects ?? []).filter(
          (effect) => effect.kind === "cast_spell" && effect.castSpellWithoutSlot,
        ),
      )
      expect(freeCasts.map((effect) => effect.castSpellName)).toEqual([
        "Identify",
        "Locate Object",
      ])

      // Craftsman has no class spellcasting ability, so the grant must carry Intelligence itself.
      const known = instances
        .flatMap((instance) => instance.characteristics ?? [])
        .filter((characteristic) => characteristic.type === "spells_known")
      expect(known).toHaveLength(1)
      expect(known[0]).toMatchObject({ castingAbility: "intelligence" })
      expect(
        known[0]?.type === "spells_known" ? known[0].spells?.map((s) => s.spellId) : [],
      ).toEqual(["import_spell_name:Identify", "import_spell_name:Locate Object"])
    }
  })

  it("ships Eye for Quality free casts in the Craftsman seed pack", () => {
    const feature = craftsmanSeed.classes
      ?.find((row) => row.name === "Craftsman")
      ?.features?.find((row) => row.name === "Eye for Quality") as Feature

    const freeCastNames = (feature.linkedModifiers ?? []).flatMap((instance) =>
      (instance.activation?.effects ?? [])
        .filter((effect) => effect.kind === "cast_spell" && effect.castSpellWithoutSlot)
        .map((effect) => effect.castSpellName),
    )
    expect(freeCastNames).toEqual(["Identify", "Locate Object"])
    expect(collectFreeCastSpellKeys([feature])).toEqual(
      new Set([canonicalSpellLookupKey("Identify"), canonicalSpellLookupKey("Locate Object")]),
    )

    // An older bake swept the slot clause into the spell name; keep that from coming back.
    const grantedSpellIds = (feature.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .flatMap((characteristic) =>
        characteristic.type === "spells_known"
          ? (characteristic.spells ?? []).map((spell) => spell.spellId)
          : [],
      )
    expect(grantedSpellIds).toEqual([
      "import_spell_name:Identify",
      "import_spell_name:Locate Object",
    ])
  })

  it("wires Zeroed Sights cover flags and Fortify Masterwork-scaled uses", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Calibarons' Guild",
          class_name: "Craftsman",
          description: null,
          features: [
            {
              level: 3,
              name: "Zeroed Sights",
              description: "Your ranged attacks with Masterwork weapons ignore Half Cover and Three-Quarters Cover.",
            },
          ],
        },
        {
          name: "Armigers' Guild",
          class_name: "Craftsman",
          description: null,
          features: [
            {
              level: 10,
              name: "Fortify",
              description: "Bonus Action fortify. Uses equal to Masterwork Bonus.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const zeroed = enriched.subclasses?.[0]?.features?.[0] as Feature
    const entry = (zeroed.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "attack_roll_modifiers")
      ?.entries?.[0]
    expect(entry).toMatchObject({
      ignoreHalfCover: true,
      treatThreeQuartersCoverAsHalf: true,
    })

    const fortify = enriched.subclasses?.[1]?.features?.[0] as Feature
    expect(fortify.limitedUses).toMatchObject({
      type: "at_level",
      atLevelMode: "tier",
      useShareKey: "fortify",
    })
    expect(fortify.limitedUses?.classResourceKey).toBeUndefined()
    expect(fortify.activation?.bonusAction).toBe(true)
  })

  it("sets ability_role upgrade on trap proposals and includes subclass upgrades", () => {
    const enriched = applyImportEnrichmentPresets({
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "ballista_trap",
            name: "Ballista Trap",
            definition: "Trap",
            description: "<p>Cost: 10 GP.</p>",
            source_type: "subclass",
            source_name: "Trappers' Guild",
            level_requirement: 3,
          },
        ],
      },
    } as unknown as ImportContent)

    const trap = enriched.import_proposals?.custom_abilities?.[0] as { ability_role?: string }
    expect(trap.ability_role).toBe("upgrade")
  })

  it("retags unnamed Trappers' Guild rows as upgrades and seeds traps_known", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Trappers' Guild",
          class_name: "Craftsman",
          description: null,
          features: [{ level: 3, name: "Traps", description: "Craft traps." }],
        },
      ],
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "custom_snare",
            name: "Snare Line",
            definition: "Trap",
            description: "<p>A taut line.</p>",
            source_type: "subclass",
            source_name: "Trappers' Guild",
            level_requirement: 3,
          },
        ],
      },
    } as unknown as ImportContent)

    expect(enriched.import_proposals?.custom_abilities?.[0]?.ability_role).toBe("upgrade")
    expect(enriched.class_resources?.some((row) => row.resource_key === "traps_known")).toBe(true)

    const options = aggregateUpgradeOptions({
      customAbilities: [
        {
          id: "trap-1",
          name: "Ballista Trap",
          description: "Cost 10 GP",
          ability_role: "upgrade",
          attached_to_type: "subclass",
          attached_to_id: "Trappers' Guild",
          prerequisites: null,
          level_requirement: 3,
          characteristics: null,
          uses: null,
          show_in_builder: true,
          is_system: false,
        } as CustomAbility,
      ],
      classNames: ["Craftsman"],
      classLevel: 3,
      selectedUpgradeNames: [],
      subclassName: "Trappers' Guild",
    })
    expect(options.some((opt) => opt.name === "Ballista Trap")).toBe(true)
  })

  it("routes standalone mastery libraries to Craftsman and Dancer pickers", () => {
    const enriched = applyImportEnrichmentPresets({
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "parry",
            name: "Parry",
            definition: "Mastery property",
            description: "When you hit, gain +2 AC until your next turn.",
            prerequisite: "Melee Weapon, Finesse Property",
            source_type: "compendium",
            source_name: null,
            level_requirement: 1,
            eligible_classes: ["Dancer", "Craftsman"],
          },
        ],
      },
    } as unknown as ImportContent)

    const parry = enriched.import_proposals?.custom_abilities?.[0]
    expect(parry?.ability_role).toBe("weapon_mastery")
    expect(parry?.mechanics).toEqual([])

    const row = {
      id: "parry",
      name: "Parry",
      description: parry?.description ?? "",
      ability_role: parry?.ability_role,
      eligible_classes: parry?.eligible_classes,
      level_requirement: 1,
      prerequisites: parry?.prerequisite ?? null,
    } as unknown as CustomAbility
    expect(
      aggregateUpgradeOptions({
        customAbilities: [row],
        classNames: ["Dancer"],
        classLevel: 1,
        selectedUpgradeNames: [],
      }).map((option) => option.name),
    ).toContain("Parry")
  })

  it("phrase-detects ignore Half and Three-Quarters Cover", () => {
    const mods = detectFeatureModifiers(
      "Your ranged attacks with Masterwork weapons ignore Half Cover and Three-Quarters Cover.",
      { contentKind: "subclass_feature", sourceName: "Calibarons' Guild", featureName: "Zeroed Sights" },
    )
    const entry = mods
      .flatMap((row) => row.instance.characteristics ?? [])
      .find((char) => char.type === "attack_roll_modifiers")
      ?.entries?.[0]
    expect(entry).toMatchObject({
      ignoreHalfCover: true,
      treatThreeQuartersCoverAsHalf: true,
    })
  })

  it("wires Traps picker and Power Cell charge spend", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Trappers' Guild",
          class_name: "Craftsman",
          description: null,
          features: [
            {
              level: 3,
              name: "Traps",
              description: "Quick Deployment Bonus Action. Craft traps.",
            },
          ],
        },
        {
          name: "Thunderlords' Guild",
          class_name: "Craftsman",
          description: null,
          features: [
            {
              level: 3,
              name: "Power Cell",
              description: "Charge Points equal to Craftsman level.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const traps = enriched.subclasses?.[0]?.features?.[0] as Feature
    expect(traps.choices?.optionsSource).toBe("class_upgrades")
    expect(traps.choices?.resourceKey).toBe("traps_known")
    expect(traps.activation?.bonusAction).toBe(true)
    expect(
      enriched.class_resources?.some(
        (row) => row.resource_key === "traps_known" && row.subclass_name === "Trappers' Guild",
      ),
    ).toBe(true)

    const cell = enriched.subclasses?.[1]?.features?.[0] as Feature
    expect(cell.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "charge_points",
    })
  })

  it("wires Masterwork Weapons/Armor to live Masterwork Bonus with sheet toggles", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Craftsman",
          description: "",
          hit_die: 10,
          primary_ability: ["Strength"],
          features: [
            {
              level: 1,
              name: "Masterwork Weapons",
              description: "Improve a weapon into a Masterwork weapon.",
            },
            {
              level: 2,
              name: "Masterwork Armor",
              description: "Improve armor into a Masterwork version.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const weapons = enriched.classes?.[0]?.features?.[0] as Feature
    const attack = (weapons.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "attack_roll_modifiers")
    expect(attack?.entries?.[0]).toMatchObject({
      bonusFromClassResourceKey: "masterwork_bonus",
    })
    expect(
      (attack as { limitations?: { value: string }[] })?.limitations?.some(
        (lim) => lim.value === "masterwork_weapon_active",
      ),
    ).toBe(true)

    const armor = enriched.classes?.[0]?.features?.[1] as Feature
    const ac = (armor.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "ac")
    expect(ac).toMatchObject({
      flatBonusFromClassResourceKey: "masterwork_bonus",
      flatBonusClassResourceScale: "half_ceil",
    })
    expect(weapons.choices?.resourceKey).toBe("weapon_mastery_extra")
    expect(weapons.choices?.count).toBe(1)
    expect(weapons.isChoice).toBe(false)
  })

  it("wires Improved Masterwork to a third per-weapon mastery slot", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Craftsman",
          description: "",
          hit_die: 10,
          primary_ability: ["Strength"],
          features: [
            {
              level: 17,
              name: "Improved Masterwork",
              description: "Third Mastery Property. You can add a third mastery property.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const improved = enriched.classes?.[0]?.features?.[0] as Feature
    expect(improved.choices?.resourceKey).toBe("weapon_mastery_extra")
    expect(improved.choices?.count).toBe(2)
    expect(improved.isChoice).toBe(false)
  })
})
