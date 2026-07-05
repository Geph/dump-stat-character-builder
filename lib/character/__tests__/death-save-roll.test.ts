import { describe, expect, it } from "vitest"
import { applyDeathSaveRoll } from "@/lib/character/death-save-roll"

describe("applyDeathSaveRoll", () => {
  const base = { successes: 0, failures: 0 }

  it("adds one success on 10+", () => {
    expect(applyDeathSaveRoll(14, base)).toEqual({ successes: 1, failures: 0 })
  })

  it("adds one failure below 10", () => {
    expect(applyDeathSaveRoll(7, base)).toEqual({ successes: 0, failures: 1 })
  })

  it("adds two failures on natural 1", () => {
    expect(applyDeathSaveRoll(1, base)).toEqual({ successes: 0, failures: 2 })
  })

  it("clears saves on natural 20", () => {
    expect(applyDeathSaveRoll(20, { successes: 2, failures: 1 })).toEqual({
      successes: 0,
      failures: 0,
    })
  })

  it("caps successes and failures at 3", () => {
    expect(applyDeathSaveRoll(15, { successes: 2, failures: 0 })).toEqual({
      successes: 3,
      failures: 0,
    })
    expect(applyDeathSaveRoll(4, { successes: 0, failures: 2 })).toEqual({
      successes: 0,
      failures: 3,
    })
    expect(applyDeathSaveRoll(1, { successes: 0, failures: 2 })).toEqual({
      successes: 0,
      failures: 3,
    })
  })
})
