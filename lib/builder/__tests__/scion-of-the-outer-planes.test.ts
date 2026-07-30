import { describe, expect, it } from "vitest"
import { featChoicePickKey } from "@/lib/builder/feat-choices"
import {
  applyModifierPlayerPicks,
  characteristicsForFeatSelection,
  collectModifierPlayerChoiceSlots,
  modifierPlayerChoiceSlotKey,
} from "@/lib/builder/modifier-player-choices"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { normalizeFeatRow } from "@/lib/compendium/normalize-feats"
import type { Feat } from "@/lib/types"

const PICK_KEY = featChoicePickKey("origin_feat")

function scionFeat(): Feat {
  const row = enrichCustomFeatRow({
    name: "Scion of the Outer Planes",
    source: "Player's Handbook",
    description: "Planar Infusion",
  })
  return normalizeFeatRow({
    id: "feat_scion",
    created_at: new Date().toISOString(),
    ...row,
  } as never) as Feat
}

const PLANAR_INFUSION: { plane: string; damageType: string; cantrip: string }[] = [
  { plane: "Chaotic Outer Plane", damageType: "Poison", cantrip: "Minor Illusion" },
  { plane: "Evil Outer Plane", damageType: "Necrotic", cantrip: "Chill Touch" },
  { plane: "Good Outer Plane", damageType: "Radiant", cantrip: "Sacred Flame" },
  { plane: "Lawful Outer Plane", damageType: "Force", cantrip: "Guidance" },
  { plane: "The Outlands", damageType: "Psychic", cantrip: "Mage Hand" },
]

describe("Scion of the Outer Planes", () => {
  it("offers one Planar Infusion option per table row", () => {
    const feat = scionFeat()
    expect(feat.isChoice).toBe(true)
    expect(feat.choices?.category).toBe("Planar Infusion")
    expect(feat.choices?.count).toBe(1)
    expect(feat.choices?.options.map((option) => option.name)).toEqual(
      PLANAR_INFUSION.map((row) => row.plane),
    )
  })

  it.each(PLANAR_INFUSION)(
    "grants $damageType resistance and the $cantrip cantrip for $plane",
    ({ plane, damageType, cantrip }) => {
      const chars = characteristicsForFeatSelection(
        scionFeat(),
        PICK_KEY,
        { [PICK_KEY]: [plane] },
        [],
      )

      const resistance = chars.find((mod) => mod.type === "damage_resistance")
      expect(resistance).toMatchObject({ damageTypes: [damageType] })

      const spells = chars.find((mod) => mod.type === "spells_known")
      expect(spells).toMatchObject({
        spells: [{ spellId: cantrip, alwaysPrepared: true }],
      })

      // Only the picked plane's benefits apply.
      expect(chars.filter((mod) => mod.type === "damage_resistance")).toHaveLength(1)
      expect(chars.filter((mod) => mod.type === "spells_known")).toHaveLength(1)
    },
  )

  it("keeps the feat-level casting ability choice alongside the picked plane", () => {
    const chars = characteristicsForFeatSelection(
      scionFeat(),
      PICK_KEY,
      { [PICK_KEY]: ["Lawful Outer Plane"] },
      [],
    )
    const ability = chars.find((mod) => mod.type === "spellcasting_ability")
    expect(ability).toMatchObject({
      abilityOptions: ["intelligence", "wisdom", "charisma"],
    })
  })

  it("surfaces a single Intelligence/Wisdom/Charisma pick in the builder", () => {
    const feat = scionFeat()
    const slots = collectModifierPlayerChoiceSlots({
      featEntries: [{ featId: feat.id, choicePickKey: PICK_KEY }],
      feats: [feat],
      featChoicePicks: { [PICK_KEY]: ["The Outlands"] },
      catalog: [],
    })
    const abilitySlots = slots.filter((slot) => slot.kind === "spellcasting_ability")
    expect(abilitySlots).toHaveLength(1)
    expect(abilitySlots[0].maxCount).toBe(1)
    expect(abilitySlots[0].options?.map((option) => option.name)).toEqual([
      "Intelligence",
      "Wisdom",
      "Charisma",
    ])
  })

  it("casts the granted cantrip with the chosen ability", () => {
    const feat = scionFeat()
    const chars = characteristicsForFeatSelection(
      feat,
      PICK_KEY,
      { [PICK_KEY]: ["Good Outer Plane"] },
      [],
    )
    const abilityMod = chars.find((mod) => mod.type === "spellcasting_ability")
    const abilitySlotKey = modifierPlayerChoiceSlotKey(
      PICK_KEY,
      abilityMod!.id,
      "spellcasting_ability",
    )

    const resolved = applyModifierPlayerPicks(chars, PICK_KEY, {
      [abilitySlotKey]: ["Wisdom"],
    })

    expect(resolved.find((mod) => mod.type === "spellcasting_ability")).toMatchObject({
      ability: "wisdom",
    })
    expect(resolved.find((mod) => mod.type === "spells_known")).toMatchObject({
      castingAbility: "wisdom",
    })
  })
})
