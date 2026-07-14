import { describe, expect, it } from "vitest"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { resolveActionUsesTrackingKey } from "@/lib/character/action-uses-key"
import {
  ACTION_SURGE_FEATURE_USES,
  INDOMITABLE_FEATURE_USES,
  INNATE_SORCERY_FEATURE_USES,
} from "@/lib/compendium/class-resource-features"
import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import classes from "@/lib/srd/seed-data/classes.json"

describe("feature-owned Action Surge / Indomitable / Innate Sorcery", () => {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])

  it("no longer ships those pools as class resources", () => {
    const fighterIds = SRD_CLASS_RESOURCES_BY_NAME.Fighter.map((row) => row.id)
    const sorcererIds = SRD_CLASS_RESOURCES_BY_NAME.Sorcerer.map((row) => row.id)
    expect(fighterIds).not.toContain("action_surge")
    expect(fighterIds).not.toContain("indomitable")
    expect(sorcererIds).not.toContain("innate_sorcery")
  })

  it("puts level-scaled limitedUses on the Fighter features", () => {
    const fighter = enriched.find((row) => row.name === "Fighter")!
    const features = fighter.features as Array<{
      name: string
      limitedUses?: { type: string; useShareKey?: string | null }
      sheetDisplay?: { combatActions?: boolean }
    }>

    const surge = features.find((feature) => feature.name === "Action Surge")!
    expect(surge.limitedUses).toMatchObject(ACTION_SURGE_FEATURE_USES)
    expect(surge.sheetDisplay?.combatActions).toBe(true)

    const indomitable = features.find((feature) => feature.name === "Indomitable")!
    expect(indomitable.limitedUses).toMatchObject(INDOMITABLE_FEATURE_USES)
    expect(indomitable.sheetDisplay?.combatActions).toBe(true)
  })

  it("puts shared Innate Sorcery uses on the Sorcerer feature", () => {
    const sorcerer = enriched.find((row) => row.name === "Sorcerer")!
    const innate = (sorcerer.features as Array<{ name: string; limitedUses?: unknown }>).find(
      (feature) => feature.name === "Innate Sorcery",
    )!
    expect(innate.limitedUses).toMatchObject(INNATE_SORCERY_FEATURE_USES)
  })

  it("shares use tracking across Innate Sorcery and features with the same useShareKey", () => {
    expect(
      resolveActionUsesTrackingKey({
        id: "class:1:Innate Sorcery",
        limitedUses: INNATE_SORCERY_FEATURE_USES,
      }),
    ).toBe("share:innate_sorcery")
    expect(
      resolveActionUsesTrackingKey({
        id: "class:6:Abyssal Rupture",
        limitedUses: INNATE_SORCERY_FEATURE_USES,
      }),
    ).toBe("share:innate_sorcery")
  })
})
