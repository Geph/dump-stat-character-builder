import { describe, expect, it } from "vitest"
import {
  aggregateKnackOptions,
  isKnackEligible,
  validateKnackSelectionChange,
} from "@/lib/builder/knack-choices"
import type { CustomAbility } from "@/lib/types"

function knack(partial: Partial<CustomAbility> & Pick<CustomAbility, "name">): CustomAbility {
  return {
    id: partial.id ?? partial.name.toLowerCase().replace(/\s+/g, "-"),
    description: partial.description ?? "",
    prerequisites: partial.prerequisites ?? null,
    characteristics: null,
    attached_to_type: "class",
    attached_to_id: "Alternate Ranger",
    uses: null,
    show_in_builder: true,
    icon: null,
    source: "laserllama",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ability_role: "knack",
    repeatable: partial.repeatable ?? false,
    ...partial,
  }
}

describe("knack choices", () => {
  const knacks = [
    knack({ name: "Slayer I", prerequisites: null }),
    knack({ name: "Slayer II", prerequisites: "Slayer I" }),
    knack({ name: "Favored Foe", repeatable: true }),
  ]

  it("enforces prerequisite chain eligibility", () => {
    expect(isKnackEligible(knacks[1], 5, ["Slayer I"])).toBe(true)
    expect(isKnackEligible(knacks[1], 5, [])).toBe(false)
  })

  it("blocks swapping out a knack required by another", () => {
    const result = validateKnackSelectionChange({
      previous: ["Slayer I", "Slayer II"],
      next: ["Slayer II"],
      customAbilities: knacks,
      classLevel: 9,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/Slayer I/)
  })

  it("allows repeatable Favored Foe twice", () => {
    const result = validateKnackSelectionChange({
      previous: ["Favored Foe"],
      next: ["Favored Foe", "Favored Foe"],
      customAbilities: knacks,
      classLevel: 5,
    })
    expect(result.ok).toBe(true)
    const options = aggregateKnackOptions({
      customAbilities: knacks,
      classNames: ["Alternate Ranger"],
      classLevel: 5,
      selectedKnackNames: ["Favored Foe"],
    })
    expect(options.some((row) => row.name === "Favored Foe")).toBe(true)
  })
})
