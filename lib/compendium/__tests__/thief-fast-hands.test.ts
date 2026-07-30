import { describe, expect, it } from "vitest"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import type { Feature } from "@/lib/types"
import bundledSubclasses from "@/lib/srd/seed-data/subclasses.json"

describe("Thief Fast Hands enrichment", () => {
  it("wires a free Bonus Action menu with Sleight of Hand and Use an Object", () => {
    const seed = bundledSubclasses.find((row) => row.name === "Thief")
    expect(seed).toBeTruthy()

    const enriched = enrichSrdSubclassRow({ ...seed! }, "Rogue", [])
    const fastHands = (enriched.features as Feature[]).find((feature) => feature.name === "Fast Hands")
    expect(fastHands).toBeTruthy()
    expect(fastHands!.isChoice).toBeFalsy()
    expect(fastHands!.activation?.bonusAction).toBe(true)

    const menu = (fastHands!.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .find((characteristic) => characteristic.type === "resource_ability_menu")
    expect(menu).toMatchObject({
      type: "resource_ability_menu",
      waiveResourceCost: true,
    })
    expect(menu && "options" in menu ? menu.options.map((option) => option.name) : []).toEqual([
      "Sleight of Hand",
      "Use an Object",
    ])
    expect(fastHands!.description).toContain("<strong>Sleight of Hand.</strong>")
    expect(fastHands!.description).toContain("<strong>Use an Object.</strong>")
    expect(fastHands!.description).not.toMatch(/_Sleight of Hand\._/)
  })
})
