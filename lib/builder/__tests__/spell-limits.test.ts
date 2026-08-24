import { describe, expect, it } from "vitest"
import { canSelectSpell, getSpellLimits } from "@/lib/builder/spell-limits"

describe("getSpellLimits", () => {
  it("does not invent cantrips for ability-only ritualists", () => {
    expect(getSpellLimits({ ability: "Intelligence" }, 1, "Investigator")).toMatchObject({
      cantrips: 0,
    })
  })

  it("keeps an explicit zero cantrip count", () => {
    expect(
      getSpellLimits({ ability: "Intelligence", cantrips: 0, spells_known: 4 }, 1, "Investigator"),
    ).toMatchObject({ cantrips: 0, prepared: 4 })
  })

  it("does not invent a prepared budget for ability-only casters", () => {
    expect(getSpellLimits({ ability: "Intelligence" }, 1, "Warmage")).toMatchObject({
      cantrips: 0,
      prepared: 0,
      maxSpellLevel: 0,
    })
  })

  it("still defaults cantrips for full casters without a progression table", () => {
    expect(getSpellLimits({ ability: "Intelligence", caster_progression: "full" }, 1, "Wizard")).toMatchObject({
      cantrips: 3,
    })
  })
})

describe("canSelectSpell", () => {
  const alarm = { id: "alarm", name: "Alarm", level: 1, classes: ["Investigator"] }
  const light = { id: "light", name: "Light", level: 0, classes: ["Wizard"] }

  it("blocks cantrips when the class has none", () => {
    const limits = { cantrips: 0, prepared: 4, maxSpellLevel: 1 }
    expect(canSelectSpell(light, [], [light], limits, "Wizard")).toBe(false)
    expect(canSelectSpell(alarm, [], [alarm], limits, "Investigator")).toBe(true)
  })
})
