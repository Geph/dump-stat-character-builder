import { describe, expect, it } from "vitest"
import { enrichPsionArchetypeFeatures } from "@/lib/import/enrichment-presets"
import type { ImportContent } from "@/lib/import/content-schema"
import { applyCustomAbilityModifications } from "@/lib/character/modify-custom-ability"
import type {
  CharacteristicModifier,
  ModifyCustomAbilityCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import type { CustomAbility, Feature } from "@/lib/types"

function enrich(subclassName: string, feature: { level: number; name: string }) {
  const enriched = enrichPsionArchetypeFeatures({
    subclasses: [
      {
        name: subclassName,
        class_name: "KibblesTasty Psion",
        description: null,
        features: [{ ...feature, description: "Upgrades a power you already know." }],
      },
    ],
  } as unknown as ImportContent)
  return enriched.subclasses?.[0]?.features?.[0] as unknown as Feature | undefined
}

function upgradesFrom(feature: Feature | undefined): ModifyCustomAbilityCharacteristic[] {
  return (feature?.linkedModifiers ?? [])
    .flatMap((instance) => (instance.characteristics ?? []) as CharacteristicModifier[])
    .filter(
      (characteristic): characteristic is ModifyCustomAbilityCharacteristic =>
        characteristic.type === "modify_custom_ability",
    )
}

function power(name: string): CustomAbility {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    description: `<p>${name} base text.</p>`,
    prerequisites: null,
    characteristics: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: true,
    ability_role: "psionic_power",
  } as CustomAbility
}

describe("Psion cross-power upgrades", () => {
  it.each([
    ["Awakened Mind", { level: 3, name: "Mind Reader" }, "Telepathic Intrusion"],
    ["Shaper's Mind", { level: 3, name: "Astral Metastability" }, "Astral Construct"],
    ["Wandering Mind", { level: 6, name: "Phase Dancer" }, "Phase Rift"],
    ["Wandering Mind", { level: 14, name: "Winding Paths" }, "Phase Rift"],
  ])("%s / %s upgrades %s", (subclassName, feature, targetPower) => {
    const upgrades = upgradesFrom(enrich(subclassName, feature))

    expect(upgrades).toHaveLength(1)
    expect(upgrades[0].abilityNames).toEqual([targetPower])
    expect(upgrades[0].addendum).toContain(feature.name)
  })

  it("lands the upgrade text on the power the character already knows", () => {
    const upgrades = [
      ...upgradesFrom(enrich("Wandering Mind", { level: 6, name: "Phase Dancer" })),
      ...upgradesFrom(enrich("Wandering Mind", { level: 14, name: "Winding Paths" })),
    ]

    const [phaseRift, telepathicIntrusion] = applyCustomAbilityModifications(
      [power("Phase Rift"), power("Telepathic Intrusion")],
      upgrades,
    )

    expect(phaseRift.description).toContain("Phase Dancer:")
    expect(phaseRift.description).toContain("Winding Paths:")
    expect(telepathicIntrusion.description).toBe("<p>Telepathic Intrusion base text.</p>")
  })

  it("does not double-attach when the feature already carries an upgrade", () => {
    const once = enrich("Wandering Mind", { level: 14, name: "Winding Paths" })
    const twice = enrichPsionArchetypeFeatures({
      subclasses: [
        {
          name: "Wandering Mind",
          class_name: "KibblesTasty Psion",
          description: null,
          features: [once],
        },
      ],
    } as unknown as ImportContent)

    expect(upgradesFrom(twice.subclasses?.[0]?.features?.[0] as unknown as Feature)).toHaveLength(1)
  })
})
