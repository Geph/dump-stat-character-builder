import { describe, expect, it } from "vitest"
import {
  parseCreatureScaledStat,
  parseCreatureStatBlock,
} from "@/lib/character/parse-creature-stat-block"

const WOLF = `Wolf
Medium Beast, Unaligned
AC 12 Initiative +2 (12)
HP 11 (2d8 + 2)
Speed 40 ft.
MOD SAVE MOD SAVE MOD SAVE
Str 14 +2 +2 Dex 15 +2 +2 Con 12 +1 +1
Int 3 −4 −4 WIS 12 +1 +1 Cha 6 −2 −2
Skills Perception +5, Stealth +4
Senses Darkvision 60 ft.; Passive Perception 15
Languages None
CR 1/4 (XP 50; PB +2)
Traits
Pack Tactics. The wolf has Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.
Actions
Bite. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the Prone condition.`

const BASILISK = `Basilisk Companion
Medium Monstrosity, Unaligned
Armor Class 15 plus PB (natural armor)
Hit Points 7 + 7 times caregiver's level (the basilisk has a
number of d8 Hit Dice equal to their caregiver's level)
Speed 30 ft.
STR DEX CON INT WIS CHA
16 (+3) 10 (+0) 15 (+2) 5 (−3) 12 (+1) 10 (+0)
Saving Throws Con +2 plus PB
Skills Athletics +3 plus PB, Survival +1 plus PB
Senses darkvision 60 ft., passive Perception 11
Proficiency Bonus (PB) equals the caregiver's bonus
ACTIONS
Bite (Signature Attack). Melee Weapon Attack: +3 plus PB to
hit, reach 5 ft., one target. Hit: 1d6 plus PB piercing damage.
1st Level: Poison Spittle (2 Ferocity). The basilisk makes a
signature attack. On a hit, the attack deals an extra PB damage,
and a creature the basilisk chooses within 5 feet of them other
than the target takes PB poison damage.
3rd Level: Poison Gaze (5 Ferocity). The basilisk chooses up
to three creatures they can see within 15 feet of them. Each
creature must succeed on a DC 10 plus PB Constitution saving throw or become poisoned until the start of the basilisk's
next turn.
REACTIONS
Heavy Glare. When the basilisk's caregiver hits a creature
that can see the basilisk, the basilisk can force that creature to
make a DC 10 plus PB Constitution saving throw. On a failure,
the target can't make opportunity attacks and has their speed
reduced by 10 feet until the start of their next turn.`

const MINSTREL = `MINSTREL
MEDIUM OR SMALL HUMANOID, NEUTRAL
AC 14
HP 6 plus six times your Captain level (the minstrel
has a number of Hit Dice [d8s] equal to your
Captain level)
Speed 30 ft.
MOD SAVE MOD SAVE MOD SAVE
STR 9 –1 –1 DEX 14 +2 +4 CON 12 +1 +1
INT 9 –1 –1 WIS 12 +1 +3 CHA 16 +3 +5
Skills Performance +5, Persuasion +5
Proficiencies Simple weapons; Light armor
Gear Daggers (4), Lute, Studded Leather Armor
Senses Passive Perception 10
Languages Common plus one other language
CR None (XP 0; PB equals your Proficiency Bonus)
TRAITS
Level 5: Martial Excellence. The minstrel has
a +1 bonus to its attack and damage rolls. This
bonus increases to +2 at Captain level 9, and +3 at
Captain level 13.
ACTIONS
Dagger. Melee or Ranged Attack Roll: Bonus
equals your Charisma modifier plus your Proficiency
Bonus, reach 5 ft. or range 20/60. Hit: 1d4 plus your
Charisma modifier Piercing damage.
Encouraging Tune. One creature within 60 feet of
the minstrel that can see or hear it has Advantage
on the next attack it makes before the start of the
minstrel's next turn.
BONUS ACTIONS
Level 9: Psychic Strike. The minstrel deals an extra
1d8 Psychic damage on a hit.`

const SKELETON = `SKELETON
MEDIUM UNDEAD, LAWFUL EVIL
AC 14 Initiative +3 (13)
HP 13 (2d8 + 4)
Speed 30 ft.
MOD SAVE MOD SAVE MOD SAVE
STR 10 +0 +0 DEX 16 +3 +3 CON 15 +2 +2
INT 6 –2 –2 WIS 8 –1 –1 CHA 5 –3 –3
Vulnerabilities Bludgeoning
Immunities Poison; Exhaustion, Poisoned
Gear Shortbow, Shortsword
Senses Darkvision 60 ft.; Passive Perception 9
Languages Understands Common plus one other
language but can't speak
CR 1/4 (XP 50; PB +2)
ACTIONS
Shortsword. Melee Attack Roll: +5, reach 5 ft. Hit: 1d6 + 3 Piercing damage.`

