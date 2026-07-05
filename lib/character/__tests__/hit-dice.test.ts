import { describe, expect, it } from "vitest"
import {
  buildHitDicePool,
  recoverHitDiceOnLongRest,
  rollHitDiceHeal,
} from "@/lib/character/hit-dice"

describe("hit-dice", () => {
  it("builds per-class hit dice pools from class rows", () => {
    expect(
      buildHitDicePool(
        [
          {
            row: { class_id: "fighter", level: 6, order: 0 },
            class: { id: "fighter", name: "Fighter", hit_die: 10 } as never,
          },
        ],
        { fighter: 2 },
      ),
    ).toEqual([
      {
        classId: "fighter",
        className: "Fighter",
        die: 10,
        total: 6,
        spent: 2,
        remaining: 4,
      },
    ])
  })

  it("rolls hit dice healing with constitution modifier per die", () => {
    expect(
      rollHitDiceHeal({
        die: 10,
        count: 2,
        conMod: 2,
        random: () => 0,
      }),
    ).toEqual({
      rolls: [1, 1],
      modifier: 4,
      total: 6,
    })
  })

  it("regains half total hit dice on a long rest", () => {
    const pool = buildHitDicePool(
      [
        {
          row: { class_id: "fighter", level: 6, order: 0 },
          class: { id: "fighter", name: "Fighter", hit_die: 10 } as never,
        },
      ],
      { fighter: 4 },
    )

    expect(recoverHitDiceOnLongRest({ fighter: 4 }, pool)).toEqual({ fighter: 1 })
  })
})
