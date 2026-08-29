import { describe, expect, it } from "vitest"
import {
  buildHitDicePool,
  recoverHitDiceOnLongRest,
  recoverHitDiceUpTo,
  rollHitDiceHeal,
  spendHitDiceFromPool,
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

  it("regains up to N expended hit dice, preferring the named class pool", () => {
    const pool = buildHitDicePool(
      [
        {
          row: { class_id: "martyr", level: 12, order: 0 },
          class: { id: "martyr", name: "Martyr", hit_die: 8 } as never,
        },
      ],
      { martyr: 5 },
    )
    expect(recoverHitDiceUpTo({ martyr: 5 }, pool, 3, "martyr")).toEqual({
      nextUsedByClassId: { martyr: 2 },
      recovered: 3,
    })
    expect(recoverHitDiceUpTo({ martyr: 1 }, pool, 3, "martyr")).toEqual({
      nextUsedByClassId: {},
      recovered: 1,
    })
    expect(recoverHitDiceUpTo({}, pool, 3, "martyr")).toEqual({
      nextUsedByClassId: {},
      recovered: 0,
    })
  })

  it("spends hit dice for feature fuel from the preferred class pool", () => {
    const pool = buildHitDicePool(
      [
        {
          row: { class_id: "warden", level: 5, order: 0 },
          class: { id: "warden", name: "Warden", hit_die: 10 } as never,
        },
      ],
      {},
    )
    const result = spendHitDiceFromPool({
      usedByClassId: {},
      pool,
      amount: 2,
      preferClassId: "warden",
    })
    expect(result.applied).toBe(true)
    expect(result.nextUsedByClassId).toEqual({ warden: 2 })
    expect(
      spendHitDiceFromPool({
        usedByClassId: { warden: 4 },
        pool: buildHitDicePool(
          [
            {
              row: { class_id: "warden", level: 5, order: 0 },
              class: { id: "warden", name: "Warden", hit_die: 10 } as never,
            },
          ],
          { warden: 4 },
        ),
        amount: 2,
      }).applied,
    ).toBe(false)
  })
})
