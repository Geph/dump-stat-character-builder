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
    expect(dance.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "dances",
    })
    const chars = (dance.linkedModifiers ?? []).flatMap((mod) => mod.characteristics ?? [])
    expect(chars.some((char) => char.type === "resource_ability_menu")).toBe(true)
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
    expect(effects.some((fx) => fx.kind === "check_roll_modifier")).toBe(true)

    const fast = features.find((f) => f.name === "Fast Movement") as Feature
    const speed = (fast.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "speed")
    expect(speed).toMatchObject({ value: 10, speedType: "walk" })
    expect((speed as { limitations?: { value: string }[] })?.limitations?.some((lim) => lim.value === "Heavy armor")).toBe(
      true,
    )

    const finale = features.find((f) => f.name === "Grand Finale") as Feature
    expect(finale.activation?.action).toBe(true)
    expect(finale.limitedUses?.restoreByResource).toMatchObject({
      resourceKey: "dances",
      resourceAmount: 2,
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
    expect(elegantMenus.some((char) => char.type === "resource_ability_menu")).toBe(true)

    const spinning = enriched.import_proposals?.custom_abilities?.[1] as { ability_role?: string }
    expect(spinning.ability_role).toBe("upgrade")
  })

  it("wires Deadly D4s weapon die override and Momentum class resource spend", () => {
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
              description: "Deadly D4s. Your weapon damage dice become d4s.",
            },
          ],
        },
      ],
      subclasses: [
        {
          name: "Momentum",
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
    const override = (dervish.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "weapon_damage_die_override")
    expect(override).toMatchObject({ dieSides: 4, scope: "weapons" })

    const momentum = enriched.subclasses?.[0]?.features?.[0] as Feature
    expect(momentum.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "momentum",
    })
  })
})
