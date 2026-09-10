import { describe, expect, it } from "vitest"
import { featureChoiceKey } from "@/lib/builder/choices"
import { modifierPlayerChoiceSlotKey } from "@/lib/builder/modifier-player-choices"
import {
  linkedEquipmentChoiceKeys,
  resolveLinkedEquipmentChoiceName,
} from "@/lib/character/linked-equipment-choice"

const classId = "649a44c9-f6f9-433c-b906-719e1f2bdf38"
const actionId = `${classId}:2:Dead Space`
const choiceId = "mod_import_class_feature_necromancer_dead_space_eq"

describe("linked equipment choice keys", () => {
  it("writes both the overlay key and the level-up modifier slot", () => {
    const keys = linkedEquipmentChoiceKeys({
      actionId,
      classId,
      featureName: "Dead Space",
      featureLevel: 2,
      choiceId,
    })
    expect(keys).toEqual([
      `player-equipment:${actionId}:${choiceId}`,
      modifierPlayerChoiceSlotKey(
        featureChoiceKey(classId, "Dead Space", 2),
        choiceId,
        "equipment",
      ),
    ])
  })

  it("reads a level-up slot when the overlay key is empty", () => {
    const slotKey = modifierPlayerChoiceSlotKey(
      featureChoiceKey(classId, "Dead Space", 2),
      choiceId,
      "equipment",
    )
    expect(
      resolveLinkedEquipmentChoiceName({
        picks: { [slotKey]: ["Cloak"] },
        actionId,
        classId,
        featureName: "Dead Space",
        featureLevel: 2,
        choiceId,
      }),
    ).toBe("Cloak")
  })

  it("finds an equipment slot even when the modifier id no longer matches", () => {
    expect(
      resolveLinkedEquipmentChoiceName({
        picks: {
          [`${classId}:L2:Dead Space::mod_old_id::equipment`]: ["Backpack"],
        },
        actionId,
        classId,
        featureName: "Dead Space",
        featureLevel: 2,
        choiceId: "mod_new_id",
      }),
    ).toBe("Backpack")
  })
})
