import { describe, expect, it } from "vitest"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import { resolveCompanionScaledValue } from "@/lib/character/companion-stat-block"
import { isCompanionStatBlockFeature } from "@/lib/character/companion-recognition"

const REANIMATED_COMPANION = `Reanimated Companion

Medium Undead, Neutral

AC 10 plus your Intelligence modifier

HP 5 plus five times your Artificer level (the companion has a number of Hit Dice [d8s] equal to your Artificer level)

Speed 30 ft.
  	  	Mod 	Save
STR 	11 	+0 	+0
DEX 	10 	+0 	+0
CON 	16 	+3 	+3
  	  	Mod 	Save
INT 	4 	−3 	−3
WIS 	10 	+0 	+0
CHA 	6 	−2 	−2

Resistances Necrotic, Poison

Immunities Lightning; Charmed, Exhaustion, Poisoned

Senses Blindsight 60ft.; Passive Perception 10

Languages Understands the languages you know

CR None (XP 0; PB equals your Proficiency Bonus)

Traits

Death Burst. The companion explodes when it dies. Dexterity Saving Throw: DC equals your spell save DC, each creature in a 10-foot Emanation originating from the companion. Failure: 2d4 Necrotic damage. Success: Half damage.

Lightning Absorption. Whenever the companion is subjected to Lightning damage, it regains a number of Hit Points equal to the Lightning damage dealt.

Actions

Dreadful Swipe. Melee Attack Roll: Bonus equals your spell attack modifier, reach 5 ft. Hit: 1d4 plus your Intelligence modifier Necrotic damage, and the target can't take Opportunity Attacks until the start of its next turn.`

describe("companion recognition", () => {
  it("recognizes Reanimated Companion by name", () => {
    expect(
      isCompanionStatBlockFeature({
        name: "Reanimated Companion",
        description: "Your companion...",
      }),
    ).toBe(true)
  })
})

describe("parseCompanionStatBlock", () => {
  it("parses Reanimated Companion stat block", () => {
    const template = parseCompanionStatBlock("Reanimated Companion", REANIMATED_COMPANION)
    expect(template).not.toBeNull()
    expect(template!.sizeTypeAlignment).toBe("Medium Undead, Neutral")
    expect(template!.speed).toBe("30 ft.")
    expect(template!.abilityScores?.constitution).toEqual({ score: 16, modifier: 3, save: 3 })
    expect(template!.abilityScores?.intelligence).toEqual({ score: 4, modifier: -3, save: -3 })
    expect(template!.resistances).toEqual(["Necrotic", "Poison"])
    expect(template!.traits.map((t) => t.name)).toEqual(["Death Burst", "Lightning Absorption"])
    expect(template!.actions.map((a) => a.name)).toEqual(["Dreadful Swipe"])
  })

  it("parses HTML stat block with Armor Class and table ability scores", () => {
    const html = `<p>Large monstrosity, unaligned</p><p><strong>Armor Class:</strong> 13 plus your Charisma modifier</p><p><strong>Hit Points:</strong> 5 plus five times your Witch level (the familiar has a number of Hit Dice [d8s] equal to your Witch level)</p><p><strong>Speed:</strong> 40 ft., Climb 40 ft.</p><table><tbody><tr><td>STR</td><td>19 (+4)</td></tr><tr><td>DEX</td><td>17 (+3)</td></tr><tr><td>CON</td><td>18 (+4)</td></tr><tr><td>INT</td><td>10 (+0)</td></tr><tr><td>WIS</td><td>11 (+0)</td></tr><tr><td>CHA</td><td>13 (+1)</td></tr></tbody></table><p><strong>Immunities:</strong> Charmed, Frightened</p><p><strong>Senses:</strong> Darkvision 60 ft.; Passive Perception 10</p><p><strong>Actions:</strong><br><em>Multiattack.</em> The familiar makes two Rend attacks.<br><em>Rend.</em> Melee Attack Roll: Bonus equals your spell attack modifier, reach 5 ft. Hit: 1d8 + 4 plus your Charisma modifier Force damage.</p><p><strong>Bonus Actions:</strong><br><em>Rampage.</em> Immediately after dealing damage to a creature that is already Bloodied, the familiar moves up to half its Speed, and it makes one Rend attack.</p>`
    const template = parseCompanionStatBlock("Abominable Familiar Creature Form", html)
    expect(template).not.toBeNull()
    expect(template!.sizeTypeAlignment).toBe("Large monstrosity, unaligned")
    expect(template!.abilityScores?.strength).toEqual({ score: 19, modifier: 4, save: 4 })
    expect(template!.actions.map((a) => a.name)).toEqual(expect.arrayContaining(["Multiattack", "Rend"]))
    expect(template!.bonusActions?.map((a) => a.name)).toEqual(["Rampage"])
    expect(template!.ac.parts.some((p) => p.type === "scale")).toBe(true)
    expect(template!.hp.parts.some((p) => p.type === "scale")).toBe(true)
  })

  it("resolves scaled AC and HP from owner stats", () => {
    const template = parseCompanionStatBlock("Reanimated Companion", REANIMATED_COMPANION)!
    const ctx = {
      abilityMods: {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 3,
        wisdom: 0,
        charisma: 0,
      },
      proficiencyBonus: 3,
      spellAttackModifier: 6,
      spellSaveDc: 14,
      classLevels: [{ className: "Artificer", level: 5 }],
    }
    expect(resolveCompanionScaledValue(template.ac, ctx)).toBe(13)
    expect(resolveCompanionScaledValue(template.hp, ctx)).toBe(30)
  })
})
