import { describe, expect, it } from "vitest"
import {
  DEFAULT_COMBAT_ACTION_GROUP_ORDER,
  moveActionGroup,
  orderActionGroups,
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
})
