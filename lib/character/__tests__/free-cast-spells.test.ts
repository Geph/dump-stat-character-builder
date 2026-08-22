import { describe, expect, it } from "vitest"
import { collectFreeCastSpellKeys, isFreeCastSpell } from "@/lib/character/free-cast-spells"
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
