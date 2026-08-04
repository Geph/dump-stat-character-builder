import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeNecromancerImportContent } from "@/lib/import/enrichment-presets/packs/necromancer"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { Feature } from "@/lib/types"

const PATH = resolveHomebrewImportJsonPath("magehandpress-necromancer-class")
const hasDriveFixture = Boolean(PATH)

function load() {
  return parseImportContentJson(readFileSync(PATH!, "utf8"))!
}

function enrich() {
  return enrichImportContentModifiers(applyClassSpellListsToImport(applyImportEnrichmentPresets(load())))
}

describe("Necromancer import sanitizer (synthetic)", () => {
  it("sanitizes bare multiply_level charnel_touch shapes", () => {
    const next = sanitizeNecromancerImportContent({
      classes: [{ name: "Necromancer", description: "", hit_die: 6, primary_ability: ["Intelligence"], features: [] }],
      class_resources: [
        {
          class_name: "Necromancer",
          resource_key: "charnel_touch",
          name: "Charnel Touch",
          uses: { type: "multiply_level", multiplier: 5, recharges: [{ rest: "long_rest" }] } as never,
        },
      ],
    })
    expect(next.class_resources?.[0]?.uses).toMatchObject({
      type: "at_level",
      atLevelMode: "multiply_level",
      atLevelTable: [{ level: 1, count: 5 }],
    })
  })
})

