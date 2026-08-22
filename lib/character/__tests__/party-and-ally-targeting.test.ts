import { describe, expect, it } from "vitest"
import {
  buildPartyStats,
  normalizePartyCharacterIds,
  validatePartyMembers,
} from "@/lib/character/party"
import { applyAllyEffectLocally } from "@/lib/character/apply-ally-effect"
import { collectPartyAllyCandidates } from "@/lib/character/party-ally-candidates"
import {
  collectTargetableEffects,
  inferAllyBuffEffect,
  inferAllyHealEffect,
  inferDirectCompanionEffect,
  inferGrantInspirationEffect,
  resolveEffectTargetPolicy,
} from "@/lib/character/effect-target-policy"
import { defaultSheetPlayState } from "@/lib/character/sheet-play-state"
import { resolveFeatureEffectHealAmount } from "@/lib/character/resolve-feature-effect-heal"
import {
  dashboardPartyHref,
  parseDashboardPartyParam,
} from "@/lib/character/dashboard-url"
import type { Character } from "@/lib/types"

describe("adventuring parties", () => {
  it("validates member counts and normalizes ids", () => {
    expect(normalizePartyCharacterIds(["a", "a", "b", ""])).toEqual(["a", "b"])
    expect(validatePartyMembers(["a"]).ok).toBe(false)
    expect(validatePartyMembers(["a", "b"]).ok).toBe(true)
  })

  it("builds simple party stats from last saved sheet state", () => {
    const charactersById = new Map<string, Character>([
      [
        "a",
        {
          id: "a",
          name: "A",
          level: 4,
          hit_points: 20,
          hit_point_max: 30,
          sheet_state: { currentHp: 18, tempHp: 0 },
        } as Character,
      ],
      [
        "b",
        {
          id: "b",
          name: "B",
          level: 6,
          hit_points: 40,
          hit_point_max: 40,
          sheet_state: null,
        } as Character,
      ],
    ])
    const stats = buildPartyStats({ character_ids: ["a", "b", "missing"] }, charactersById)
    expect(stats.memberCount).toBe(3)
    expect(stats.averageLevel).toBe(5)
    expect(stats.totalCurrentHp).toBe(58)
    expect(stats.totalMaxHp).toBe(70)
    expect(stats.missingCharacterIds).toEqual(["missing"])
  })

  it("builds dashboard party hrefs", () => {
    expect(parseDashboardPartyParam("  abc  ")).toBe("abc")
    expect(dashboardPartyHref("party-1")).toBe("/dashboard?party=party-1")
  })
})

describe("ally heal targeting", () => {
  it("resolves choose_ally from healTarget / rollTarget / label", () => {
    expect(resolveEffectTargetPolicy({ kind: "heal_self", healTarget: "choose_ally" })).toBe(
      "choose_ally",
    )
    expect(resolveEffectTargetPolicy({ kind: "heal_self", rollTarget: "ally" })).toBe("choose_ally")
    expect(
      resolveEffectTargetPolicy({ kind: "grant_temp_hp", label: "Grant 5 temp HP to an ally" }),
    ).toBe("choose_ally")
    expect(resolveEffectTargetPolicy({ kind: "heal_self", healTarget: "self" })).toBe("self")
    expect(resolveEffectTargetPolicy({ kind: "modify_creature", rollTarget: "ally" })).toBe(
      "choose_ally",
    )
    expect(
      resolveEffectTargetPolicy({
        kind: "movement_option",
        label: "An ally within 30 ft moves half their Speed",
      }),
    ).toBe("choose_ally")
  })

  it("collects buffs, conditions, movement, and inspiration for the ally picker", () => {
    const collected = collectTargetableEffects([
      { id: "bi", kind: "modify_creature", rollTarget: "ally" },
      { id: "veil", kind: "modify_creature", rollTarget: "ally", effectConditionTypes: ["Invisible"] },
      {
        id: "move",
        kind: "movement_option",
        label: "Then an ally within 30 ft moves half their Speed",
      },
      { id: "adv", kind: "check_roll_modifier", checkRollMode: "advantage", rollTarget: "ally" },
      { id: "insp", kind: "grant_inspiration", healTarget: "choose_ally" },
      { id: "self-dash", kind: "movement_option", movementDash: true },
      { id: "cut", kind: "modify_creature", rollTarget: "enemy" },
    ])
    expect(collected.map((row) => row.effect.id)).toEqual(["bi", "veil", "move", "adv", "insp"])
    expect(collected.every((row) => row.policy === "choose_ally")).toBe(true)
  })

  it("infers Heroic Inspiration grants to allies from action text", () => {
    const inferred = inferGrantInspirationEffect(
      "Encouraging Song",
      "After a Short or Long Rest, give Heroic Inspiration to PB allies who hear you",
    )
    expect(inferred?.kind).toBe("grant_inspiration")
    expect(inferred?.healTarget).toBe("choose_ally")
    expect(
      inferGrantInspirationEffect("Bardic Inspiration", "Give a creature a Bardic Inspiration die"),
    ).toBeNull()
  })

  it("infers Rally heals and Blitz/Bolster cohort targeting", () => {
    const rally = inferAllyHealEffect(
      "Rally",
      "Expend one Battle Die to choose one ally. That creature regains Hit Points equal to the number rolled + your Charisma modifier.",
    )
    expect(rally).toMatchObject({
      kind: "heal_self",
      healTarget: "choose_ally",
      healAbility: "CHA",
    })

    const blitz = inferDirectCompanionEffect(
      "Blitz",
      "Once on each of your turns, you can direct your Cohort or an ally within 60 feet of yourself.",
    )
    expect(blitz).toMatchObject({
      kind: "modify_creature",
      healTarget: "choose_ally",
    })

    const bolster = inferAllyBuffEffect(
      "Bolster",
      "As a Bonus Action, you can expend one Battle Die to motivate an ally within 60 feet of yourself. The next time your ally makes an attack, it adds the Battle Die to the attack and damage roll.",
    )
    expect(bolster).toMatchObject({
      kind: "modify_creature",
      rollTarget: "ally",
    })
  })
})

