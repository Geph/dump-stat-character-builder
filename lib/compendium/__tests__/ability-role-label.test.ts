import { describe, expect, it } from "vitest"
import { displayAbilityRoleLabel, isManeuverCustomAbility } from "@/lib/compendium/ability-role-label"
import type { CustomAbility } from "@/lib/types"

function ability(partial: Partial<CustomAbility> & Pick<CustomAbility, "id" | "name">): CustomAbility {
  return {
    description: null,
    prerequisites: null,
    characteristics: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: true,
    icon: null,
    source: "Custom",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ...partial,
  }
}

describe("ability role labels", () => {
  it("labels Gunslinger / shared Battle Die options as Maneuver, not Knack", () => {
    const dodge = ability({
      id: "dodge",
      name: "Dodge Roll",
      ability_role: "knack",
      eligible_classes: ["Gunslinger", "Captain", "Vagabond"],
    } as unknown as CustomAbility)
    expect(isManeuverCustomAbility(dodge)).toBe(true)
    expect(displayAbilityRoleLabel(dodge)).toBe("Maneuver")
  })

  it("keeps Alternate Ranger options as Knack", () => {
    const row = ability({
      id: "favored",
      name: "Favored Foe",
      ability_role: "knack",
      source_name: "Alternate Ranger",
      eligible_classes: ["Alternate Ranger"],
    } as unknown as CustomAbility)
    expect(isManeuverCustomAbility(row)).toBe(false)
    expect(displayAbilityRoleLabel(row)).toBe("Knack")
  })

  it("labels Warmage pool options as Trick", () => {
    const row = ability({
      id: "blitz",
      name: "Blitz",
      ability_role: "knack",
      eligible_classes: ["Warmage"],
    } as unknown as CustomAbility)
    expect(displayAbilityRoleLabel(row)).toBe("Trick")
  })
})
