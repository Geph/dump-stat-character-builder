import { describe, expect, it } from "vitest"
import {
  createIllusionToken,
  damageIllusionToken,
  dismissIllusionToken,
  normalizeIllusionTokens,
} from "@/lib/character/illusion-tokens"

describe("illusion tokens", () => {
  it("creates Projected Self and Imaginary Ally with 1 HP", () => {
    const projected = createIllusionToken({ kind: "projected_self" })
    expect(projected).toMatchObject({
      kind: "projected_self",
      label: "Projected Self",
      currentHp: 1,
      maxHp: 1,
    })
    expect(projected.notes).toMatch(/Concentration/i)

    const ally = createIllusionToken({ kind: "imaginary_ally", ac: 13 })
    expect(ally).toMatchObject({
      kind: "imaginary_ally",
      label: "Imaginary Ally",
      ac: 13,
      currentHp: 1,
    })
  })

  it("removes tokens on damage to 0 or dismiss", () => {
    const token = createIllusionToken({ kind: "projected_self" })
    expect(damageIllusionToken([token], token.id)).toEqual([])
    expect(dismissIllusionToken([token], token.id)).toEqual([])
  })

  it("normalizes persisted token arrays", () => {
    const tokens = normalizeIllusionTokens([
      { id: "a", kind: "projected_self", currentHp: 5, label: "PS" },
      { id: "", kind: "imaginary_ally" },
      { kind: "nope" },
    ])
    expect(tokens).toEqual([
      {
        id: "a",
        kind: "projected_self",
        label: "PS",
        ac: null,
        currentHp: 1,
        maxHp: 1,
        notes: "",
      },
    ])
  })
})