describe.skipIf(!hasDriveFixture)("Necromancer Drive import wiring", () => {
  it("keeps charnel_touch as at_level multiply_level and thrall caps as special", () => {
    const content = enrich()
    const charnel = content.class_resources?.find((r) => r.resource_key === "charnel_touch")
    expect(charnel?.uses).toMatchObject({
      type: "at_level",
      atLevelMode: "multiply_level",
      atLevelTable: [{ level: 1, count: 5 }],
    })
    expect(content.class_resources?.find((r) => r.resource_key === "thralls")?.uses.type).toBe("special")
    expect(content.class_resources?.find((r) => r.resource_key === "thrall_cr_total")?.uses.type).toBe(
      "special",
    )
  })

  it("wires Thralls grant_creature without class_upgrades picker", () => {
    const content = enrich()
    const thralls = content.classes?.[0]?.features?.find((f) => f.name === "Thralls") as Feature | undefined
    expect(thralls?.choices).toBeUndefined()
    expect(thralls?.isChoice).toBeFalsy()
    const grant = thralls?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "grant_creature") as { choiceOptions?: string[] } | undefined
    expect(grant?.choiceOptions).toEqual(
      expect.arrayContaining(["Skeleton", "Spirit", "Zombie", "Deadnaught"]),
    )
  })

  it("wires INT prepared spellcasting with Cantrips/Prepared progression", () => {
    const content = enrich()
    const spellcasting = content.classes?.[0]?.spellcasting
    expect(spellcasting).toMatchObject({
      ability: "Intelligence",
      caster_progression: "full",
      prepared: true,
    })
    expect(spellcasting?.progression).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 1, cantrips: 3, prepared: 4 }),
        expect.objectContaining({ level: 10, cantrips: 5, prepared: 15 }),
        expect.objectContaining({ level: 20, cantrips: 5, prepared: 22 }),
      ]),
    )
    const spellcastingFeature = content.classes?.[0]?.features?.find((f) => f.name === "Spellcasting")
    expect(String(spellcastingFeature?.description ?? "").toLowerCase()).not.toContain(
      "pasted class table",
    )
  })

  it("wires Charnel Touch, Dark Arcana, Undying Servitude, and Lichdom immunities", () => {
    const content = enrich()
    const charnel = content.classes?.[0]?.features?.find((f) => f.name === "Charnel Touch") as Feature | undefined
    expect(charnel?.activation?.action).toBe(true)

    const dark = content.classes?.[0]?.features?.find((f) => f.name === "Dark Arcana") as Feature | undefined
    expect(dark?.activation?.bonusAction).toBe(true)

    const undying = content.classes?.[0]?.features?.find((f) => f.name === "Undying Servitude") as Feature | undefined
    expect(undying?.activation?.reaction).toBe(true)

    const lichdom = content.classes?.[0]?.features?.find((f) => f.name === "Lichdom") as Feature | undefined
    const characteristics =
      lichdom?.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
    expect(characteristics.find((row) => row.type === "damage_immunity")).toMatchObject({
      damageTypes: expect.arrayContaining(["Necrotic", "Poison"]),
    })
    expect(characteristics.find((row) => row.type === "condition_immunity")).toMatchObject({
      conditions: expect.arrayContaining(["Exhaustion", "Poisoned"]),
    })
    expect(characteristics.find((row) => row.type === "vision")).toMatchObject({
      visionType: "truesight",
      rangeFeet: 120,
    })
  })

  it("wires Dead Space capacity, linked-item choice, notes, and utility action", () => {
    const content = enrich()
    const cls = content.classes?.[0]
    const deadSpace = cls?.features?.find((feature) => feature.name === "Dead Space") as
      | Feature
      | undefined
    const characteristics =
      deadSpace?.linkedModifiers?.flatMap((modifier) => modifier.characteristics ?? []) ?? []

    expect(characteristics.find((row) => row.type === "equipment_and_magic_items")).toMatchObject({
      itemOptions: ["Bag", "Cloak", "Backpack"],
      choiceCount: 1,
      allowCustom: true,
    })
    expect(characteristics.find((row) => row.type === "uses")).toMatchObject({
      uses: { type: "fixed", fixedAmount: 12 },
    })
    expect(characteristics.find((row) => row.type === "player_note")).toMatchObject({
      prompt: "Dead Space notes",
      target: "feature",
    })
    expect(content.equipment?.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Bag", "Cloak"]),
    )

    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "necromancer", level: 2, subclass_id: null, order: 0 },
          class: { ...cls, id: "necromancer" } as never,
          subclass: null,
        },
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Dead Space")).toMatchObject({
      kinds: ["action"],
      category: "utility",
      limitedUses: { type: "fixed", fixedAmount: 12 },
      playerNotes: [{ prompt: "Dead Space notes" }],
      equipmentChoices: [
        {
          options: ["Bag", "Cloak", "Backpack"],
          allowCustom: true,
        },
      ],
    })
  })

  it("keeps Critical Spellcasting scoped to spells and thrall immunities off the Necromancer", () => {
    const content = enrich()
    const features = content.classes?.[0]?.features ?? []
    for (const name of ["Critical Spellcasting", "Improved Critical Spellcasting"]) {
      const feature = features.find((row) => row.name === name) as Feature | undefined
      const crit = feature?.linkedModifiers
        ?.flatMap((modifier) => modifier.characteristics ?? [])
        .find((row) => row.type === "attack_roll_modifiers")
      expect(crit).toMatchObject({ entries: [expect.objectContaining({ target: "spell" })] })
    }

    const improvedThralls = features.find((row) => row.name === "Improved Thralls") as
      | Feature
      | undefined
    const thrallTypes =
      improvedThralls?.linkedModifiers?.flatMap((modifier) =>
        (modifier.characteristics ?? []).map((row) => row.type),
      ) ?? []
    expect(thrallTypes).not.toContain("condition_immunity")
  })

  it("keeps Deadnaught as companion among thrall creatures", () => {
    const content = enrich()
    const dead = content.creatures?.find((c) => c.name === "Deadnaught") as { category?: string } | undefined
    expect(dead?.category).toBe("companion")
    expect(content.creatures?.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "Skeleton",
        "Spirit",
        "Zombie",
        "Bone Beast",
        "Gorger",
        "Deadnaught",
        "Bloodlurk",
        "Specter",
      ]),
    )
  })

  it("wires Lazarus Bolt charnel alternate refresh", () => {
    const content = enrich()
    const reanimator = content.subclasses?.find((s) => s.name === "Reanimator")
    const bolt = reanimator?.features?.find((f) => f.name === "Lazarus Bolt") as Feature | undefined
    expect(bolt?.limitedUses).toMatchObject({
      type: "fixed",
      fixedAmount: 1,
      restoreByResource: { resourceKey: "charnel_touch", resourceAmount: 20, restores: 1 },
    })
  })

  it("wires every automatable subclass feature and isolates narrative-only gaps", () => {
    const review = collectImportModifierReview(enrich()).filter((row) =>
      row.sourceLabel.startsWith("Subclass:"),
    )
    expect(
      review.filter((row) => row.status === "unwired").map((row) => row.featureName),
    ).toEqual([
      "Overcharged Thralls",
      "Holy Symbol",
      "Mock Divinity",
      "Bloated Thralls",
      "Wraith Flight",
    ])
  })

  it("wires subclass Charnel menus, riders, companion grants, and multiattack counts", () => {
    const content = enrich()
    const feature = (subclassName: string, featureName: string) =>
      content.subclasses
        ?.find((subclass) => subclass.name === subclassName)
        ?.features?.find((row) => row.name === featureName) as Feature | undefined
    const characteristics = (subclassName: string, featureName: string) =>
      feature(subclassName, featureName)?.linkedModifiers?.flatMap(
        (modifier) => modifier.characteristics ?? [],
      ) ?? []

    const transformation = feature("Blood Ascendant", "Vampiric Transformation")
    expect(transformation?.isChoice).toBeFalsy()
    expect(transformation?.choices).toBeUndefined()
    expect(
      characteristics("Blood Ascendant", "Vampiric Transformation").find(
        (row) => row.type === "resource_ability_menu",
      ),
    ).toMatchObject({
      resourceKey: "charnel_touch",
      options: [
        expect.objectContaining({ name: "Bat", resourceCost: 15 }),
        expect.objectContaining({ name: "Mist", resourceCost: 15 }),
      ],
    })
    expect(
      characteristics("Blood Ascendant", "Vampiric Transformation").find(
        (row) => row.type === "speed",
      ),
    ).toMatchObject({ requiresSheetToggle: "vampiric_mist_form" })

    expect(
      characteristics("Blood Ascendant", "Children of the Night").find(
        (row) => row.type === "grant_creature",
      ),
    ).toMatchObject({
      creatureNames: expect.arrayContaining(["Wolf", "Swarm of Bats", "Swarm of Rats"]),
      choiceOptions: expect.arrayContaining(["Wolf", "Swarm of Bats", "Swarm of Rats"]),
    })

    const imperatorExtraAttack = feature("Death Knight", "Imperator [Lichdom]")
      ?.linkedModifiers?.flatMap((modifier) => modifier.activation?.effects ?? [])
      .find((effect) => effect.kind === "extra_attack")
    expect(imperatorExtraAttack).toMatchObject({ extraAttackCount: 2 })

    expect(
      characteristics("Overlord", "Charnel Aura").find(
        (row) => row.type === "resource_ability_menu",
      ),
    ).toMatchObject({
      options: [
        expect.objectContaining({ name: "Aura +1", resourceCost: 5 }),
        expect.objectContaining({ name: "Aura +2", resourceCost: 10 }),
        expect.objectContaining({ name: "Aura +3", resourceCost: 15 }),
      ],
    })

    expect(
      characteristics("Plague Lord", "Vile Congregation").find(
        (row) => row.type === "d20_test_reaction",
      ),
    ).toMatchObject({
      modifierMode: "subtract",
      fixedDie: "1d4",
      rangeFeet: 5,
      useReaction: false,
    })
  })

  it("shares Pharaoh Channel Divinity uses and suppresses conditional false positives", () => {
    const content = enrich()
    const feature = (subclassName: string, featureName: string) =>
      content.subclasses
        ?.find((subclass) => subclass.name === subclassName)
        ?.features?.find((row) => row.name === featureName) as Feature | undefined
    const characteristics = (subclassName: string, featureName: string) =>
      feature(subclassName, featureName)?.linkedModifiers?.flatMap(
        (modifier) => modifier.characteristics ?? [],
      ) ?? []

    for (const name of ["Channel Divinity", "Scarab of Judgement"]) {
      expect(feature("Pharaoh", name)?.limitedUses).toMatchObject({
        type: "fixed",
        fixedAmount: 2,
        useShareKey: "pharaoh_channel_divinity",
        recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
        restoreByResource: {
          resourceKey: "charnel_touch",
          resourceAmount: 15,
          restores: 1,
        },
      })
    }

    expect(
      characteristics("Pharaoh", "Mummy Lord [Lichdom]").some(
        (row) => row.type === "condition_immunity",
      ),
    ).toBe(false)
    expect(
      characteristics("Plague Lord", "Necrotoxin").some(
        (row) => row.type === "damage_resistance" || row.type === "condition_immunity",
      ),
    ).toBe(false)
    expect(
      characteristics("Plague Lord", "Projectile Spew").some(
        (row) => row.type === "weapon_reach_modifier",
      ),
    ).toBe(false)
    expect(feature("Reaper", "Umbral Form")?.limitedUses).toBeUndefined()
  })
})
