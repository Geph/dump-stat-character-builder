import { describe, expect, it } from "vitest"
import {
  collectFreeCastSpellKeys,
  collectGrantedSpellCastProfiles,
  grantedSpellProfileFor,
  isFreeCastSpell,
  resetGrantedSpellFreeCasts,
} from "@/lib/character/free-cast-spells"
import { tagModifierSource } from "@/lib/character/tag-modifier-source"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import {
  detectFeatureModifiers,
  mergeDetectionsIntoFeature,
} from "@/lib/import/detect-feature-modifiers"
import type { Feature } from "@/lib/types"

/** Craftsman "Eye for Quality" — the free cast has to survive import wiring into sheet behavior. */
const EYE_FOR_QUALITY =
  "You can cast Identify and Locate Object without a spell slot or components. Intelligence is your spellcasting ability for these spells."

function featureFromText(name: string, description: string): Feature {
  const base = { level: 9, name, description } as unknown as Feature
  return mergeDetectionsIntoFeature(
    base,
    detectFeatureModifiers(description, {
      contentKind: "class_feature",
      sourceName: "Craftsman",
      featureName: name,
    }),
  )
}

describe("collectFreeCastSpellKeys", () => {
  it("collects both spells an imported feature grants without a slot", () => {
    const keys = collectFreeCastSpellKeys([featureFromText("Eye for Quality", EYE_FOR_QUALITY)])

    expect(isFreeCastSpell(keys, "Identify")).toBe(true)
    expect(isFreeCastSpell(keys, "Locate Object")).toBe(true)
    expect(isFreeCastSpell(keys, "Fireball")).toBe(false)
  })

  it("matches spell names case-insensitively and ignores surrounding whitespace", () => {
    const keys = collectFreeCastSpellKeys([featureFromText("Eye for Quality", EYE_FOR_QUALITY)])

    expect(isFreeCastSpell(keys, "  locate object ")).toBe(true)
    expect(isFreeCastSpell(keys, "")).toBe(false)
    expect(isFreeCastSpell(keys, null)).toBe(false)
  })

  it("ignores cast_spell grants that still expend a slot", () => {
    const feature = {
      level: 1,
      name: "Paid Cast",
      linkedModifiers: [
        {
          instanceId: "modinst_paid",
          catalogRefId: "cat_fx_cast_spell",
          activation: {
            action: true,
            effects: [
              { id: "mod_paid", kind: "cast_spell" as const, castSpellName: "Fireball" },
            ],
          },
        },
      ],
    } as unknown as Feature

    expect(collectFreeCastSpellKeys([feature]).size).toBe(0)
  })

  it("returns no keys for features without cast_spell wiring", () => {
    expect(collectFreeCastSpellKeys([]).size).toBe(0)
    expect(collectFreeCastSpellKeys([null, undefined]).size).toBe(0)
  })
})

describe("limited granted-spell casts", () => {
  const modifiers = tagModifierSource(
    [
      {
        id: "mod_magic_initiate_spells",
        type: "spells_known",
        spells: [
          {
            spellId: "spell-guiding-bolt",
            prepared: true,
            alwaysPrepared: true,
            freeCastPerLongRest: 1,
          },
        ],
        castingAbility: "wisdom",
      },
    ] as CharacteristicModifier[],
    {
      sourceType: "feat",
      source: "Magic Initiate",
      sourceId: "feat-magic-initiate",
      label: "Magic Initiate",
    },
  )

  it("keeps the chosen ability and one free Long Rest cast with the granted spell", () => {
    const profiles = collectGrantedSpellCastProfiles(modifiers)
    const profile = grantedSpellProfileFor(profiles, {
      id: "spell-guiding-bolt",
      name: "Guiding Bolt",
    })

    expect(profile).toMatchObject({
      sourceLabel: "Magic Initiate",
      castingAbility: "wisdom",
      freeCastCount: 1,
    })
  })

  it("restores the free cast only on a Long Rest", () => {
    const [profile] = collectGrantedSpellCastProfiles(modifiers)
    const used = { [profile.trackingKey]: 1 }

    expect(resetGrantedSpellFreeCasts(used, [profile], "short_rest").usedById).toEqual(used)
    expect(resetGrantedSpellFreeCasts(used, [profile], "long_rest")).toEqual({
      usedById: {},
      restored: [profile],
    })
  })

  it("associates legacy sibling Uses wiring with only the selected leveled spell", () => {
    const legacy = tagModifierSource(
      [
        {
          id: "mod_magic_initiate_spells",
          type: "spells_known",
          spells: [
            { spellId: "spell-light", prepared: true },
            { spellId: "spell-guiding-bolt", prepared: true },
          ],
          castingAbility: "charisma",
        },
        {
          id: "mod_magic_initiate_cast",
          type: "uses",
          uses: {
            type: "fixed",
            fixedAmount: 1,
            recharges: [{ rest: "long_rest" }],
          },
          label: "Cast chosen level-1 spell once without a slot",
        },
      ] as CharacteristicModifier[],
      {
        sourceType: "feat",
        source: "Magic Initiate",
        sourceId: "feat-magic-initiate",
        label: "Magic Initiate",
      },
    )
    const profiles = collectGrantedSpellCastProfiles(legacy)

    expect(
      grantedSpellProfileFor(profiles, { id: "spell-light", name: "Light", level: 0 }),
    ).toBeNull()
    expect(
      grantedSpellProfileFor(profiles, {
        id: "spell-guiding-bolt",
        name: "Guiding Bolt",
        level: 1,
      }),
    ).toMatchObject({ castingAbility: "charisma", freeCastCount: 1 })
  })
})
