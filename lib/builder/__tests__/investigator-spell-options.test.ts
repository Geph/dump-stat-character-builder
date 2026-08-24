import { describe, expect, it } from "vitest"
import { spellOptionsForModifierSlot } from "@/lib/builder/modifier-player-choices"
import type { Spell } from "@/lib/types"

function spell(name: string, extras: Partial<Spell> = {}): Spell {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    level: 1,
    school: "Abjuration",
    classes: extras.classes ?? ["Wizard"],
    ...extras,
  } as Spell
}

const slot = {
  slotKey: "class:investigator::mod::spell:0",
  sourceKey: "class:investigator",
  sourceLabel: "Ritualist",
  modId: "mod",
  kind: "spell" as const,
  label: "Choose 4 level-1 spells",
  maxCount: 4,
  spellLevel: 1,
  spellListClassNames: ["Investigator"],
}

describe("spellOptionsForModifierSlot Investigator list", () => {
  const catalog = [
    spell("Alarm"),
    spell("Blood Print", { classes: ["Investigator"] }),
    spell("Detect Magic"),
    spell("Accelerate/decelerate", { classes: ["Wizard"] }),
    spell("Ballistic Smite", { classes: ["Paladin"] }),
  ]

  it("keeps official Investigator spells even when the catalog row lacks the class tag", () => {
    const names = spellOptionsForModifierSlot(slot, catalog, {}).map((row) => row.name)
    expect(names).toEqual(["Alarm", "Blood Print", "Detect Magic"])
  })

  it("hides other level-1 spells that are not on the Investigator list", () => {
    const names = spellOptionsForModifierSlot(slot, catalog, {}).map((row) => row.name)
    expect(names).not.toContain("Accelerate/decelerate")
    expect(names).not.toContain("Ballistic Smite")
  })

  it("allows any Investigator spell up to a Ritual Level max for grimoire level-ups", () => {
    const upToSlot = {
      ...slot,
      slotKey: "class:investigator::mod::spell:2",
      label: "Choose 2 spells (up to level 2)",
      maxCount: 2,
      spellLevel: 2,
      spellLevelIsMax: true,
    }
    const mixed = [
      ...catalog,
      spell("Augury", { level: 2, classes: ["Cleric"] }),
      spell("Fly", { level: 3, classes: ["Wizard"] }),
    ]
    const names = spellOptionsForModifierSlot(upToSlot, mixed, {}).map((row) => row.name)
    expect(names).toEqual(expect.arrayContaining(["Alarm", "Blood Print", "Detect Magic", "Augury"]))
    expect(names).not.toContain("Fly")
    expect(names).not.toContain("Accelerate/decelerate")
  })
})
