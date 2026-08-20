import { describe, expect, it } from "vitest"
import { applyCustomAbilityModifications } from "@/lib/character/modify-custom-ability"
import type { ModifyCustomAbilityCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { CustomAbility } from "@/lib/types"

function ability(overrides: Partial<CustomAbility> & { name: string }): CustomAbility {
  return {
    id: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    description: null,
    prerequisites: null,
    characteristics: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: true,
    ...overrides,
  } as CustomAbility
}

function upgrade(
  overrides: Partial<ModifyCustomAbilityCharacteristic>,
): ModifyCustomAbilityCharacteristic {
  return {
    id: "mod_upgrade",
    type: "modify_custom_ability",
    abilityNames: [],
    ...overrides,
  }
}

describe("applyCustomAbilityModifications", () => {
  it("appends the upgrade text to the named ability only", () => {
    const abilities = [
      ability({ name: "Phase Rift", description: "<p>Teleport 30 feet.</p>" }),
      ability({ name: "Telekinetic Force", description: "<p>Shove a creature.</p>" }),
    ]

    const result = applyCustomAbilityModifications(abilities, [
      upgrade({ abilityNames: ["Phase Rift"], addendum: "Your rift range increases to 60 feet." }),
    ])

    expect(result[0].description).toBe(
      "<p>Teleport 30 feet.</p>\n<p>Your rift range increases to 60 feet.</p>",
    )
    expect(result[1].description).toBe("<p>Shove a creature.</p>")
  })

  it("matches names case and whitespace insensitively but never by substring", () => {
    const abilities = [
      ability({ name: "Mind  Devourer", description: "Base." }),
      ability({ name: "Mind Devourer Psionic", description: "Unrelated." }),
    ]

    const result = applyCustomAbilityModifications(abilities, [
      upgrade({ abilityNames: ["mind devourer"], addendum: "Upgraded." }),
    ])

    expect(result[0].description).toBe("Base.\n\nUpgraded.")
    expect(result[1].description).toBe("Unrelated.")
  })

  it("appends options to the target's own choice pool without duplicating", () => {
    const abilities = [
      ability({
        name: "Astral Construct",
        choices: {
          category: "Construct Options",
          count: 1,
          options: [{ name: "Devastating Weapons", description: "1d12" }],
        },
      }),
    ]

    const result = applyCustomAbilityModifications(abilities, [
      upgrade({
        abilityNames: ["Astral Construct"],
        appendOptions: [
          { name: "Devastating Weapons", description: "duplicate" },
          { name: "Solidify", description: "Become tangible." },
        ],
      }),
    ])

    expect(result[0].choices?.options?.map((option) => option.name)).toEqual([
      "Devastating Weapons",
      "Solidify",
    ])
  })

  it("folds options into the description when the ability has no choice pool", () => {
    const abilities = [ability({ name: "Phase Rift", description: "Base." })]

    const result = applyCustomAbilityModifications(abilities, [
      upgrade({
        abilityNames: ["Phase Rift"],
        appendOptions: [{ name: "Winding Paths", description: "Bring an ally." }],
      }),
    ])

    expect(result[0].description).toBe("Base.\n\nWinding Paths. Bring an ally.")
  })

  it("stacks multiple upgrades that target the same ability", () => {
    const abilities = [ability({ name: "Phase Rift", description: "Base." })]

    const result = applyCustomAbilityModifications(abilities, [
      upgrade({ id: "a", abilityNames: ["Phase Rift"], addendum: "First." }),
      upgrade({ id: "b", abilityNames: ["Phase Rift"], addendum: "Second." }),
    ])

    expect(result[0].description).toBe("Base.\n\nFirst.\n\nSecond.")
  })

  it("returns the original list untouched when nothing matches", () => {
    const abilities = [ability({ name: "Phase Rift", description: "Base." })]

    expect(applyCustomAbilityModifications(abilities, [])).toBe(abilities)
    expect(
      applyCustomAbilityModifications(abilities, [
        upgrade({ abilityNames: ["Astral Construct"], addendum: "Nope." }),
      ])[0].description,
    ).toBe("Base.")
  })
})
