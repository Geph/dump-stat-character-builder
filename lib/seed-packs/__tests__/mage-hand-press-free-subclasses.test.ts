import { describe, expect, it } from "vitest"
import {
  buildMhpFreeSubclassKeySet,
  isMhpBundledAbilityAllowed,
  isMhpFreeSubclassName,
  normalizeSubclassMatchKey,
  prerequisiteOnlyMentionsNonFreeSubclasses,
} from "@/lib/seed-packs/mage-hand-press-free-subclasses"
import alchemist from "@/lib/seed-packs/mage-hand-press/magehandpress-alchemist-class.json"
import gunslinger from "@/lib/seed-packs/mage-hand-press/magehandpress-gunslinger-class.json"
import warmage from "@/lib/seed-packs/mage-hand-press/magehandpress-warmage-class.json"

describe("MHP free subclass allowlist", () => {
  it("normalizes guild apostrophe / plural variants", () => {
    expect(normalizeSubclassMatchKey("Calibaron's Guild")).toBe("calibarons' guild")
    expect(normalizeSubclassMatchKey("Calibarons' Guild")).toBe("calibarons' guild")
    expect(normalizeSubclassMatchKey("Rōnin")).toBe("ronin")
  })

  it("keeps only allowlisted subclasses in bundled alchemist / warmage packs", () => {
    const allow = buildMhpFreeSubclassKeySet()
    const alchemistNames = (alchemist.subclasses ?? []).map((sc: { name: string }) => sc.name)
    expect(alchemistNames.sort()).toEqual(["Apothecary", "Mad Bomber", "Mutagenist"])
    expect(alchemistNames.every((name: string) => isMhpFreeSubclassName(name, allow))).toBe(true)

    const warmageNames = (warmage.subclasses ?? []).map((sc: { name: string }) => sc.name)
    expect(warmageNames).toHaveLength(5)
    expect(warmageNames).toEqual(
      expect.arrayContaining([
        "House of Rooks",
        "House of Pawns",
        "House of Knights",
        "House of Kings",
        "House of Bishops",
      ]),
    )
  })

  it("includes all free gunslinger subclasses and excludes paid subclasses", () => {
    const names = (gunslinger.subclasses ?? []).map((sc: { name: string }) => sc.name)
    expect(names.sort()).toEqual(["Deadeye", "Gun Tank", "Pistolero"])
    expect(names).not.toContain("Musketeer")
    const pistolero = (gunslinger.subclasses ?? []).find(
      (sc: { name: string }) => sc.name === "Pistolero",
    ) as { features?: Array<{ level: number; name: string }> } | undefined
    expect(pistolero?.features?.map((feature) => [feature.level, feature.name])).toEqual([
      [3, "Close-Quarters Shooting"],
      [3, "Fan the Hammer [Maneuver]"],
      [6, "Disarm"],
      [10, "Showdown [Maneuver]"],
      [14, "Bullet Time"],
    ])
  })

  it("rejects paid-subclass abilities and paid-only Warmage house prereqs", () => {
    expect(
      isMhpBundledAbilityAllowed({
        source_type: "subclass",
        source_name: "Musketeer",
      }),
    ).toBe(false)
    expect(
      prerequisiteOnlyMentionsNonFreeSubclasses(
        "House of Cards, House of Darts, House of Dice, or House of Roulette",
      ),
    ).toBe(true)
    expect(prerequisiteOnlyMentionsNonFreeSubclasses("House of Rooks")).toBe(false)
  })

  it("ships no paid-subclass abilities in bundled class JSON", () => {
    const allow = buildMhpFreeSubclassKeySet()
    for (const pack of [alchemist, gunslinger, warmage] as const) {
      const abilities = (pack as { abilities?: Array<Record<string, unknown>> }).abilities ?? []
      for (const ability of abilities) {
        expect(
          isMhpBundledAbilityAllowed(ability, allow),
          `${String(ability.name)} should be free-allowlisted`,
        ).toBe(true)
      }
    }
    const warmageNames = ((warmage as { abilities?: { name: string }[] }).abilities ?? []).map(
      (a) => a.name,
    )
    expect(warmageNames).not.toContain("Blackjack")
    expect(warmageNames).not.toContain("Dartmaster")
  })
})
