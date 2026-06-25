import { describe, expect, it } from "vitest"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import { getWeaponMastery } from "@/lib/compendium/combat-stats"
import type { Equipment } from "@/lib/types"

describe("weapon mastery", () => {
  it("describes standard mastery properties case-insensitively", () => {
    expect(describeWeaponMastery("Topple")).toMatch(/Prone/)
    expect(describeWeaponMastery("graze")).toMatch(/misses/)
  })

  it("returns null for unknown homebrew masteries", () => {
    expect(describeWeaponMastery("Explode")).toBeNull()
  })

  it("reads mastery from top-level equipment field", () => {
    const weapon = { mastery: "Sap" } as Equipment
    expect(getWeaponMastery(weapon)).toBe("Sap")
  })
})
