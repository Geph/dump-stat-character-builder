import { describe, expect, it } from "vitest"
import {
  buildPartyStats,
  normalizePartyCharacterIds,
  validatePartyMembers,
} from "@/lib/character/party"
import { resolveEffectTargetPolicy } from "@/lib/character/effect-target-policy"
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