describe("parseCreatureScaledStat", () => {
  it("parses fixed plus PB", () => {
    const value = parseCreatureScaledStat("15 plus PB (natural armor)")
    expect(value.parts).toEqual([
      { type: "fixed", value: 15 },
      { type: "scale", ref: { kind: "proficiency_bonus" } },
    ])
  })

  it("parses caregiver level scaling", () => {
    const value = parseCreatureScaledStat("7 + 7 times caregiver's level")
    expect(value.parts[0]).toEqual({ type: "fixed", value: 7 })
    expect(value.parts[1]).toEqual({
      type: "scale",
      ref: { kind: "class_level", multiplier: 7 },
    })
  })

  it("parses named class level scaling with word multipliers", () => {
    const value = parseCreatureScaledStat("6 plus six times your Captain level")
    expect(value.parts).toEqual([
      { type: "fixed", value: 6 },
      { type: "scale", ref: { kind: "class_level", className: "Captain", multiplier: 6 } },
    ])
  })
})

describe("parseCreatureStatBlock", () => {
  it("extracts identity and browse metadata (Wolf)", () => {
    const parsed = parseCreatureStatBlock(WOLF)
    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe("Wolf")
    expect(parsed!.size).toBe("Medium")
    expect(parsed!.creatureType).toBe("Beast")
    expect(parsed!.alignment).toBe("Unaligned")
    expect(parsed!.cr).toBe("1/4")
  })

  it("parses Basilisk companion scaling and header ability scores", () => {
    const parsed = parseCreatureStatBlock(BASILISK)!
    expect(parsed.name).toBe("Basilisk Companion")
    expect(parsed.creatureType).toBe("Monstrosity")
    expect(parsed.template.ac.parts).toEqual([
      { type: "fixed", value: 15 },
      { type: "scale", ref: { kind: "proficiency_bonus" } },
    ])
    expect(parsed.template.hp.parts[0]).toEqual({ type: "fixed", value: 7 })
    expect(parsed.template.hp.parts[1]).toMatchObject({
      type: "scale",
      ref: { kind: "class_level", multiplier: 7 },
    })
    expect(parsed.template.abilityScores?.strength).toEqual({
      score: 16,
      modifier: 3,
      save: 3,
    })
    expect(parsed.template.savingThrows).toContain("Con +2 plus PB")
    expect(parsed.template.actions.map((a) => a.name)).toEqual(
      expect.arrayContaining(["Bite (Signature Attack)", "1st Level: Poison Spittle (2 Ferocity)"]),
    )
    expect(parsed.template.reactions?.map((a) => a.name)).toContain("Heavy Glare")
  })

  it("parses Minstrel Medium or Small, Captain-level HP, gear, and level traits", () => {
    const parsed = parseCreatureStatBlock(MINSTREL)!
    expect(parsed.name).toBe("MINSTREL")
    expect(parsed.size).toBe("Medium or Small")
    expect(parsed.creatureType).toBe("Humanoid")
    expect(parsed.alignment).toBe("Neutral")
    expect(parsed.cr).toBe("None")
    expect(parsed.template.hp.parts).toEqual([
      { type: "fixed", value: 6 },
      { type: "scale", ref: { kind: "class_level", className: "Captain", multiplier: 6 } },
    ])
    expect(parsed.template.abilityScores?.charisma).toEqual({
      score: 16,
      modifier: 3,
      save: 5,
    })
    expect(parsed.template.gear).toContain("Lute")
    expect(parsed.template.proficiencies).toContain("Simple weapons")
    expect(parsed.template.traits.map((t) => t.name)).toContain("Level 5: Martial Excellence")
    expect(parsed.template.bonusActions?.map((a) => a.name)).toContain("Level 9: Psychic Strike")
  })

  it("parses Skeleton vulnerabilities, immunities, and gear", () => {
    const parsed = parseCreatureStatBlock(SKELETON)!
    expect(parsed.name).toBe("SKELETON")
    expect(parsed.creatureType).toBe("Undead")
    expect(parsed.alignment).toBe("Lawful Evil")
    expect(parsed.template.vulnerabilities).toEqual(["Bludgeoning"])
    expect(parsed.template.damageImmunities).toEqual(["Poison"])
    expect(parsed.template.conditionImmunities).toEqual(
      expect.arrayContaining(["Exhaustion", "Poisoned"]),
    )
    expect(parsed.template.gear).toContain("Shortsword")
    expect(parsed.template.actions[0]?.name).toBe("Shortsword")
  })

  it("still parses the classic Wolf block", () => {
    const t = parseCreatureStatBlock(WOLF)!.template
    expect(t.ac.parts).toEqual([{ type: "fixed", value: 12 }])
    expect(t.initiative).toBe("+2 (12)")
    expect(t.traits[0].name).toBe("Pack Tactics")
    expect(t.actions[0].name).toBe("Bite")
  })
})
