import { describe, expect, it } from "vitest"

import { aggregateAsiBonuses, type AsiAllocationsByFeatId } from "@/lib/builder/asi-allocation"
import { BACKGROUND_ASI_KEY } from "@/lib/builder/background-asi"

const CLASS_A = "7072130c-5a53-4322-af76-d0bb1b6035b2"
const CLASS_B = "713648ab-868e-4078-8c52-6e61ed4eee54"
const asiKey = (classId: string) =>
  `feat:${classId}:Ability Score Improvement::ref::cat_char_ability_scores::mod_modinst_asi_asi`

describe("aggregateAsiBonuses", () => {
  it("excludes background_asi from ASI totals", () => {
    const allocations: AsiAllocationsByFeatId = {
      [BACKGROUND_ASI_KEY]: { wisdom: 2, intelligence: 1 },
      milestone_asi: { strength: 2 },
    }
    expect(aggregateAsiBonuses(allocations)).toEqual({ strength: 2 })
  })

  it("sums all pool allocations when no valid source-id set is provided (legacy behavior)", () => {
    const allocations: AsiAllocationsByFeatId = {
      [asiKey(CLASS_A)]: { wisdom: 2 },
      [asiKey(CLASS_B)]: { wisdom: 1, constitution: 1 },
    }
    expect(aggregateAsiBonuses(allocations)).toEqual({ wisdom: 3, constitution: 1 })
  })

  it("drops pool allocations whose source id is no longer on the character", () => {
    const allocations: AsiAllocationsByFeatId = {
      // Orphan left over from a previously-selected class.
      [asiKey(CLASS_A)]: { wisdom: 2 },
      // Current class ASI.
      [asiKey(CLASS_B)]: { wisdom: 1, constitution: 1 },
    }
    expect(aggregateAsiBonuses(allocations, new Set([CLASS_B]))).toEqual({
      wisdom: 1,
      constitution: 1,
    })
  })

  it("keeps pool allocations whose key embeds no source id", () => {
    const allocations: AsiAllocationsByFeatId = {
      "species_refs::ref::cat::mod": { constitution: 1 },
      [asiKey(CLASS_A)]: { wisdom: 2 },
    }
    // species_refs has no UUID, so it is preserved; CLASS_A is orphaned.
    expect(aggregateAsiBonuses(allocations, new Set([CLASS_B]))).toEqual({ constitution: 1 })
  })

  it("keeps legacy allocation keys without a ref marker", () => {
    const allocations: AsiAllocationsByFeatId = {
      legacyFeatId: { strength: 2 },
    }
    expect(aggregateAsiBonuses(allocations, new Set())).toEqual({ strength: 2 })
  })
})
