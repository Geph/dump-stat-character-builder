import { describe, expect, it } from "vitest"
import {
  parseSpecialAttackFromPowerDescription,
  specialAttackModifierFromPowerDescription,
} from "@/lib/import/parse-special-attack-from-power"
import { enrichAbilityImportRow } from "@/lib/import/enrich-ability-import"

describe("parseSpecialAttackFromPowerDescription", () => {
  it("wires Mind Leech as a Charisma force_save psychic attack", () => {
    const parsed = parseSpecialAttackFromPowerDescription(
      `<p>A target you can see within range must make a Charisma saving throw or take 1d6 psychic damage. If it is Frightened, it instead takes 1d12 psychic damage.</p>
<p>You can spend psi points up to your per-use limit to add multiple modifiers to Mind Leech.</p>
<ul><li><strong>Devouring (2 psi points):</strong> Area effect.</li></ul>`,
      { name: "Mind Leech", range: "30 feet" },
    )
    expect(parsed).toMatchObject({
      attackProfile: "force_save",
      targetMode: "single",
      damageDiceCount: 1,
      damageDieType: "d6",
      damageTypes: ["Psychic"],
      saveAbility: "Charisma",
      rangeFeet: 30,
    })
  })

  it("wires Elemental Blast as a ranged spell attack", () => {
    const parsed = parseSpecialAttackFromPowerDescription(
      "Make a ranged spell attack against a target within range. On a hit, it takes 1d8 cold, fire, force, or lightning damage.",
      { name: "Elemental Blast", range: "30 feet" },
    )
    expect(parsed).toMatchObject({
      attackProfile: "ranged",
      damageDiceCount: 1,
      damageDieType: "d8",
      rangeFeet: 30,
    })
    expect(parsed?.damageTypes.sort()).toEqual(["Cold", "Fire", "Force", "Lightning"])
  })

  it("wires Astral Construct melee spell attack", () => {
    const parsed = parseSpecialAttackFromPowerDescription(
      "To attack with it, make a melee spell attack. On a hit, the target takes 1d8 force damage.",
      { name: "Astral Construct", range: "60 feet" },
    )
    expect(parsed).toMatchObject({
      attackProfile: "melee",
      damageDieType: "d8",
      damageTypes: ["Force"],
    })
  })

  it("skips non-damaging powers like Enhancing Surge", () => {
    expect(
      parseSpecialAttackFromPowerDescription(
        "The target gains 1d6 temporary hit points, and the next time it deals damage, it deals 1d6 additional damage.",
        { name: "Enhancing Surge" },
      ),
    ).toBeNull()
  })

  it("attaches special_attack on psionic_power enrich", () => {
    const row = enrichAbilityImportRow({
      name: "Telekinetic Force",
      ability_role: "psionic_power",
      range: "60 feet",
      description:
        "<p>You smash a target. The target must succeed on a Strength saving throw or take 1d10 bludgeoning damage and either be shoved 5 feet or knocked Prone.</p>",
    })
    const chars = (
      (row.linkedModifiers ?? row.linked_modifiers) as {
        characteristics?: { type?: string; saveAbility?: string; damageDieType?: string }[]
      }[]
    ).flatMap((instance) => instance.characteristics ?? [])
    const special = chars.find((char) => char.type === "special_attack")
    expect(special).toMatchObject({
      type: "special_attack",
      saveAbility: "Strength",
      damageDieType: "d10",
    })
    expect(specialAttackModifierFromPowerDescription(String(row.description), { name: "Telekinetic Force" })).toBeTruthy()
  })

  it("sets Action activation from casting time on Mind Leech", () => {
    const row = enrichAbilityImportRow({
      name: "Mind Leech",
      ability_role: "psionic_power",
      casting_time: "1 action",
      range: "30 feet",
      description:
        "<p>A target you can see within range must make a Charisma saving throw or take 1d6 psychic damage.</p>",
    })
    const instances = (row.linkedModifiers ?? row.linked_modifiers) as {
      activation?: { action?: boolean; bonusAction?: boolean }
      characteristics?: { type?: string }[]
    }[]
    const special = instances.find((instance) =>
      instance.characteristics?.some((char) => char.type === "special_attack"),
    )
    expect(special?.activation).toEqual({ action: true })
  })

  it("sets Bonus Action activation when casting time is a bonus action", () => {
    const mod = specialAttackModifierFromPowerDescription(
      "Make a ranged spell attack. On a hit, it takes 1d8 fire damage.",
      { name: "Elemental Blast", castingTime: "1 bonus action", range: "30 feet" },
    )
    expect(mod?.activation).toEqual({ bonusAction: true })
  })
})