describe("party ally candidates", () => {
  it("includes this character and their companion even with no party", () => {
    const charactersById = new Map<string, Character>([
      [
        "solo",
        {
          id: "solo",
          name: "Druid",
          companion_state: [{ key: "wolf", currentHp: 11, tempHp: 4, customName: "Ash" }],
        } as Character,
      ],
    ])
    const rows = collectPartyAllyCandidates([], charactersById, {
      includeSelfId: "solo",
      includeCompanions: true,
    })
    expect(rows.map((row) => row.label)).toEqual(["Druid", "Druid's Ash"])
    const companion = rows.find((row) => row.kind === "companion")
    expect(companion?.tempHp).toBe(4)
    expect(companion?.currentHp).toBe(11)
  })
})

describe("apply ally effects", () => {
  const healContext = { characterLevel: 5, proficiencyBonus: 3, abilityMods: {} }

  it("stores temp HP on a companion", () => {
    const result = applyAllyEffectLocally({
      effect: { id: "thp", kind: "grant_temp_hp", healMode: "fixed", healFixed: 8 },
      target: { kind: "companion", characterId: "solo", companionKey: "wolf", label: "Ash" },
      healContext,
      companion: { key: "wolf", currentHp: 11, tempHp: 2 },
    })
    expect(result?.kind).toBe("temp_hp")
    expect(result?.companionPatch?.tempHp).toBe(8)
    expect(result?.companionPatch?.currentHp).toBeUndefined()
  })

  it("heals a companion without clearing temp HP", () => {
    const result = applyAllyEffectLocally({
      effect: { id: "heal", kind: "heal_self", healMode: "fixed", healFixed: 5 },
      target: { kind: "companion", characterId: "solo", companionKey: "wolf", label: "Ash" },
      healContext,
      companion: { key: "wolf", currentHp: 11, tempHp: 4 },
      maxHp: 20,
    })
    expect(result?.companionPatch?.currentHp).toBe(16)
    expect(result?.companionPatch?.tempHp).toBeUndefined()
  })

  it("applies conditions, inspiration, and a duration reminder on a character", () => {
    const play = defaultSheetPlayState()
    const invisible = applyAllyEffectLocally({
      effect: {
        id: "veil",
        kind: "modify_creature",
        rollTarget: "ally",
        effectConditionTypes: ["Invisible"],
      },
      target: { kind: "character", characterId: "ally", label: "Bard" },
      healContext,
      play,
    })
    expect(invisible?.playPatch?.activeConditions).toContain("Invisible")

    const inspiration = applyAllyEffectLocally({
      effect: { id: "insp", kind: "grant_inspiration", healTarget: "choose_ally" },
      target: { kind: "character", characterId: "ally", label: "Bard" },
      healContext,
      play,
    })
    expect(inspiration?.playPatch?.hasInspiration).toBe(true)

    const buff = applyAllyEffectLocally({
      effect: { id: "bi", kind: "modify_creature", rollTarget: "ally", label: "Bardic Inspiration" },
      target: { kind: "character", characterId: "ally", label: "Bard" },
      healContext,
      play,
    })
    expect(buff?.playPatch?.durationReminders?.some((row) => row.label === "Bardic Inspiration")).toBe(
      true,
    )
  })

  it("resolves heal amounts from feature effects", () => {
    expect(
      resolveFeatureEffectHealAmount(
        { id: "1", kind: "heal_self", healMode: "fixed", healFixed: 8, healFlatBonus: 2 },
        { characterLevel: 5, proficiencyBonus: 3, abilityMods: {} },
      ),
    ).toBe(10)
    expect(
      resolveFeatureEffectHealAmount(
        {
          id: "2",
          kind: "heal_self",
          healMode: "proficiency",
          healProficiencyMultiplier: 2,
        },
        { characterLevel: 5, proficiencyBonus: 3, abilityMods: {} },
      ),
    ).toBe(6)
  })
})
