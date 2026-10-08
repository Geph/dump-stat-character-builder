import { describe, expect, it } from "vitest"
import {
  DEFAULT_COMBAT_ACTION_GROUP_ORDER,
  defaultActionGroupColumn,
  isNoOpActionGroupSlot,
  moveActionGroup,
  orderActionGroups,
  placeActionGroup,
  packActionGroups,
} from "@/lib/character/action-group-layout"

describe("action group layout", () => {
  it("fills the shorter measured column while anchoring weapons on the left", () => {
    const layout = packActionGroups(["weapons", "action", "triggered", "bonus", "reaction"],
      { weapons: 240, action: 160, triggered: 80, bonus: 100, reaction: 70 }, 2)
    expect(layout.map(({ id, column, top }) => ({ id, column, top }))).toEqual([
      { id: "weapons", column: 0, top: 0 },
      { id: "action", column: 1, top: 0 },
      { id: "triggered", column: 1, top: 170 },
      { id: "bonus", column: 0, top: 250 },
      { id: "reaction", column: 1, top: 260 },
    ])
  })

  it("honors a dragged column while continuing to balance unpinned groups", () => {
    const layout = packActionGroups(["weapons", "reaction", "action"],
      { weapons: 240, reaction: 70, action: 160 }, 2, { reaction: 0 })
    expect(layout[1]).toMatchObject({ column: 0, top: 250 })
    expect(layout[2]).toMatchObject({ column: 1, top: 0 })
  })

  it("stacks in saved order on narrow screens without discarding desktop preferences", () => {
    const layout = packActionGroups(["bonus", "weapons", "action"],
      { bonus: 90, weapons: 200, action: 120 }, 1, { bonus: 1 })
    expect(layout.map((p) => [p.column, p.top])).toEqual([[0, 0], [0, 100], [0, 310]])
  })

  it("reflows resized content without overlap or duplicated groups", () => {
    const ids = ["weapons", "action", "triggered", "bonus", "reaction"]
    for (const actionHeight of [60, 200, 600]) {
      const layout = packActionGroups(ids, { weapons: 230, action: actionHeight, triggered: 100, bonus: 120, reaction: 90 }, 2)
      expect(new Set(layout.map((p) => p.id)).size).toBe(ids.length)
      for (const column of [0, 1]) {
        const entries = layout.filter((p) => p.column === column)
        for (let i = 1; i < entries.length; i++) expect(entries[i].top).toBeGreaterThanOrEqual(entries[i - 1].top + entries[i - 1].height + 10)
      }
    }
  })

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
