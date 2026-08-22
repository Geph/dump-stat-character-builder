import { describe, expect, it } from "vitest"
import {
  ensureCaptainVantagePointClimb,
  sanitizeCaptainSubclassFeatures,
} from "@/lib/compendium/captain-feature-wiring"
import { collectBuilderModifierRefIds } from "@/lib/compendium/builder-modifier-refs"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { filterDisplaySpeedEntries, resolveAllSpeeds } from "@/lib/character/resolve-all-speeds"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import type { ImportContent } from "@/lib/import/content-schema"
import type { DndClass, Feature, Subclass } from "@/lib/types"
import captain from "@/lib/seed-packs/mage-hand-press/magehandpress-captain-class.json"

describe("Eagle Banner Vantage Point climb speed", () => {
  it("wires climb equal_to_walk when the feature has no linkedModifiers", () => {
    const bare: Feature = {
      level: 6,
      name: "Vantage Point",
      description: "<p>You have a Climb Speed equal to your Speed.</p>",
    }
    const wired = ensureCaptainVantagePointClimb(bare)
    const climb = (wired.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "speed" && char.speedType === "climb")
    expect(climb).toMatchObject({ mode: "equal_to_walk", value: 0 })
  })

  it("replaces a broken climb add/0 stub with equal_to_walk", () => {
    const broken: Feature = {
      level: 6,
      name: "Vantage Point",
      description: "",
      linkedModifiers: [
        {
          instanceId: "bad",
          catalogRefId: "cat_char_speed",
          characteristics: [
            { id: "mod_bad", type: "speed", speedType: "climb", mode: "add", value: 0 },
          ],
        },
      ],
    }
    const wired = ensureCaptainVantagePointClimb(broken)
    const climbs = (wired.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .filter((char) => char.type === "speed" && char.speedType === "climb")
    expect(climbs).toHaveLength(1)
    expect(climbs[0]).toMatchObject({ mode: "equal_to_walk" })
  })

  it("enrichment preset attaches climb on bare Vantage Point", () => {
    const enriched = applyImportEnrichmentPresets({
      classes: [{ name: "Captain", description: "", hit_die: 8, primary_ability: ["Charisma"], features: [] }],
      subclasses: [
        {
          name: "Eagle Banner",
          class_name: "Captain",
          description: null,
          features: [
            {
              level: 6,
              name: "Vantage Point",
              description: "You have a Climb Speed equal to your Speed.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)

    const vantage = enriched.subclasses?.[0]?.features?.find((f) => f.name === "Vantage Point") as Feature
    const climb = (vantage.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "speed" && char.speedType === "climb")
    expect(climb).toMatchObject({ mode: "equal_to_walk" })
  })

  it("seed + collectBuilderModifierRefIds yields displayed climb speed", () => {
    const eagle = captain.subclasses.find((s) => s.name === "Eagle Banner")
    expect(eagle).toBeTruthy()
    const features = sanitizeCaptainSubclassFeatures(eagle!.features as Feature[]) ?? []

    const cls = {
      ...(captain.classes[0] as object),
      id: "class_captain",
      name: "Captain",
      features: (captain.classes[0].features ?? []) as Feature[],
    } as DndClass
    const subclass = {
      ...(eagle as object),
      id: "sc_eagle",
      class_id: "class_captain",
      features,
    } as Subclass

    // Strip climb from seed to prove runtime sanitize restores it.
    subclass.features = (eagle!.features as Feature[]).map((feature) =>
      feature.name === "Vantage Point" ? { ...feature, linkedModifiers: [], modifierRefs: [] } : feature,
    )

    const mods = collectBuilderModifierRefIds({
      catalog: [],
      speciesTraitPicks: {},
      feats: [],
      selectedFeatIds: [],
      classLevels: [{ classId: "class_captain", level: 6 }],
      classes: [cls],
      subclasses: [subclass],
      subclassByClassId: { class_captain: "sc_eagle" },
      featureChoicePicks: {},
    })

    expect(mods.some((m) => m.type === "speed" && m.speedType === "climb" && m.mode === "equal_to_walk")).toBe(
      true,
    )

    const aggregated = aggregateCharacteristics(mods)
    const speeds = filterDisplaySpeedEntries(
      resolveAllSpeeds({
        walkSpeed: 30,
        aggregatedSpeed: aggregated.speed,
        speedEqualToWalk: aggregated.speedEqualToWalk,
      }),
    )
    expect(speeds.some((e) => e.type === "climb" && e.feet === 30)).toBe(true)
  })
})
