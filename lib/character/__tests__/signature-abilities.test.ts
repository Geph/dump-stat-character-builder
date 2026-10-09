import { describe, expect, it } from "vitest"
import { defaultSignatureAction, parseSignatureTarget, placeSignature } from "@/lib/character/signature-abilities"
import type { SheetActionEntry } from "@/lib/character/sheet-actions"

describe("signature abilities", () => {
  it("selects the first resource action without depending on a class or ability name", () => {
    const actions = [{ id: "passive" }, { id: "resource", limitedUses: { classResourceKey: "custom_pool" } }, { id: "later", classResourceKey: "another_pool" }] as SheetActionEntry[]
    expect(defaultSignatureAction(actions)).toEqual({ kind: "action", id: "resource" })
    expect(defaultSignatureAction([])).toBeNull()
  })
  it("moves rather than duplicates a pin and permits explicit empty slots", () => {
    const target = { kind: "spell" as const, id: "spell" }
    const original = [target, null] as [typeof target, null]
    expect(placeSignature(original, 1, target)).toEqual([null, target])
    expect(placeSignature(original, 0, null)).toEqual([null, null])
    expect(original).toEqual([target, null])
  })
  it("rejects malformed storage and drag payloads", () => {
    for (const value of [null, [], { kind: "class", id: "a" }, { kind: "spell", id: " " }, { kind: "action", id: 12 }]) expect(parseSignatureTarget(value)).toBeNull()
    expect(parseSignatureTarget({ kind: "action", id: "feature:123" })).toEqual({ kind: "action", id: "feature:123" })
  })
})
