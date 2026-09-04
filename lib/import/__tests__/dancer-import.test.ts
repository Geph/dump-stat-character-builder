import { describe, expect, it } from "vitest"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import { enrichImportChoiceFeatures } from "@/lib/import/enrich-import-choices"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

describe("Dancer enrichment", () => {
  it("wires Dance with dances uses, BA, and Graceful Dodge menu", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Dancer",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity", "Charisma"],
          features: [
            {
              level: 2,
              name: "Dance",
              description:
                "Bonus Action Dance. Graceful Dodge: add your Dance Die to your Armor Class against this attack.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const dance = enriched.classes?.[0]?.features?.[0] as Feature
    expect(dance.activation?.bonusAction).toBe(true)
    expect(dance.duration).toBe("1_minute")
    expect(dance.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "dances",
    })
    const chars = (dance.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? [])
    const menu = chars.find((char) => char.type === "resource_ability_menu")
    expect(menu?.type).toBe("resource_ability_menu")
    if (menu?.type === "resource_ability_menu") {
      expect(menu.resourceKey).toBe("dance_die")
      expect(menu.limitations?.some((lim) => lim.value === "while_dancing")).toBe(true)
      expect(menu.options?.[0]?.name).toBe("Graceful Dodge")
      expect(menu.options?.[0]?.bonusConfig).toMatchObject({
        mode: "die",
        dieScaling: "class_resource",
        classResourceKey: "dance_die",
      })
    }
  })

  it("wires Dance Styles picker to class_upgrades", () => {
    const content = enrichImportChoiceFeatures({
      classes: [
        {
          name: "Dancer",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [
            {
              level: 2,
              name: "Dance Styles",
              description: "When you begin your Dance, choose a Dance Style.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const styles = content.classes?.[0]?.features?.find((f) => f.name === "Dance Styles")
    expect(styles?.choices?.optionsSource).toBe("class_upgrades")
    expect(styles?.choices?.resourceKey).toBe("dance_styles_known")
  })

  it("wires default Dance Style riders onto the Dance Styles feature", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Dancer",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [
            {
              level: 2,
              name: "Dance Styles",
              description: "When you begin your Dance, choose a Dance Style.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const styles = enriched.classes?.[0]?.features?.find((feature) => feature.name === "Dance Styles")
    const chars = (styles?.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? [])
    expect(chars.some((char) => char.id === "char_agile_movement")).toBe(true)
    expect(chars.some((char) => char.id === "mod_elegant_form")).toBe(true)
    expect(chars.some((char) => char.id === "mod_spinning_shot")).toBe(true)
  })

  it("wires Nimble Start, Fast Movement Heavy-armor gate, and Grand Finale", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Dancer",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity", "Charisma"],
          features: [
            {
              level: 2,
              name: "Nimble Start",
              description: "Attacks against you during the first round of combat have Disadvantage.",
            },
            {
              level: 15,
              name: "Fierce Start",
              description:
                "Whenever you deal damage to a creature with a weapon or Unarmed Strike on the first round of combat, you can add your Charisma modifier to the damage roll.",
            },
            {
              level: 3,
              name: "Fast Movement",
              description: "Your Speed increases by 10 feet while you aren't wearing Heavy armor.",
            },
            {
              level: 20,
              name: "Grand Finale",
              description: "While Dance is active, perform a Grand Finale once per long rest.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const features = enriched.classes?.[0]?.features ?? []
    const nimble = features.find((f) => f.name === "Nimble Start") as Feature
    const effects = (nimble.linkedModifiers ?? []).flatMap((mod) => mod.activation?.effects ?? [])
    const incoming = effects.find((fx) => fx.kind === "check_roll_modifier")
    expect(incoming?.incomingAttackMode).toBe("disadvantage")
    expect(incoming?.limitations?.some((lim) => lim.value === "first_turn_of_combat")).toBe(true)
    expect(nimble.sheetDisplay).toMatchObject({ combatActions: true, featuresTab: true })

    const fierce = features.find((f) => f.name === "Fierce Start") as Feature
    const fierceChars = (fierce.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? [])
    const fierceRider = fierceChars.find((char) => char.type === "power_rider")
    expect(fierceRider).toMatchObject({
      type: "power_rider",
      parentPowerNames: ["Attack", "Unarmed Strike"],
      weaponDamageMenu: true,
      ability: "charisma",
    })
    expect(fierceRider?.limitations?.some((lim) => lim.value === "first_turn_of_combat")).toBeFalsy()
    expect(fierceChars.some((char) => char.type === "damage_roll_modifiers")).toBe(false)

    const fast = features.find((f) => f.name === "Fast Movement") as Feature
    const speed = (fast.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "speed")
    expect(speed).toMatchObject({ value: 10, speedType: "walk" })
    expect((speed as { limitations?: { value: string }[] })?.limitations?.some((lim) => lim.value === "Heavy armor")).toBe(
      true,
    )

    const finale = features.find((f) => f.name === "Grand Finale") as Feature
    expect(finale.activation?.action).not.toBe(true)
    expect(finale.limitedUses?.restoreByResource).toMatchObject({
      resourceKey: "dances",
      resourceAmount: 2,
    })
    const finaleRider = (finale.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "power_rider")
    expect(finaleRider).toMatchObject({
      type: "power_rider",
      parentPowerNames: ["Attack", "Unarmed Strike"],
    })
  })

  it("wires higher multi-target Extra Attack tiers to replace lower ones", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Dancer",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [
            {
              level: 5,
              name: "Three-Target Extra Attack",
              description: "Attack three times vs different targets.",
            },
            {
              level: 11,
              name: "Four-Target Extra Attack",
              description: "Attack four times vs different targets.",
            },
            {
              level: 17,
              name: "Five-Target Extra Attack",
              description: "Attack five times vs different targets.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const features = enriched.classes?.[0]?.features ?? []
    const four = features.find((f) => f.name === "Four-Target Extra Attack") as Feature
    const five = features.find((f) => f.name === "Five-Target Extra Attack") as Feature
    const fourReplace = (four.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "replace_feature")
    const fiveReplace = (five.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "replace_feature")
    expect(fourReplace).toMatchObject({
      type: "replace_feature",
      replacedFeatureNames: ["Three-Target Extra Attack"],
    })
    expect(fiveReplace).toMatchObject({
      type: "replace_feature",
      replacedFeatureNames: ["Four-Target Extra Attack", "Three-Target Extra Attack"],
    })
  })

  it("wires Team Player Frightened advantage and phrase-detects Cheerful text", () => {
    const phrase = detectFeatureModifiers(
      "You have Advantage on saving throws you make to avoid or end the Frightened condition.",
      { contentKind: "subclass_feature", sourceName: "Cheerleader", featureName: "Team Player" },
    )
    const effect = phrase
      .flatMap((row) => row.instance.activation?.effects ?? [])
      .find((fx) => fx.kind === "check_roll_modifier")
    expect(effect).toMatchObject({
      checkRollMode: "advantage",
      checkConditionTypes: ["Frightened"],
    })

    const enriched = enrichImportContentModifiers({
      subclasses: [
        {
          name: "Cheerleader",
          class_name: "Dancer",
          description: null,
          features: [
            {
              level: 3,
              name: "Team Player",
              description:
                "Cheerful. You have Advantage on saving throws you make to avoid or end the Frightened condition.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const team = enriched.subclasses?.[0]?.features?.[0] as Feature
    const effects = (team.linkedModifiers ?? []).flatMap((mod) => mod.activation?.effects ?? [])
    expect(effects.some((fx) => fx.kind === "check_roll_modifier")).toBe(true)
  })

  it("phrase-detects Fast Movement Heavy armor limitation without enrichment", () => {
    const mods = detectFeatureModifiers(
      "Your Speed increases by 10 feet while you aren't wearing Heavy armor.",
      { contentKind: "class_feature", sourceName: "Dancer", featureName: "Fast Movement" },
    )
    const speed = mods
      .flatMap((row) => row.instance.characteristics ?? [])
      .find((char) => char.type === "speed")
    expect((speed as { limitations?: { value: string }[] })?.limitations?.some((lim) => lim.value === "Heavy armor")).toBe(
      true,
    )
  })

  it("wires Elegant Form / Spinning Shot proposal menus and upgrade role", () => {
    const enriched = applyImportEnrichmentPresets({
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "elegant_form",
            name: "Elegant Form",
            definition: "Dance Style",
            description: "Add Dance Die to failed DEX/CHA checks.",
            source_type: "class",
            source_name: "Dancer",
            level_requirement: 2,
          },
          {
            proposal_id: "spinning_shot",
            name: "Spinning Shot",
            definition: "Dance Style",
            description: "Add Dance Die to ranged attacks.",
            source_type: "class",
            source_name: "Dancer",
            level_requirement: 2,
          },
        ],
      },
    } as unknown as ImportContent)

    const elegant = enriched.import_proposals?.custom_abilities?.[0] as {
      ability_role?: string
      linkedModifiers?: Feature["linkedModifiers"]
    }
    expect(elegant.ability_role).toBe("upgrade")
    const elegantMenus = (elegant.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? [])
    expect(elegantMenus.find((char) => char.type === "resource_ability_menu")).toMatchObject({
      appliesOnRollKinds: ["save", "ability"],
    })
    expect(
      elegantMenus
        .find((char) => char.type === "resource_ability_menu")
        ?.limitations?.some((lim) => lim.value === "dance_style_elegant_form"),
    ).toBe(true)

    const spinning = enriched.import_proposals?.custom_abilities?.[1] as {
      ability_role?: string
      linkedModifiers?: Feature["linkedModifiers"]
    }
    expect(spinning.ability_role).toBe("upgrade")
    const spinningChars = (spinning.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? [])
    expect(spinningChars.some((char) => char.type === "weapon_sheet_badge")).toBe(true)
  })

  it("wires Agile Movement as a no-OA movement effect", () => {
    const enriched = applyImportEnrichmentPresets({
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "agile_movement",
            name: "Agile Movement",
            definition: "Dance Style",
            description: "Your movement doesn't provoke Opportunity Attacks.",
            source_type: "class",
            source_name: "Dancer",
            level_requirement: 2,
          },
        ],
      },
    } as unknown as ImportContent)

    const agile = enriched.import_proposals?.custom_abilities?.[0] as {
      ability_role?: string
      linkedModifiers?: Feature["linkedModifiers"]
    }
    expect(agile.ability_role).toBe("upgrade")
    const movement = (agile.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "movement_effects")
    expect(movement).toMatchObject({ moveWithoutOpportunityAttacks: true })
    expect(
      (movement as { limitations?: { value: string }[] })?.limitations?.some(
        (lim) => lim.value === "dance_style_agile_movement",
      ),
    ).toBe(true)
  })

  it("marks Dancer Shift as an upgrade so it does not collide with mastery Shift", () => {
    const enriched = applyImportEnrichmentPresets({
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "shift_style",
            name: "Shift",
            definition: "Dance Style",
            description: "Teleport during the Attack action while Dancing.",
            source_type: "class",
            source_name: "Dancer",
            level_requirement: 2,
          },
        ],
      },
    } as unknown as ImportContent)

    const shift = enriched.import_proposals?.custom_abilities?.[0] as {
      ability_role?: string
      description?: string
    }
    expect(shift.ability_role).toBe("upgrade")
    expect(shift.description).toMatch(/teleport/i)
  })

  it("wires Deadly D4s as a play-time rider (not die override) and Momentum class resource spend", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Dancer",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity"],
          features: [
            {
              level: 1,
              name: "Dervish Fighting",
              description: "Deadly D4s. Whenever you roll damage with a weapon that deals 1d4 or 1d6 damage or an Unarmed Strike, you can deal 2d4 damage instead.",
            },
            {
              level: 1,
              name: "Unarmored Defense",
              description:
                "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers.",
            },
          ],
        },
      ],
      subclasses: [
        {
          name: "Acrobat",
          class_name: "Dancer",
          description: null,
          features: [
            {
              level: 3,
              name: "Momentum",
              description: "Gain Momentum while Dancing.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const dervish = enriched.classes?.[0]?.features?.[0] as Feature
    const chars = (dervish.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? [])
    expect(chars.some((char) => char.type === "weapon_damage_die_override")).toBe(false)
    expect(chars.some((char) => char.type === "power_rider")).toBe(true)
    const extraFinesse = chars.find((char) => char.type === "weapon_ability_override")
    expect(extraFinesse).toMatchObject({
      treatAsFinesse: true,
      whenDamageDice: ["1d4", "1d6"],
    })
    expect(chars.find((char) => char.type === "weapon_sheet_badge")).toMatchObject({
      label: "Dervish Fighting",
      whenDamageDice: ["1d4", "1d6"],
      includeUnarmed: true,
    })

    const ud = enriched.classes?.[0]?.features?.find((f) => f.name === "Unarmored Defense") as Feature
    const ac = (ud.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "ac")
    expect(ac).toMatchObject({ mode: "ability_modifiers", base: 10, abilities: ["DEX", "CHA"] })

    const momentum = enriched.subclasses?.[0]?.features?.[0] as Feature
    expect(momentum.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "momentum",
    })
  })

  it("wires Courtesan Honeyed Words as two language choices", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Courtesan",
          class_name: "Dancer",
          description: null,
          features: [
            {
              level: 3,
              name: "Honeyed Words",
              description: "You know two languages of your choice.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const honeyed = enriched.subclasses?.[0]?.features?.[0] as Feature
    const langs = (honeyed.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "languages") as { choiceCount?: number } | undefined
    expect(langs?.choiceCount).toBe(2)
  })

  it("wires Courtesan Sociable Start as Combat Bonus Action", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Courtesan",
          class_name: "Dancer",
          description: null,
          features: [
            {
              level: 6,
              name: "Sociable Start",
              description:
                "During the first round of combat, you can take the Influence action as a Bonus Action and have Advantage on ability checks you make using that action.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const sociable = enriched.subclasses?.[0]?.features?.[0] as Feature
    expect(sociable.activation?.bonusAction).toBe(true)
    expect(sociable.sheetDisplay).toMatchObject({
      combatActions: true,
      abilitiesActions: false,
      featuresTab: true,
    })
  })

  it("wires Courtesan Beguiling Charm as Combat Passive enemy impact", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Courtesan",
          class_name: "Dancer",
          description: null,
          features: [
            {
              level: 10,
              name: "Beguiling Charm",
              description:
                "When you give a creature the Charmed condition, you can choose one of the following effects.\n\nBad Influence. The target subtracts your Dance Die from Intelligence, Wisdom, and Charisma saving throws.\n\nFriend of My Friends. The target subtracts your Dance Die from all its attack rolls.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const charm = enriched.subclasses?.[0]?.features?.[0] as Feature
    expect(charm.sheetDisplay).toMatchObject({ combatActions: true, featuresTab: true })
    const menu = (charm.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "resource_ability_menu")
    expect(menu?.type).toBe("resource_ability_menu")
    if (menu?.type === "resource_ability_menu") {
      expect(menu.options?.map((option) => option.name)).toEqual([
        "Bad Influence",
        "Friend of My Friends",
      ])
    }
    const enemyFx = (charm.linkedModifiers ?? [])
      .flatMap((mod) => mod.activation?.effects ?? [])
      .find((effect) => effect.kind === "modify_creature" && effect.rollTarget === "enemy")
    expect(enemyFx).toBeTruthy()
  })

  it("wires Courtesan Heartbreaker as an Enthralling Movement Dance rider", () => {
    const enriched = applyImportEnrichmentPresets({
      subclasses: [
        {
          name: "Courtesan",
          class_name: "Dancer",
          description: null,
          features: [
            {
              level: 14,
              name: "Heartbreaker",
              description:
                "Whenever a creature succeeds or fails its saving throw against your Enthralling Movement, you can deal Psychic damage to the target equal to two rolls of your Dance Die.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const heartbreaker = enriched.subclasses?.[0]?.features?.[0] as Feature
    const rider = (heartbreaker.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "power_rider")
    expect(rider).toMatchObject({
      type: "power_rider",
      parentPowerNames: ["Dance", "Enthralling Movement"],
      parentMenuOptionNames: ["Enthralling Movement"],
    })
    expect((rider as { alertSummary?: string })?.alertSummary).toMatch(/Psychic|Dance Die/i)
  })

  it("wires Heroic Dance as Inspiration grant riding Dance", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [
        {
          name: "Dancer",
          description: "",
          hit_die: 8,
          primary_ability: ["Dexterity", "Charisma"],
          features: [
            {
              level: 9,
              name: "Heroic Dance",
              description:
                "When you begin your Dance, you can give yourself Heroic Inspiration if you don't have it.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const heroic = enriched.classes?.[0]?.features?.[0] as Feature
    const effects = (heroic.linkedModifiers ?? []).flatMap(
      (mod) => mod.activation?.effects ?? [],
    )
    expect(effects.some((effect) => effect.kind === "grant_inspiration" && effect.healTarget === "self")).toBe(
      true,
    )
    const riders = (heroic.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .filter((char) => char.type === "power_rider")
    expect(riders.some((char) => (char.parentPowerNames ?? []).includes("Dance"))).toBe(true)
  })
})
