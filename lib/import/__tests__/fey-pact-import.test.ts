import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { inferFeatImportFields } from "@/lib/import/infer-feat-import-fields"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import {
  IMPORT_SPELL_NAME_PREFIX,
  resolveLinkedModifierSpells,
} from "@/lib/import/resolve-linked-modifier-spells"
import type { ImportContent } from "@/lib/import/content-schema"

const FEY_PACT_DESCRIPTION = `Planar Pact Feat (Prerequisite: Can't Have Another Planar Pact Feat)

You gain the following benefits.

Fey Bond. You know Sylvan. If you already know Sylvan when you select this feat, you instead learn one language of your choice from the language tables in the Player's Handbook. You also gain Proficiency in the Nature skill.

Fey Cantrips. You know the Druidcraft cantrip and learn one other cantrip of your choice from the Divination or Enchantment school of magic. Intelligence, Wisdom, or Charisma is your spellcasting ability for these spells (choose when you select this feat).

Honeyed Words. When you roll a 5 or lower on the d20 for a Charisma (Deception) or Charisma (Persuasion) check, you can take a Reaction to reroll the check, and you must use the new roll. Once you take this Reaction, you can't use this benefit again until you finish a Long Rest.`

describe("Fey Pact import", () => {
  it("infers Planar Pact category and prerequisite from description", () => {
    const inferred = inferFeatImportFields({
      name: "Fey Pact",
      description: FEY_PACT_DESCRIPTION,
      category: "General",
      prerequisite: null,
    })
    expect(inferred.category).toBe("Planar Pact")
    expect(inferred.prerequisite).toMatch(/Can't Have Another Planar Pact Feat/i)
  })

  it("wires language, skill, and cantrip modifiers from description", () => {
    const content = {
      feats: [
        {
          name: "Fey Pact",
          description: FEY_PACT_DESCRIPTION,
          prerequisite: null,
          category: "General",
          mechanics: [
            {
              kind: "skills",
              skills: ["Nature"],
              sourcePhrase: "You also gain Proficiency in the Nature skill.",
              confidence: "high",
            },
            {
              kind: "uses",
              usesFixed: 1,
              usesRecharge: "long_rest",
              sourcePhrase:
                "Once you take this Reaction, you can't use this benefit again until you finish a Long Rest.",
              confidence: "high",
            },
          ],
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content as unknown as ImportContent)
    const feat = enriched.feats?.[0] as {
      category?: string
      linkedModifiers?: { catalogRefId: string; characteristics?: { type: string }[] }[]
    }

    expect(feat.category).toBe("Planar Pact")

    const types = (feat.linkedModifiers ?? []).flatMap((mod) =>
      (mod.characteristics ?? []).map((char) => char.type),
    )
    expect(types).toContain("skills")
    expect(types).toContain("languages")
    expect(types.filter((type) => type === "spells_known").length).toBeGreaterThanOrEqual(2)
    expect(types).not.toContain("uses")
  })

  it("builds AI mechanics for languages and spells_known", () => {
    const detections = aiMechanicsToDetections(
      [
        { kind: "languages", languages: ["Sylvan"], sourcePhrase: "You know Sylvan." },
        {
          kind: "spells_known",
          spellNames: ["Druidcraft"],
          spellChoiceGrants: [{ level: 0, count: 1 }],
          spellChoiceLabel: "Divination or Enchantment",
          sourcePhrase: "Fey Cantrips.",
        },
      ],
      { contentKind: "feat", featureName: "Fey Pact" },
    )
    expect(detections.some((d) => d.ruleId === "ai.languages")).toBe(true)
    expect(detections.some((d) => d.ruleId === "ai.spells_known")).toBe(true)
  })

  it("resolves cantrip placeholders against a spell catalog", () => {
    const linked = resolveLinkedModifierSpells(
      [
        {
          instanceId: "modinst_test",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_test",
              type: "spells_known",
              spells: [{ spellId: `${IMPORT_SPELL_NAME_PREFIX}Druidcraft` }],
            },
          ],
        },
      ],
      [{ id: "spell-druidcraft", name: "Druidcraft" }],
    )

    const spellId = (
      linked?.[0]?.characteristics?.[0] as
        | import("@/lib/compendium/characteristic-modifiers").SpellsKnownCharacteristic
        | undefined
    )?.spells?.[0]?.spellId
    expect(spellId).toBe("spell-druidcraft")
  })
})
