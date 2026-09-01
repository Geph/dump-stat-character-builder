import { describe, expect, it } from "vitest"
import { collectSaveFeatureBadges } from "@/lib/character/save-feature-badges"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import {
  classifyPickedUpgradeSurface,
  collectSpeedOverlayNotes,
  customAbilityAsFeature,
  mergeSpeedOverlayNotes,
} from "@/lib/character/upgrade-sheet-surfaces"
import { weaponBadgeFromResourceMenu } from "@/lib/character/upgrade-sheet-surfaces"
import type { ResourceAbilityMenuCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { CustomAbility } from "@/lib/types"

function ability(partial: Partial<CustomAbility> & Pick<CustomAbility, "id" | "name">): CustomAbility {
  return {
    description: null,
    prerequisites: null,
    characteristics: null,
    attached_to_type: "class",
    attached_to_id: "dancer-1",
    uses: null,
    show_in_builder: true,
    icon: null,
    source: "Dancer",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ability_role: "upgrade",
    ...partial,
  }
}

describe("classifyPickedUpgradeSurface", () => {
  it("sends save-die menus to the save box", () => {
    const elegant = ability({
      id: "elegant",
      name: "Elegant Form",
      description: "When you fail a DEX or CHA check or any save, add Dance Die.",
      linked_modifiers: [
        {
          instanceId: "menu",
          catalogRefId: "cat_char_resource_ability_menu",
          characteristics: [
            {
              id: "mod",
              type: "resource_ability_menu",
              resourceKey: "dance_die",
              appliesOnRollKinds: ["save"],
              options: [{ name: "Elegant Form", description: "Add Dance Die to a failed save." }],
            },
          ],
        },
      ],
    })
    expect(classifyPickedUpgradeSurface(elegant)).toBe("save")
    const badges = collectSaveFeatureBadges([customAbilityAsFeature(elegant)])
    expect(badges.allSaves.map((row) => row.label)).toContain("Elegant Form")
  })

  it("sends ranged attack menus to weapon chrome", () => {
    const spinning = ability({
      id: "spinning",
      name: "Spinning Shot",
      description: "Add Dance Die to a ranged weapon attack roll.",
    })
    expect(classifyPickedUpgradeSurface(spinning)).toBe("weapon")
    const badge = weaponBadgeFromResourceMenu({
      id: "mod",
      type: "resource_ability_menu",
      resourceKey: "dance_die",
      appliesOnRollKinds: ["attack"],
      options: [{ name: "Spinning Shot", description: "Add Dance Die to a ranged weapon attack." }],
      label: "Spinning Shot — Dance Die to ranged weapon attacks",
    } as ResourceAbilityMenuCharacteristic)
    expect(badge).toMatchObject({ appliesTo: "ranged", label: expect.stringContaining("Spinning Shot") })
  })

  it("sends no-OA styles to the speed overlay", () => {
    const agile = ability({
      id: "agile",
      name: "Agile Movement",
      description: "While Dancing: your movement doesn't provoke Opportunity Attacks.",
    })
    expect(classifyPickedUpgradeSurface(agile)).toBe("speed")
    expect(collectSpeedOverlayNotes([agile])[0]).toMatch(/Agile Movement/)
  })

  it("surfaces pick-gated masteries that grant no-OA movement on the speed overlay", () => {
    const shift = ability({
      id: "shift",
      name: "Shift",
      ability_role: "weapon_mastery",
      execution: "If you hit a creature with this weapon",
      description:
        "If you hit a creature with this weapon, you can immediately move 10 feet without provoking Opportunity Attacks.",
    })
    expect(classifyPickedUpgradeSurface(shift)).toBe("speed")
    expect(collectSpeedOverlayNotes([shift])[0]).toMatch(/Shift/)
    expect(
      mergeSpeedOverlayNotes({ ignoreDifficultTerrain: true }, [shift]).join(" "),
    ).toMatch(/Ignore Difficult Terrain[\s\S]*Shift/)
  })

  it("files leftover upgrades under Passive", () => {
    const swipe = ability({
      id: "swipe",
      name: "Retaliatory Swipe",
      description:
        "While Dancing: when you take damage from a creature within 5 ft, that attacker takes damage equal to two Dance Dice.",
    })
    expect(classifyPickedUpgradeSurface(swipe)).toBe("passive")
    const actions = collectSheetActions({
      classDetails: [],
      species: null,
      customAbilities: [swipe],
    })
    expect(actions.find((action) => action.name === "Retaliatory Swipe")).toMatchObject({
      reminderOnly: true,
      trigger: "While Dancing",
      category: "combat",
    })
  })
})
