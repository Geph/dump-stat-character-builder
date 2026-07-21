import { describe, expect, it } from "vitest"
import {
  buildGatedClassResourceRowsForSubclass,
  filterCompendiumClassResourcesBySubclasses,
  gatedClassResourcesUnlockedBySubclass,
  isGatedClassResourceUnlockedForClass,
} from "@/lib/compendium/subclass-gated-class-resources"
import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"

describe("subclass-gated class resources", () => {
  it("does not ship superiority or psionic pools on base Fighter/Rogue defaults", () => {
    const fighterIds = SRD_CLASS_RESOURCES_BY_NAME.Fighter.map((row) => row.id)
    const rogueIds = SRD_CLASS_RESOURCES_BY_NAME.Rogue.map((row) => row.id)
    expect(fighterIds).not.toContain("superiority_dice")
    expect(fighterIds).not.toContain("psionic_energy_dice")
    expect(rogueIds).not.toContain("psionic_energy_dice")
  })

  it("unlocks Superiority Dice for Battle Master and Psionic Dice for Psi Warrior / Psi Knight", () => {
    expect(gatedClassResourcesUnlockedBySubclass("Fighter", "Battle Master").map((r) => r.id)).toEqual([
      "superiority_dice",
    ])
    expect(gatedClassResourcesUnlockedBySubclass("Fighter", "Psi Warrior").map((r) => r.id)).toEqual([
      "psionic_energy_dice",
    ])
    expect(gatedClassResourcesUnlockedBySubclass("Fighter", "Psi Knight").map((r) => r.id)).toEqual([
      "psionic_energy_dice",
    ])
    expect(gatedClassResourcesUnlockedBySubclass("Rogue", "Soulknife").map((r) => r.id)).toEqual([
      "psionic_energy_dice",
    ])
    expect(gatedClassResourcesUnlockedBySubclass("Psion", "Unleashed Mind").map((r) => r.id)).toEqual([
      "rampage_die",
    ])
    expect(gatedClassResourcesUnlockedBySubclass("Warden", "Grey Watchman").map((r) => r.id)).toEqual([
      "battle_dice",
    ])
    expect(
      gatedClassResourcesUnlockedBySubclass("Mage Hand Press Warden", "Grey Watchman").map((r) => r.id),
    ).toEqual(["battle_dice"])
    expect(gatedClassResourcesUnlockedBySubclass("Fighter", "Champion")).toEqual([])
  })

  it("hides gated pools in the Class Resources list until unlockers are loaded", () => {
    const rows = [
      { class_id: "fighter", resource_key: "second_wind" },
      { class_id: "fighter", resource_key: "superiority_dice" },
      { class_id: "fighter", resource_key: "psionic_energy_dice" },
      { class_id: "rogue", resource_key: "psionic_energy_dice" },
    ]
    const classNamesById = { fighter: "Fighter", rogue: "Rogue" }

    expect(
      filterCompendiumClassResourcesBySubclasses(rows, classNamesById, [
        { class_id: "fighter", name: "Champion" },
      ]).map((row) => row.resource_key),
    ).toEqual(["second_wind"])

    expect(
      filterCompendiumClassResourcesBySubclasses(rows, classNamesById, [
        { class_id: "fighter", name: "Battle Master" },
        { class_id: "fighter", name: "Psi Warrior" },
        { class_id: "rogue", name: "Soulknife" },
      ]).map((row) => row.resource_key),
    ).toEqual([
      "second_wind",
      "superiority_dice",
      "psionic_energy_dice",
      "psionic_energy_dice",
    ])
  })

  it("builds persist rows when an unlocker subclass is imported", () => {
    const rows = buildGatedClassResourceRowsForSubclass(
      "cls-fighter",
      "Fighter",
      "Battle Master",
      "Tasha's",
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      class_id: "cls-fighter",
      resource_key: "superiority_dice",
      name: "Superiority Dice",
      source: "Tasha's",
    })

    const rampageRows = buildGatedClassResourceRowsForSubclass(
      "cls-psion",
      "Psion",
      "Unleashed Mind",
      "KibblesTasty",
    )
    expect(rampageRows[0]).toMatchObject({
      class_id: "cls-psion",
      resource_key: "rampage_die",
      name: "Rampage Die",
      uses: { type: "special", dieType: "d4" },
    })
  })

  it("treats unloaded gated keys as locked for a class", () => {
    expect(isGatedClassResourceUnlockedForClass("superiority_dice", "Fighter", [])).toBe(false)
    expect(
      isGatedClassResourceUnlockedForClass("superiority_dice", "Fighter", ["Battle Master"]),
    ).toBe(true)
    expect(isGatedClassResourceUnlockedForClass("second_wind", "Fighter", [])).toBe(true)
    expect(isGatedClassResourceUnlockedForClass("battle_dice", "Warden", [])).toBe(false)
    expect(
      isGatedClassResourceUnlockedForClass("battle_dice", "Warden", ["Grey Watchman"]),
    ).toBe(true)
    // Captain (and other non-Warden Battle Dice classes) stay ungated.
    expect(isGatedClassResourceUnlockedForClass("battle_dice", "Captain", [])).toBe(true)
  })
})
