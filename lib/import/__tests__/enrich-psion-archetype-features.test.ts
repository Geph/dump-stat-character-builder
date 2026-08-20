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

  it("documents Rampaging Power's automated sheet die state", () => {
    const enriched = enrichPsionArchetypeFeatures({
      subclasses: [
        {
          name: "Unleashed Mind",
          class_name: "Psion",
          description: null,
          features: [{ level: 3, name: "Rampaging Power", description: "Escalating die." }],
        },
      ],
    } as unknown as ImportContent)
    const feature = enriched.subclasses?.[0]?.features?.[0]
    expect(feature?.description).toMatch(/Turn Start steps it up/i)
    expect(feature?.description).toMatch(/holding d12 for 10 rounds adds a level of Exhaustion/i)
    const characteristic = (
      feature as unknown as {
        linkedModifiers?: {
          characteristics?: {
            type?: string
            automaticBonus?: { classResourceKey?: string }
          }[]
        }[]
      }
    )?.linkedModifiers?.[0]?.characteristics?.[0]
    expect(characteristic).toMatchObject({
      type: "bonus_damage_riders",
      automaticBonus: { classResourceKey: "rampage_die" },
    })
  })

  it("gates Uncontrollable Mind's condition immunities on a d8+ Rampage Die", () => {
    const enriched = enrichPsionArchetypeFeatures({
      subclasses: [
        {
          name: "Unleashed Mind",
          class_name: "Psion",
          description: null,
          features: [
            {
              level: 6,
              name: "Uncontrollable Mind",
              description:
                "While your Rampage Die is a d8 or larger, you have immunity to the Charmed and Frightened conditions.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const feature = enriched.subclasses?.[0]?.features?.[0]
    const characteristic = (
      feature as unknown as {
        linkedModifiers?: {
          characteristics?: {
            type?: string
            conditions?: string[]
            limitations?: { kind?: string; rule?: string; value?: string }[]
          }[]
        }[]
      }
    )?.linkedModifiers?.[0]?.characteristics?.[0]
    expect(characteristic).toMatchObject({
      type: "condition_immunity",
      conditions: ["Charmed", "Frightened"],
    })
    expect(characteristic?.limitations?.[0]).toMatchObject({
      kind: "sheet_toggle",
      rule: "requires_active",
      value: "rampage_die_d8_plus",
    })
    expect(feature?.description).toMatch(/d8 or larger/i)
  })

  it("wires Curious Mind with skill options and long-rest limited uses", () => {
    const enriched = enrichPsionArchetypeFeatures({
      subclasses: [
        {
          name: "Wandering Mind",
          class_name: "Psion",
          description: null,
          features: [
            {
              level: 3,
              name: "Curious Mind",
              description:
                "At the end of a long rest select two skills you do not have proficiency in, until the end of your next long rest, you can add half your proficiency modifier (rounded down) to ability checks for those skills.",
            },
          ],
        },
      ],
    } as unknown as ImportContent)
    const feature = enriched.subclasses?.[0]?.features?.[0] as unknown as import("@/lib/types").Feature
    expect(feature.isChoice).toBe(true)
    expect(feature.choices?.count).toBe(2)
    expect(feature.choices?.swappableOnRest).toBe(true)
    expect(feature.choices?.options?.length).toBeGreaterThan(10)
    expect(feature.choices?.options?.[0]?.linkedModifiers?.length).toBeGreaterThan(0)
    expect(feature.limitedUses?.recharges?.[0]).toMatchObject({ rest: "long_rest" })
  })

  it("wires Full Awakening, Mind Over Matter, and Unstoppable Rampage for sheet play", () => {
    const enriched = enrichPsionArchetypeFeatures({
      subclasses: [
        {
          name: "Awakened Mind",
          class_name: "Psion",
          description: null,
          features: [
            { level: 6, name: "Full Awakening", description: "Spend psi for advantage." },
            { level: 10, name: "Mind Over Matter", description: "Spend psi on saves." },
            { level: 14, name: "Unstoppable Rampage", description: "Drop to 1 HP." },
          ],
        },
      ],
    } as unknown as ImportContent)
    const features = enriched.subclasses?.[0]?.features ?? []
    const full = features.find((f) => f.name === "Full Awakening") as unknown as import("@/lib/types").Feature
    expect(full.activation?.action).toBe(true)
    expect(full.activation?.noEconomyCost).toBe(true)
    expect(full.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "psi_points",
      classResourceAmount: 2,
    })
    const fullChars = (full.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? [])
    const fullFx = (full.linkedModifiers ?? []).flatMap((m) => m.activation?.effects ?? [])
    expect(
      [...fullChars, ...fullFx].some(
        (entry) =>
          (entry as { kind?: string; type?: string }).kind === "check_roll_modifier" ||
          (entry as { kind?: string; type?: string }).type === "check_roll_modifier",
      ),
    ).toBe(true)

    const mind = features.find((f) => f.name === "Mind Over Matter") as unknown as import("@/lib/types").Feature
    expect(mind.activation?.action).toBe(true)
    const mindMenu = (mind.linkedModifiers ?? [])
      .flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "resource_ability_menu")
    expect(mindMenu).toMatchObject({
      type: "resource_ability_menu",
      resourceKey: "psi_points",
    })
    expect((mindMenu as { options?: unknown[] })?.options?.length).toBe(2)

    const rampage = features.find((f) => f.name === "Unstoppable Rampage") as unknown as import("@/lib/types").Feature
    expect(rampage.activation?.onDropToZeroHp).toBe(true)
    const rampageMenu = (rampage.linkedModifiers ?? [])
      .flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "resource_ability_menu")
    expect(rampageMenu).toMatchObject({ type: "resource_ability_menu", resourceKey: "psi_points" })
  })

  it("wires Boundless Imagination choices, Projected Nightmares option grant, and Balance of Power seed", () => {
    const enriched = enrichPsionArchetypeFeatures({
      classes: [{ name: "Psion", features: [] }],
      subclasses: [
        {
          name: "Shaper's Mind",
          class_name: "Psion",
          description: null,
          features: [
            {
              level: 3,
              name: "Boundless Imagination",
              description: "Apply one Boundless Imagination option.",
            },
          ],
        },
        {
          name: "Transcended Mind",
          class_name: "Psion",
          description: null,
          features: [
            { level: 3, name: "Balance of Power", description: "Bank healing." },
            { level: 6, name: "Perfected Enhancement", description: "Add PB to temp HP." },
          ],
        },
      ],
      import_proposals: {
        custom_abilities: [
          {
            name: "Projected Nightmares",
            description: "Gain Horrifying Nightmare.",
            source_name: "Psion",
            ability_role: "class_talent",
          },
        ],
      },
    } as unknown as ImportContent)

    const boundless = enriched.subclasses
      ?.find((sc) => sc.name === "Shaper's Mind")
      ?.features?.find((f) => f.name === "Boundless Imagination") as unknown as import("@/lib/types").Feature
    expect(boundless.isChoice).toBe(true)
    expect(boundless.choices?.options?.map((o) => o.name)).toEqual([
      "Devastating Weapons",
      "Psionic Conduit",
      "Vivid Existence",
    ])

    const nightmares = enriched.import_proposals?.custom_abilities?.find(
      (a) => a.name === "Projected Nightmares",
    ) as unknown as {
      linkedModifiers?: { characteristics?: { type?: string; options?: { name?: string }[] }[] }[]
    }
    const optionGrant = nightmares.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "feature_choice_option_grant")
    expect(optionGrant).toMatchObject({
      type: "feature_choice_option_grant",
      targetFeatureName: "Boundless Imagination",
    })
    expect((optionGrant as { options?: { name?: string }[] })?.options?.[0]?.name).toBe(
      "Horrifying Nightmare",
    )

    const perfected = enriched.subclasses
      ?.find((sc) => sc.name === "Transcended Mind")
      ?.features?.find((f) => f.name === "Perfected Enhancement") as unknown as import("@/lib/types").Feature
    expect(
      (perfected.linkedModifiers ?? [])
        .flatMap((m) => m.characteristics ?? [])
        .some((c) => c.type === "power_rider"),
    ).toBe(true)

    expect(
      (enriched.class_resources ?? []).some((row) => row.resource_key === "balance_of_power"),
    ).toBe(true)
  })

  it("wires proposal abilities: Bile Blast, Weapon Morph, Mind Rider, heals", () => {
    const enriched = enrichPsionArchetypeFeatures({
      import_proposals: {
        custom_abilities: [
          { name: "Bile Blast", description: "15-foot cone of acid.", source_name: "Psion" },
          { name: "Weapon Morph", description: "Morph a natural weapon.", source_name: "Psion" },
          { name: "Mind Rider", description: "See through a creature.", source_name: "Psion" },
          { name: "Psionic Regrowth", description: "Spend psi to heal.", source_name: "Psion" },
          { name: "Rapid Regeneration", description: "Bonus action heal.", source_name: "Psion" },
          { name: "Slime Excretion", description: "Excrete slime.", source_name: "Psion" },
          { name: "Advantageous Assault", description: "Bonus attack.", source_name: "Psion" },
          { name: "Empowered Strike", description: "Weapon hit power rider.", source_name: "Psion" },
          { name: "Flesh Warp", description: "Grant a Mutation Die.", source_name: "Psion" },
          { name: "Projected Self", description: "Create an illusion of yourself.", source_name: "Psion" },
          { name: "Imaginary Ally", description: "Create an illusory double.", source_name: "Psion" },
        ],
      },
    } as unknown as ImportContent)

    const byName = Object.fromEntries(
      (enriched.import_proposals?.custom_abilities ?? []).map((a) => [a.name, a]),
    )

    const bile = byName["Bile Blast"] as unknown as {
      casting_time?: string
      linkedModifiers?: { characteristics?: { type?: string; attackProfile?: string }[] }[]
    }
    expect(bile.casting_time).toBe("1 action")
    expect(
      bile.linkedModifiers?.some((m) => m.characteristics?.some((c) => c.type === "special_attack")),
    ).toBe(true)

    const morph = byName["Weapon Morph"] as unknown as {
      casting_time?: string
      linkedModifiers?: { characteristics?: { type?: string; options?: unknown[] }[] }[]
    }
    expect(morph.casting_time).toBe("1 bonus action")
    const morphMenu = morph.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "resource_ability_menu")
    expect((morphMenu as { options?: unknown[] })?.options?.length).toBeGreaterThanOrEqual(5)

    const rider = byName["Mind Rider"] as unknown as {
      casting_time?: string
      description?: string
      linkedModifiers?: { characteristics?: { type?: string; parentPowerNames?: string[] }[] }[]
    }
    expect(rider.casting_time).toBe("1 action")
    expect(rider.description).toMatch(/Mind Rider/i)
    const mindRiderAlert = rider.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "power_rider")
    expect(mindRiderAlert?.parentPowerNames).toEqual(["Mind Rider"])

    const regrowth = byName["Psionic Regrowth"] as unknown as {
      casting_time?: string
      uses?: { classResourceKey?: string }
      linkedModifiers?: { activation?: { effects?: { kind?: string }[] } }[]
    }
    expect(regrowth.casting_time).toBe("1 action")
    expect(regrowth.uses?.classResourceKey).toBe("psi_points")
    expect(
      regrowth.linkedModifiers?.some((m) =>
        m.activation?.effects?.some((e) => e.kind === "heal_self"),
      ),
    ).toBe(true)

    const rapid = byName["Rapid Regeneration"] as unknown as {
      casting_time?: string
      uses?: { classResourceKey?: string }
    }
    expect(rapid.casting_time).toBe("1 bonus action")
    expect(rapid.uses?.classResourceKey).toBe("psi_points")

    expect((byName["Slime Excretion"] as { casting_time?: string }).casting_time).toBe("1 action")

    const assault = byName["Advantageous Assault"] as unknown as {
      casting_time?: string
      linkedModifiers?: { activation?: { effects?: { kind?: string }[] } }[]
    }
    expect(assault.casting_time).toBe("1 bonus action")
    expect(
      assault.linkedModifiers?.some((m) =>
        m.activation?.effects?.some((e) => e.kind === "bonus_action_attack"),
      ),
    ).toBe(true)

    const empowered = byName["Empowered Strike"] as unknown as {
      linkedModifiers?: { characteristics?: { type?: string; parentPowerNames?: string[] }[] }[]
    }
    const empoweredRider = empowered.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "power_rider")
    expect(empoweredRider?.parentPowerNames).toEqual(
      expect.arrayContaining(["Attack", "Elemental Blast", "Telekinetic Force"]),
    )

    expect((byName["Flesh Warp"] as { casting_time?: string; description?: string }).casting_time).toBe(
      "1 action",
    )
    expect((byName["Flesh Warp"] as { description?: string }).description).toMatch(/Mutation Die/i)
    expect((byName["Projected Self"] as { description?: string }).description).toMatch(/illusion token/i)
    expect((byName["Imaginary Ally"] as { description?: string }).description).toMatch(/illusion token/i)
  })
})
