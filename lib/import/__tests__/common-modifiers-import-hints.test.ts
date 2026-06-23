import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt } from "@/lib/import/byo-import-kit"
import { COMMON_MODIFIERS_IMPORT_HINT } from "@/lib/import/common-modifiers-import-hints"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"

describe("common modifiers import hints", () => {
  it("documents grant_feat and catalog phrasing", () => {
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("cat_char_grant_feat")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("Fighting Style feat of your choice")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("grant_feat")
    expect(COMMON_MODIFIERS_IMPORT_HINT).toContain("mechanics[]")
  })

  it("includes modifier guidance in BYO extraction prompt", () => {
    const prompt = buildByoExtractionPrompt("classes")
    expect(prompt).toContain("Common Modifier wiring")
    expect(prompt).toContain("grant_feat")
    expect(prompt).toContain("Do NOT output linkedModifiers")
  })

  it("preserves mechanics[] through AI content normalization", () => {
    const normalized = normalizeAiImportContent({
      classes: [
        {
          name: "Gunslinger",
          description: null,
          card_blurb: null,
          hit_die: 8,
          primary_ability: ["Dexterity"],
          saving_throws: null,
          armor_proficiencies: null,
          weapon_proficiencies: null,
          skill_choices: null,
          spellcasting: null,
          spell_list: null,
          features: [
            {
              level: 2,
              name: "Fighting Style",
              description: "You gain a Fighting Style feat of your choice.",
              isChoice: null,
              choices: null,
              mechanics: [
                {
                  kind: "grant_feat",
                  featCategories: ["Fighting Style"],
                  featCount: 1,
                  sourcePhrase: "You gain a Fighting Style feat of your choice.",
                  confidence: "high",
                },
              ],
            },
          ],
        },
      ],
      species: null,
      class_resources: null,
      subclasses: null,
      backgrounds: null,
      spells: null,
      feats: null,
      equipment: null,
      import_proposals: null,
    })

    const feature = normalized.classes?.[0]?.features?.[0] as {
      mechanics?: { kind: string }[]
    }
    expect(feature.mechanics?.[0]?.kind).toBe("grant_feat")

    const enriched = enrichImportContentModifiers(normalized)
    const linked = enriched.classes?.[0]?.features?.[0] as {
      linkedModifiers?: { catalogRefId: string }[]
    }
    expect(linked.linkedModifiers?.some((mod) => mod.catalogRefId === "cat_char_grant_feat")).toBe(
      true,
    )
  })

  it("builds grant_feat detections from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "grant_feat",
          featCategories: ["Fighting Style"],
          featCount: 1,
          sourcePhrase: "You gain a Fighting Style feat of your choice.",
        },
      ],
      { contentKind: "class_feature", featureName: "Fighting Style" },
    )
    expect(detections[0]?.ruleId).toBe("ai.grant_feat")
    expect(detections[0]?.instance.catalogRefId).toBe("cat_char_grant_feat")
  })
})
