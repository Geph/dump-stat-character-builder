import { describe, expect, it } from "vitest"
import { knackAbilitiesForClass } from "@/lib/builder/knack-choices"
import { mergeSharedAbilityRows } from "@/lib/import/merge-shared-ability-rows"
import type { CustomAbility } from "@/lib/types"

const lookups = {
  classes: [
    { id: "vagabond", name: "Vagabond" },
    { id: "warden", name: "Warden" },
  ],
  subclasses: [{ id: "grey-watchman", name: "Grey Watchman", class_id: "warden" }],
}

const TEXT = "<p>When you hit a creature, you can expend one Battle Die as a Bonus Action to grapple it.</p>"

const wardenRow = {
  id: "row-1",
  name: "Test Hug",
  ability_role: "knack",
  description: TEXT,
  attached_to_type: "subclass",
  attached_to_id: "grey-watchman",
  eligible_classes: ["Warden"],
  level_requirement: 3,
}

const vagabondRow = {
  name: "Test Hug",
  ability_role: "knack",
  description: TEXT,
  attached_to_type: "class",
  attached_to_id: "vagabond",
  eligible_classes: null,
  level_requirement: 1,
}

describe("mergeSharedAbilityRows", () => {
  it("keeps a maneuver shared by two classes eligible for both", () => {
    const [merged] = mergeSharedAbilityRows([vagabondRow], [wardenRow], lookups)
    expect(merged).toMatchObject({
      attached_to_type: "class",
      attached_to_id: "vagabond",
      eligible_classes: ["Vagabond", "Warden"],
      level_requirement: 1,
    })
    const rows = [merged as unknown as CustomAbility]
    expect(knackAbilitiesForClass(rows, ["Vagabond"]).map((a) => a.name)).toEqual(["Test Hug"])
    expect(
      knackAbilitiesForClass(rows, ["Warden"], { subclassName: "Grey Watchman" }).map((a) => a.name),
    ).toEqual(["Test Hug"])
  })

  it("merges the other way when the Warden is imported second", () => {
    const vagabondExisting = { ...vagabondRow, id: "row-2" }
    const [merged] = mergeSharedAbilityRows([{ ...wardenRow, id: undefined }], [vagabondExisting], lookups)
    expect(merged?.eligible_classes).toEqual(["Warden", "Vagabond"])
    expect(merged?.level_requirement).toBe(1)
  })

  it("leaves same-class re-imports and different rules text alone", () => {
    expect(mergeSharedAbilityRows([vagabondRow], [{ ...vagabondRow, id: "x" }], lookups)[0]).toBe(vagabondRow)
    const different = { ...vagabondRow, description: "<p>Something else entirely.</p>" }
    expect(mergeSharedAbilityRows([different], [wardenRow], lookups)[0]).toBe(different)
    const notKnack = { ...vagabondRow, ability_role: null }
    expect(mergeSharedAbilityRows([notKnack], [wardenRow], lookups)[0]).toBe(notKnack)
  })
})
