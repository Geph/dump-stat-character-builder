import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeAlternateSorcererImportContent } from "@/lib/import/enrichment-presets/packs/alternate-sorcerer"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"
import type { ImportContent } from "@/lib/import/content-schema"
import { metamagicOptionsForCharacter } from "@/lib/character/resolve-spell-cast-cost"
import type { CustomAbility } from "@/lib/types"

const CLASS_FILE = "laserllama-altsorcerer-class"
const METAMAGIC_FILE = "laserllama-metamagic-custom"

describe("LaserLlama Alternate Sorcerer import", () => {
  const classPath = resolveHomebrewImportJsonPath(CLASS_FILE)
  const metamagicPath = resolveHomebrewImportJsonPath(METAMAGIC_FILE)
  const skip = !classPath || !metamagicPath

  function loadMerged(): ImportContent {
    const classJson = JSON.parse(readFileSync(classPath!, "utf8")) as ImportContent
    const metamagicJson = JSON.parse(readFileSync(metamagicPath!, "utf8")) as ImportContent
    return {
      ...classJson,
      import_proposals: {
        ...classJson.import_proposals,
        custom_abilities: [
          ...(classJson.import_proposals?.custom_abilities ?? []),
          ...(metamagicJson.import_proposals?.custom_abilities ?? []),
        ],
      },
    }
  }

  it.skipIf(skip)("wires Metamagic knacks, point-pool resources, and Draconic L3", () => {
    const content = sanitizeHomebrewImportJson(loadMerged()) as ImportContent
    const enriched = applyImportEnrichmentPresets(content)

    const cls = enriched.classes?.[0]
    expect(cls?.name).toBe("Alternate Sorcerer")
    expect(cls?.features?.some((f) => /^subclass feature$/i.test(f.name ?? ""))).toBe(false)

    const metamagic = cls?.features?.find((f) => /^metamagic$/i.test(f.name ?? ""))
    expect(metamagic?.isChoice).toBe(true)
    expect(metamagic?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "metamagics_known",
      swappableOnRest: false,
    })
    expect(metamagic?.choices?.choiceCountByLevel?.some((t) => t.level === 2 && t.count === 2)).toBe(
      true,
    )

    const keys = (enriched.class_resources ?? []).map((r) => r.resource_key)
    expect(keys).toEqual(expect.arrayContaining(["sorcery_points", "spell_limit", "metamagics_known"]))
    expect(
      enriched.class_resources?.find((r) => r.resource_key === "metamagics_known")?.uses?.type,
    ).toBe("special")

    const abilities = enriched.import_proposals?.custom_abilities ?? []
    expect(abilities.length).toBeGreaterThanOrEqual(30)
    expect(abilities.every((a) => a.ability_role === "knack")).toBe(true)
    expect(abilities.every((a) => a.source_name === "Alternate Sorcerer")).toBe(true)
    expect(abilities.some((a) => a.name === "Dynamic Presence" && a.repeatable)).toBe(true)
    expect(abilities.some((a) => a.name === "Prismatic Spell")).toBe(true)

    const draconic = enriched.subclasses?.find((s) => /^draconic sorcery$/i.test(s.name ?? ""))
    const names = (draconic?.features ?? []).map((f) => f.name)
    expect(names).toEqual(
      expect.arrayContaining([
        "Dragon Ancestor",
        "Draconic Resilience",
        "Draconic Sorcery Spells",
        "Elemental Affinity",
        "Draconic Flight",
        "Draconic Apotheosis",
      ]),
    )
    const ancestor = draconic?.features?.find((f) => f.name === "Dragon Ancestor")
    expect(ancestor?.isChoice).toBe(true)
    expect((ancestor?.choices?.options?.length ?? 0)).toBeGreaterThanOrEqual(16)

    const summary = summarizeFindings(auditImportWiring(enriched))
    expect(summary.errors).toBe(0)
  })

  it.skipIf(skip)("metamagic-only paste normalizes ability_role knack", () => {
    const raw = JSON.parse(readFileSync(metamagicPath!, "utf8")) as ImportContent
    const sanitized = sanitizeAlternateSorcererImportContent(raw)
    const abilities = sanitized.import_proposals?.custom_abilities ?? []
    expect(abilities.every((a) => a.ability_role === "knack")).toBe(true)
    expect(abilities.every((a) => a.source_name === "Alternate Sorcerer")).toBe(true)
  })

  it("exposes selected knack Metamagic options on cast", () => {
    const careful = {
      id: "mm_careful",
      name: "Careful Spell",
      description:
        "When you cast a spell, you can spend 1 sorcery point to protect creatures from its full force.",
      ability_role: "knack",
      prerequisites: null,
      characteristics: null,
      attached_to_type: "class",
      attached_to_id: "Alternate Sorcerer",
      uses: null,
      show_in_builder: true,
      icon: null,
      source: "laserllama",
      creator_url: null,
      created_at: "",
      updated_at: "",
    } as CustomAbility

    const options = metamagicOptionsForCharacter({
      featIds: [],
      feats: [],
      customAbilities: [careful],
      selectedCustomAbilityNames: ["Careful Spell"],
      spellLevel: 2,
    })
    expect(options).toEqual([{ id: "mm_careful", name: "Careful Spell", cost: 1 }])
  })
})
