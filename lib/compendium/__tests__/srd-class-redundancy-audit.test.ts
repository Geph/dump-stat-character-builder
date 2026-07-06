import { describe, expect, it } from "vitest"
import classes from "@/lib/srd/seed-data/classes.json"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { WEAPON_MASTERY_CATALOG_ID } from "@/lib/compendium/weapon-mastery-catalog"
import type { Feature, FeatureEffect } from "@/lib/types"

const MARTIAL_WEAPON_MASTERY_CLASSES = ["Barbarian", "Fighter", "Paladin", "Ranger", "Rogue"]

function checkRollFingerprint(effect: FeatureEffect): string | null {
  if (effect.kind !== "check_roll_modifier") return null
  return [
    effect.checkCategory ?? "",
    (effect.checkAbility ?? "").toLowerCase(),
    effect.checkRollMode ?? "",
    effect.checkSkills?.[0] ?? "",
  ].join("|")
}

function collectCheckRollEffects(feature: Feature): FeatureEffect[] {
  return (
    feature.linkedModifiers?.flatMap((mod) => mod.activation?.effects ?? []) ?? []
  ).filter((effect) => effect.kind === "check_roll_modifier")
}

function findDuplicateCheckRolls(feature: Feature): string[] {
  const seen = new Map<string, number>()
  for (const effect of collectCheckRollEffects(feature)) {
    const key = checkRollFingerprint(effect)
    if (!key) continue
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key)
}

describe("SRD class enrichment audit", () => {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])

  it("does not duplicate check/save roll modifiers on any class feature", () => {
    const violations: string[] = []
    for (const cls of enriched) {
      const className = String(cls.name)
      for (const feature of (cls.features ?? []) as unknown as unknown as Feature[]) {
        const dupes = findDuplicateCheckRolls(feature)
        for (const dupe of dupes) {
          violations.push(`${className} L${feature.level} ${feature.name}: ${dupe}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it("wires Weapon Mastery as a repeatable compendium-backed choice for martial classes", () => {
    for (const className of MARTIAL_WEAPON_MASTERY_CLASSES) {
      const cls = enriched.find((row) => row.name === className)
      expect(cls, `${className} missing from SRD`).toBeTruthy()
      const wm = ((cls!.features ?? []) as unknown as unknown as Feature[]).find((f) => f.name === "Weapon Mastery")
      expect(wm?.isChoice).toBe(true)
      expect(wm?.choices?.choiceCountByLevel?.length).toBeGreaterThan(0)
      expect(wm?.choices?.resourceKey).toBeUndefined()
      expect(wm?.choices?.options?.length ?? 0).toBeGreaterThan(0)
      const hasLegacyPicker = (wm?.linkedModifiers ?? []).some((mod) =>
        mod.characteristics?.some((c) => (c as { type?: string }).type === "feature_option_picker"),
      )
      expect(hasLegacyPicker).toBe(false)
    }
  })

  it("includes Weapon Mastery in the common modifier catalog for manual linking", async () => {
    const { buildDefaultModifierCatalog } = await import("@/lib/compendium/modifier-catalog")
    const catalog = buildDefaultModifierCatalog()
    expect(catalog.some((entry) => entry.id === WEAPON_MASTERY_CATALOG_ID)).toBe(true)
  })
})
