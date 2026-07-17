import { describe, expect, it } from "vitest"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import { resolveCompanionScaledValue } from "@/lib/character/companion-stat-block"
import { isCompanionStatBlockFeature } from "@/lib/character/companion-recognition"
import {
  collectCompanionCandidatesFromClasses,
  resolveCharacterCompanions,
} from "@/lib/character/resolve-companions"
import type { CharacterClassDetail } from "@/lib/character/character-classes"

const FAMILIAR_CTX = {
  abilityMods: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
  proficiencyBonus: 2,
  spellAttackModifier: 5,
  spellSaveDc: 13,
  classLevels: [] as { className: string; level: number }[],
}

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

  it("parses a two-column HTML table stat block (Kibbles Psi Crystal)", () => {
    const html = `<p>You can expend 2 psi points to cast find familiar, but your familiar uses the Psi Crystal statistics and requires a crystal worth 10 gp instead of the spell\u2019s normal material components.</p><table><tbody><tr><td>Creature</td><td>Psi Crystal; Tiny construct, unaligned</td></tr><tr><td>Armor Class</td><td>20 (natural armor)</td></tr><tr><td>Hit Points</td><td>2 (1d4)</td></tr><tr><td>Speed</td><td>0 ft., fly 20 ft. (hover)</td></tr><tr><td>STR</td><td>1 (\u22125)</td></tr><tr><td>DEX</td><td>10 (+0)</td></tr><tr><td>CON</td><td>10 (+0)</td></tr><tr><td>INT</td><td>10 (+0)</td></tr><tr><td>WIS</td><td>10 (+0)</td></tr><tr><td>CHA</td><td>10 (+0)</td></tr><tr><td>Skills</td><td>Perception +4</td></tr><tr><td>Damage Vulnerabilities</td><td>bludgeoning</td></tr><tr><td>Damage Resistances</td><td>piercing, slashing</td></tr><tr><td>Condition Immunities</td><td>blinded, charmed, deafened, frightened, paralyzed, petrified, poisoned, stunned</td></tr><tr><td>Senses</td><td>blindsight 60 ft. (blind beyond this radius), passive Perception 14</td></tr><tr><td>Languages</td><td>Understands the languages of its creator but can\u2019t speak</td></tr></tbody></table>`
    expect(isCompanionStatBlockFeature({ name: "Psi Crystal", description: html })).toBe(true)
    const template = parseCompanionStatBlock("Psi Crystal", html)
    expect(template).not.toBeNull()
    expect(resolveCompanionScaledValue(template!.ac, FAMILIAR_CTX)).toBe(20)
    expect(resolveCompanionScaledValue(template!.hp, FAMILIAR_CTX)).toBe(2)
    expect(template!.hitDiceNote).toBe("1d4")
    expect(template!.speed).toContain("fly 20 ft.")
    expect(template!.abilityScores?.strength).toEqual({ score: 1, modifier: -5, save: -5 })
    expect(template!.abilityScores?.dexterity).toEqual({ score: 10, modifier: 0, save: 0 })
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

describe("Druid Beast forms", () => {
  const druidDetail = (level: number): CharacterClassDetail =>
    ({
      row: { class_id: "druid", level, subclass_id: null },
      class: {
        name: "Druid",
        features: [
          { name: "Druidic", level: 1, description: "You know Druidic." },
          { name: "Wild Shape", level: 2, description: "Shape-shift into a Beast form." },
        ],
      },
      subclass: null,
    }) as unknown as CharacterClassDetail

  it("populates the four SRD recommended forms from Wild Shape", () => {
    const candidates = collectCompanionCandidatesFromClasses([druidDetail(5)])
    expect(candidates.map((c) => c.template.name)).toEqual([
      "Rat",
      "Riding Horse",
      "Spider",
      "Wolf",
    ])
    expect(new Set(candidates.map((c) => `${c.source.featureName}:${c.source.formName}`)).size).toBe(4)
    const wolf = candidates.find((c) => c.template.name === "Wolf")
    expect(wolf?.template.traits.map((t) => t.name)).toContain("Pack Tactics")
    // Wild Shape directions are shown once at the top of the tab, not as a per-form trait.
    expect(wolf?.template.traits.map((t) => t.name)).not.toContain("Wild Shape")
    expect(wolf?.template.polymorph).toBe(true)
  })

  it("does not offer beast forms before Wild Shape is unlocked", () => {
    expect(collectCompanionCandidatesFromClasses([druidDetail(1)])).toHaveLength(0)
  })
})

describe("Find Familiar companion", () => {
  const detailWithFeature = (className: string, featureName: string): CharacterClassDetail =>
    ({
      row: { class_id: className.toLowerCase(), level: 5, subclass_id: null },
      class: { name: className, features: [{ name: featureName, level: 3, description: "" }] },
      subclass: null,
    }) as unknown as CharacterClassDetail

  it("adds a Familiar from the Druid's Wild Companion feature", () => {
    const candidates = collectCompanionCandidatesFromClasses([
      detailWithFeature("Druid", "Wild Companion"),
    ])
    const familiar = candidates.find((c) => c.template.name === "Familiar")
    expect(familiar).toBeDefined()
    expect(familiar!.template.traits.map((t) => t.name)).toEqual(
      expect.arrayContaining(["Telepathic Link", "Shared Senses"]),
    )
    expect(familiar!.template.actions.map((a) => a.name)).toEqual(
      expect.arrayContaining(["General", "Deliver Touch Spells (Reaction)"]),
    )
  })

  it("adds a Familiar from the Warlock's Pact of the Chain feature", () => {
    const candidates = collectCompanionCandidatesFromClasses([
      detailWithFeature("Warlock", "Pact of the Chain"),
    ])
    expect(candidates.some((c) => c.template.name === "Familiar")).toBe(true)
  })

  it("adds a Familiar when the caster knows Find Familiar, deduping with features", () => {
    const wizard = {
      row: { class_id: "wizard", level: 1, subclass_id: null },
      class: { name: "Wizard", features: [] },
      subclass: null,
    } as unknown as CharacterClassDetail

    const fromSpell = resolveCharacterCompanions({
      classDetails: [wizard],
      ctx: FAMILIAR_CTX,
      findFamiliarSpellSource: { className: "Wizard", classId: "wizard" },
    })
    expect(fromSpell.filter((c) => c.template.name === "Familiar")).toHaveLength(1)
    expect(fromSpell[0].maxHp).toBe(1)
    expect(fromSpell[0].polymorph).toBe(false)

    // A Druid with Wild Companion AND the spell still shows only one familiar.
    const druid = {
      row: { class_id: "druid", level: 5, subclass_id: null },
      class: { name: "Druid", features: [{ name: "Wild Companion", level: 3, description: "" }] },
      subclass: null,
    } as unknown as CharacterClassDetail
    const deduped = resolveCharacterCompanions({
      classDetails: [druid],
      ctx: FAMILIAR_CTX,
      findFamiliarSpellSource: { className: "Druid", classId: "druid" },
    })
    expect(deduped.filter((c) => c.template.name === "Familiar")).toHaveLength(1)
  })
})
