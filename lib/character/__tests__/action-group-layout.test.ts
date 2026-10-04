import { describe, expect, it } from "vitest"
import {
  DEFAULT_COMBAT_ACTION_GROUP_ORDER,
  defaultActionGroupColumn,
  isNoOpActionGroupSlot,
  moveActionGroup,
  orderActionGroups,
  placeActionGroup,
} from "@/lib/character/action-group-layout"

describe("action group layout", () => {
  it("uses the combat default pairing when nothing is saved", () => {
    const groups = [
      { id: "triggered" },
      { id: "reaction" },
      { id: "weapons" },
      { id: "bonus" },
      { id: "action" },
    ]
    expect(orderActionGroups(groups, [], (group) => group.id).map((group) => group.id)).toEqual([
      "weapons",
      "action",
      "triggered",
      "bonus",
      "reaction",
    ])
  })

  it("assigns the default row pairs to independent columns", () => {
    expect(defaultActionGroupColumn("weapons")).toBe(0)
    expect(defaultActionGroupColumn("action")).toBe(1)
    expect(defaultActionGroupColumn("triggered")).toBe(0)
    expect(defaultActionGroupColumn("bonus")).toBe(1)
    expect(defaultActionGroupColumn("reaction")).toBe(0)
  })

  it("honors a saved order and keeps new groups at the end", () => {
    const groups = [{ id: "action" }, { id: "bonus" }, { id: "triggered" }]
    expect(
      orderActionGroups(groups, ["triggered", "action"], (group) => group.id).map((group) => group.id),
    ).toEqual(["triggered", "action", "bonus"])
  })

  it("moves a group onto another group's slot", () => {
    expect(
      moveActionGroup(DEFAULT_COMBAT_ACTION_GROUP_ORDER, [], "triggered", "reaction"),
    ).toEqual(["weapons", "action", "bonus", "reaction", "triggered", "weapon-attack"])
  })

  it("places a dragged group before the target in either direction", () => {
    const ids = ["weapons", "action", "triggered", "bonus", "reaction"]
    expect(placeActionGroup(ids, "reaction", "action", ["weapons", "triggered", "reaction"])).toEqual([
      "weapons",
      "reaction",
      "action",
      "triggered",
      "bonus",
    ])
    expect(placeActionGroup(ids, "weapons", "reaction", ["weapons", "triggered", "reaction"])).toEqual([
      "action",
      "triggered",
      "bonus",
      "weapons",
      "reaction",
    ])
  })

  it("drops at the end of a column after that column's last group", () => {
    const ids = ["weapons", "action", "triggered", "bonus", "reaction"]
    expect(placeActionGroup(ids, "reaction", null, ["action", "bonus"])).toEqual([
      "weapons",
      "action",
      "triggered",
      "bonus",
      "reaction",
    ])
    expect(placeActionGroup(ids, "weapons", null, ["action", "bonus"])).toEqual([
      "action",
      "triggered",
      "bonus",
      "weapons",
      "reaction",
    ])
    expect(placeActionGroup(ids, "action", null, [])).toEqual([
      "weapons",
      "triggered",
      "bonus",
      "reaction",
      "action",
    ])
  })

  it("flags slots that would not move the group", () => {
    const column = ["weapons", "triggered", "reaction"]
    expect(isNoOpActionGroupSlot({ column: 0, beforeId: "triggered" }, "triggered", 0, column)).toBe(true)
    expect(isNoOpActionGroupSlot({ column: 0, beforeId: "reaction" }, "triggered", 0, column)).toBe(true)
    expect(isNoOpActionGroupSlot({ column: 0, beforeId: null }, "reaction", 0, column)).toBe(true)
    expect(isNoOpActionGroupSlot({ column: 0, beforeId: "weapons" }, "triggered", 0, column)).toBe(false)
    expect(isNoOpActionGroupSlot({ column: 1, beforeId: null }, "triggered", 0, column)).toBe(false)
  })
})
