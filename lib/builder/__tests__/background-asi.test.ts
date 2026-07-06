import { describe, expect, it } from "vitest"
import {
  aggregateBackgroundAbilityBonuses,
  BACKGROUND_ASI_KEY,
  getBackgroundAbilityGrant,
  getBackgroundAsiHelpText,
  isValidBackgroundAsiAllocation,
} from "@/lib/builder/background-asi"
import type { Background } from "@/lib/types"

function legacyBackground(): Background {
  return {
    id: "apothecary",
    name: "Apothecary",
    description: null,
    ability_bonuses: null,
    skill_proficiencies: ["Medicine"],
    tool_proficiencies: null,
    proficiencies: null,
    feat_granted: null,
    starting_gold: null,
    starting_equipment: null,
    starting_equipment_groups: null,
    equipment: null,
    feature: { name: "Herblore", description: "You know herbs." },
    icon: null,
    source: "Homebrew",
    creator_url: null,
    created_at: "",
  } as unknown as unknown as Background
}

function modernChoiceBackground(): Background {
  return {
    ...legacyBackground(),
    id: "acolyte",
    name: "Acolyte",
    ability_bonuses: { intelligence: 0, wisdom: 0, charisma: 0 },
    feat_granted: "Magic Initiate (Cleric)",
  } as unknown as unknown as Background
}

function fixedBonusBackground(): Background {
  return {
    ...legacyBackground(),
    id: "custom",
    name: "Custom",
    ability_bonuses: { strength: 2, constitution: 1 },
    feat_granted: "Alert",
  } as unknown as unknown as Background
}

describe("getBackgroundAbilityGrant", () => {
  it("offers all six abilities when ability_bonuses is null", () => {
    const grant = getBackgroundAbilityGrant(legacyBackground())
    expect(grant.needsChoice).toBe(true)
    expect(grant.eligible).toHaveLength(6)
    expect(grant.fixed).toEqual({})
  })

  it("keeps three zero-valued eligible keys for 2024-style backgrounds", () => {
    const grant = getBackgroundAbilityGrant(modernChoiceBackground())
    expect(grant.needsChoice).toBe(true)
    expect(grant.eligible.sort()).toEqual(["charisma", "intelligence", "wisdom"])
  })

  it("returns fixed bonuses without a choice", () => {
    const grant = getBackgroundAbilityGrant(fixedBonusBackground())
    expect(grant.needsChoice).toBe(false)
    expect(grant.fixed).toEqual({ strength: 2, constitution: 1 })
  })
})

describe("isValidBackgroundAsiAllocation", () => {
  it("accepts +2/+1 across any abilities for legacy backgrounds", () => {
    const grant = getBackgroundAbilityGrant(legacyBackground())
    expect(
      isValidBackgroundAsiAllocation({ strength: 2, dexterity: 1 }, grant.eligible),
    ).toBe(true)
  })

  it("accepts +1/+1/+1 across any three abilities for legacy backgrounds", () => {
    const grant = getBackgroundAbilityGrant(legacyBackground())
    expect(
      isValidBackgroundAsiAllocation(
        { strength: 1, intelligence: 1, charisma: 1 },
        grant.eligible,
      ),
    ).toBe(true)
  })

  it("rejects +1/+1/+1 when fewer than three abilities are boosted", () => {
    const grant = getBackgroundAbilityGrant(legacyBackground())
    expect(isValidBackgroundAsiAllocation({ strength: 1, dexterity: 1 }, grant.eligible)).toBe(
      false,
    )
  })

  it("keeps 2024 three-eligible validation unchanged", () => {
    const grant = getBackgroundAbilityGrant(modernChoiceBackground())
    expect(isValidBackgroundAsiAllocation({ intelligence: 2, wisdom: 1 }, grant.eligible)).toBe(
      true,
    )
    expect(
      isValidBackgroundAsiAllocation({ intelligence: 1, wisdom: 1, charisma: 1 }, grant.eligible),
    ).toBe(true)
    expect(isValidBackgroundAsiAllocation({ strength: 2, dexterity: 1 }, grant.eligible)).toBe(
      false,
    )
  })
})

describe("getBackgroundAsiHelpText", () => {
  it("uses free-choice wording for legacy backgrounds", () => {
    const grant = getBackgroundAbilityGrant(legacyBackground())
    expect(getBackgroundAsiHelpText(grant)).toMatch(/three ability scores/i)
  })

  it("uses eligible wording for 2024 backgrounds", () => {
    const grant = getBackgroundAbilityGrant(modernChoiceBackground())
    expect(getBackgroundAsiHelpText(grant)).toMatch(/eligible scores/i)
  })
})

describe("aggregateBackgroundAbilityBonuses", () => {
  it("applies legacy player allocation", () => {
    const totals = aggregateBackgroundAbilityBonuses(legacyBackground(), {
      [BACKGROUND_ASI_KEY]: { constitution: 2, wisdom: 1 },
    })
    expect(totals).toEqual({ constitution: 2, wisdom: 1 })
  })
})
