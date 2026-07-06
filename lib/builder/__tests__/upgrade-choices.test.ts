import { describe, expect, it } from "vitest"
import { validateUpgradeSelectionChange } from "@/lib/builder/upgrade-choices"
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
  it("rejects duplicate non-repeatable upgrades", () => {
    const result = validateUpgradeSelectionChange({
      next: ["Shield Proficiency", "Shield Proficiency"],
      customAbilities: upgrades,
      classLevel: 5,
    })
    expect(result.ok).toBe(false)
  })
})
