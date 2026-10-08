import { describe, expect, it } from "vitest"
import { isUpgradeEligible, validateUpgradeSelectionChange } from "@/lib/builder/upgrade-choices"
import type { CustomAbility } from "@/lib/types"

const upgrades: CustomAbility[] = [
  {
    id: "1",
    name: "Shield Proficiency",
    description: "Shields",
    characteristics: [],
    modifierRefs: [],
    linked_modifiers: [],
    prerequisites: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: true,
    ability_role: "upgrade",
    repeatable: false,
    level_requirement: 3,
    icon: null,
    accent_color: null,
    card_image_url: null,
    source: "Inventor",
    creator_url: null,
    created_at: "",
    updated_at: "",
  },
]

describe("validateUpgradeSelectionChange", () => {
  it("unlocks upgrade chains only while the required upgrade remains selected", () => {
    const advanced = { ...upgrades[0], id: "advanced", name: "Advanced Shield", prerequisites: "Shield Proficiency", level_requirement: 9 }
    expect(isUpgradeEligible(advanced, 9)).toBe(false)
    expect(isUpgradeEligible(advanced, 8, { selectedAbilityNames: ["Shield Proficiency"] })).toBe(false)
    expect(isUpgradeEligible(advanced, 9, { selectedAbilityNames: ["Shield Proficiency"] })).toBe(true)
    expect(validateUpgradeSelectionChange({ next: ["Shield Proficiency", "Advanced Shield"], customAbilities: [...upgrades, advanced], classLevel: 9 }).ok).toBe(true)
    expect(validateUpgradeSelectionChange({ next: ["Advanced Shield"], customAbilities: [...upgrades, advanced], classLevel: 9 }).ok).toBe(false)
  })
  it("rejects duplicate non-repeatable upgrades", () => {
    const result = validateUpgradeSelectionChange({
      next: ["Shield Proficiency", "Shield Proficiency"],
      customAbilities: upgrades,
      classLevel: 5,
    })
    expect(result.ok).toBe(false)
  })
})
