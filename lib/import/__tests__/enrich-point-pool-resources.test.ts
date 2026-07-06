import { describe, expect, it } from "vitest"
import {
  enrichPointPoolClassResources,
  remapPointPoolResourceKey,
} from "@/lib/import/enrich-point-pool-resources"
import type { Feature } from "@/lib/types"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"

describe("remapPointPoolResourceKey", () => {
  it("prefixes sorcery_points for homebrew classes but not SRD Sorcerer", () => {
    expect(remapPointPoolResourceKey("Alternate Sorcerer", "sorcery_points")).toBe(
      "alternate_sorcerer_sorcery_points",
    )
    expect(remapPointPoolResourceKey("Sorcerer", "sorcery_points")).toBe("sorcery_points")
  })
})

describe("enrichPointPoolClassResources", () => {
  it("adds Sorcerous Regeneration short-rest recharge to sorcery points", () => {
    const features: Feature[] = [
      { level: 5, name: "Sorcerous Regeneration", description: "Regain points on a short rest." },
    ]
    const resources: ClassResourceImportRow[] = [
      {
        class_name: "Alternate Sorcerer",
        resource_key: "sorcery_points",
        name: "Sorcery Points",
        uses: {
          type: "at_level",
          atLevelMode: "multiply_level",
          atLevelTable: [{ level: 1, count: 1 }],
          recharges: [{ rest: "long_rest" }],
        },
      },
    ]

    const [next] = enrichPointPoolClassResources(
      "Alternate Sorcerer",
      {
        point_pool: {
          resource_key: "alternate_sorcerer_sorcery_points",
          cost_by_level: { 1: 2 },
          replaces_spell_slots: true,
        },
      },
      features,
      resources,
    )

    expect(next.resource_key).toBe("alternate_sorcerer_sorcery_points")
    expect(next.uses.recharges).toEqual(
      expect.arrayContaining([
        { rest: "long_rest" },
        {
          rest: "short_rest",
          amountFormula: "half_class_level_round_up",
          maxPerLongRest: 1,
        },
      ]),
    )
  })
})
