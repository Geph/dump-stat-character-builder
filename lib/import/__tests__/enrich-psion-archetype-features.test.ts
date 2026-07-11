import { describe, expect, it } from "vitest"
import { enrichPsionArchetypeFeatures } from "@/lib/import/enrichment-presets"
import type { ImportContent } from "@/lib/import/content-schema"

describe("enrichPsionArchetypeFeatures", () => {
  it("wires real-time recharge on key archetype features", () => {
    const content = {
      subclasses: [
        {
          name: "Knowing Mind",
          class_name: "KibblesTasty Psion",
          description: null,
          features: [
            { level: 3, name: "Climactic Moment", description: "Influence points." },
            { level: 14, name: "Shattered Husks", description: "Once per target." },
          ],
        },
        {
          name: "Wandering Mind",
          class_name: "KibblesTasty Psion",
          description: null,
          features: [{ level: 14, name: "Planeswalker", description: "Once per day." }],
        },
      ],
    }

    const enriched = enrichPsionArchetypeFeatures(content as unknown as ImportContent)
    const knowing = enriched.subclasses?.[0]
    const climactic = knowing?.features?.find((f) => f.name === "Climactic Moment") as unknown as import("@/lib/types").Feature | undefined
    expect(climactic?.limitedUses?.recharges?.[0]).toMatchObject({
      kind: "real_time",
      mode: "decay",
      minutes: 1,
    })
    expect(climactic?.linkedModifiers?.length).toBeGreaterThan(0)

    const shattered = knowing?.features?.find((f) => f.name === "Shattered Husks") as unknown as import("@/lib/types").Feature | undefined
    expect(shattered?.limitedUses?.recharges?.[0]).toMatchObject({
      kind: "real_time",
      scope: "per_target",
      minutes: 60,
    })

    const planeswalker = enriched.subclasses?.[1]?.features?.find((f) => f.name === "Planeswalker") as unknown as import("@/lib/types").Feature | undefined
    expect(planeswalker?.limitedUses?.recharges?.[0]).toMatchObject({
      kind: "real_time",
      period: "calendar_day",
    })
  })

  it("marks Rampage Die as deferred in description", () => {
    const enriched = enrichPsionArchetypeFeatures({
      subclasses: [
        {
          name: "Unleashed Mind",
          class_name: "Psion",
          description: null,
          features: [{ level: 3, name: "Rampage Die", description: "Escalating die." }],
        },
      ],
    } as unknown as ImportContent)
    const feature = enriched.subclasses?.[0]?.features?.[0]
    expect(feature?.description).toMatch(/not fully modeled/i)
  })
})
