import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { knackAbilitiesForClass } from "@/lib/builder/knack-choices"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import {
  sanitizeAlternateMonkImportContent,
  sanitizeLaserLlamaMonkTechniquesImportContent,
} from "@/lib/import/enrichment-presets/packs/alternate-monk"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility } from "@/lib/types"

const CLASS_FILE = "laserllama-altmonk-class"
const EXPLOITS_FILE = "laserllama-exploits-custom"

describe("LaserLlama Alternate Monk import", () => {
  const classPath = resolveHomebrewImportJsonPath(CLASS_FILE)
  const exploitsPath = resolveHomebrewImportJsonPath(EXPLOITS_FILE)
  const skip = !classPath || !exploitsPath

  function loadMerged(): ImportContent {
    const classJson = JSON.parse(readFileSync(classPath!, "utf8")) as ImportContent
    const exploitsJson = JSON.parse(readFileSync(exploitsPath!, "utf8")) as ImportContent
    return {
      ...classJson,
      import_proposals: {
        ...classJson.import_proposals,
        custom_abilities: [
          ...(classJson.import_proposals?.custom_abilities ?? []),
          ...(exploitsJson.import_proposals?.custom_abilities ?? []),
        ],
      },
      creatures: [
        ...(classJson.creatures ?? []),
        ...(exploitsJson.creatures ?? []),
      ],
    }
  }

  it.skipIf(skip)("wires Ki, Mystic Techniques knacks, and Brawler inline exploits", () => {
    const content = sanitizeHomebrewImportJson(loadMerged()) as ImportContent
    const enriched = applyImportEnrichmentPresets(content)

    const cls = enriched.classes?.[0]
    expect(cls?.name).toBe("Alternate Monk")

    const keys = (enriched.class_resources ?? []).map((r) => r.resource_key)
    expect(keys).toEqual(
      expect.arrayContaining([
        "alternate_monk_ki_points",
        "martial_arts_die",
        "techniques_known",
        "exploit_dice",
        "exploits_known",
        "exploit_degree",
      ]),
    )
    expect(keys).not.toContain("ki")
    expect(keys).not.toContain("ki_points")
    expect(keys).not.toContain("focus_points")

    const ki = enriched.class_resources?.find((r) => r.resource_key === "alternate_monk_ki_points")
    expect(ki?.class_name).toBe("Alternate Monk")
    expect(ki?.uses?.type).toBe("at_level")
    expect(ki?.uses?.recharges?.some((r) => r.rest === "short_rest")).toBe(true)

    const martial = enriched.class_resources?.find((r) => r.resource_key === "martial_arts_die")
    expect(martial?.uses?.type).toBe("special")
    expect(martial?.uses?.dieSidesByLevel?.some((t) => t.level === 1 && t.count === 6)).toBe(true)
    expect(martial?.uses?.atLevelTable).toBeUndefined()

    const mystic = cls?.features?.find((f) => /^mystic techniques$/i.test(f.name ?? ""))
    expect(mystic?.isChoice).toBe(true)
    expect(mystic?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "techniques_known",
      swappableOnRest: false,
    })
    expect(mystic?.choices?.choiceCountByLevel?.some((t) => t.level === 2 && t.count === 3)).toBe(
      true,
    )

    const flurry = cls?.features?.find((f) => /^flurry of blows$/i.test(f.name ?? ""))
    const flurryUses = (flurry?.mechanics ?? []).find(
      (m) => (m as { kind?: string }).kind === "uses",
    ) as { classResourceKey?: string } | undefined
    expect(flurryUses?.classResourceKey).toBe("alternate_monk_ki_points")

    const abilities = (enriched.import_proposals?.custom_abilities ?? []) as unknown as CustomAbility[]
    const techniqueKnacks = knackAbilitiesForClass(abilities, ["Alternate Monk"]).filter((a) => {
      const eligible = a.eligible_classes ?? []
      const isExploit =
        Boolean(a.execution?.trim()) && eligible.some((c) => /^brawler$/i.test(c))
      return !isExploit
    })
    expect(techniqueKnacks.length).toBeGreaterThanOrEqual(40)

    const brawler = enriched.subclasses?.find((s) => /^way of the brawler$/i.test(s.name ?? ""))
    expect(brawler?.class_name).toBe("Alternate Monk")
    const savage = brawler?.features?.find((f) => /^savage exploits$/i.test(f.name ?? ""))
    expect(savage?.choices?.optionsSource).toBeUndefined()
    expect(savage?.choices?.resourceKey).toBe("exploits_known")
    expect((savage?.choices?.options?.length ?? 0)).toBeGreaterThanOrEqual(40)

    const findings = auditImportWiring(enriched)
    const summary = summarizeFindings(findings)
    expect(summary.errors, JSON.stringify(findings.filter((f) => f.severity === "error"))).toBe(0)
  })

  it("sanitizes bare Monk paste into Alternate Monk wiring", () => {
    const broken = {
      classes: [
        {
          name: "Monk",
          description: null,
          primary_ability: ["dexterity", "wisdom"],
          hit_die: 8,
          features: [
            {
              level: 2,
              name: "Mystic Techniques",
              description: "Ki techniques",
              isChoice: true,
              choices: { category: "Technique", count: 3, options: [] },
            },
            {
              level: 2,
              name: "Flurry of Blows",
              description: "spend 1 Ki",
              mechanics: [{ kind: "uses", classResourceKey: "ki", classResourceCost: 1 }],
            },
          ],
        },
      ],
      class_resources: [
        {
          class_name: "Monk",
          resource_key: "ki",
          name: "Ki",
          uses: { type: "at_level", atLevelTable: [{ level: 2, count: 5 }] },
        },
        {
          class_name: "Monk",
          resource_key: "techniques_known",
          name: "Techniques Known",
          uses: { type: "special", atLevelTable: [{ level: 2, count: 3 }] },
        },
        {
          class_name: "Monk",
          resource_key: "martial_arts_die",
          name: "Martial Arts Die",
          uses: { type: "special", atLevelTable: [{ level: 1, count: 6 }] },
        },
      ],
      subclasses: [
        {
          name: "Way of the Brawler",
          class_name: "Monk",
          description: null,
          features: [
            {
              level: 3,
              name: "Savage Exploits",
              description: "Exploits",
              isChoice: true,
              choices: {
                category: "Exploit",
                count: 2,
                optionsSource: "class_knacks",
                resourceKey: "exploits_known",
                options: [],
              },
            },
          ],
        },
      ],
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "technique_empty_body",
            name: "Empty Body",
            ability_role: "knack",
            definition: "Monk Mystic Technique. Spend Ki to become invisible.",
            description: "Spend Ki.",
            source_type: "class",
            source_name: "Monk",
            level_requirement: null,
          },
          {
            proposal_id: "exploit_feint",
            name: "Feint",
            ability_role: "knack",
            definition: "1st-degree Exploit.",
            description: "Feint.",
            execution: "1 bonus action",
            eligible_classes: ["Brawler", "Rogue"],
            source_type: "class",
            source_name: null,
            level_requirement: null,
          },
        ],
      },
    } as unknown as ImportContent

    let next = sanitizeAlternateMonkImportContent(broken)
    next = sanitizeLaserLlamaMonkTechniquesImportContent(next)

    expect(next.classes?.[0]?.name).toBe("Alternate Monk")
    expect(next.class_resources?.some((r) => r.resource_key === "alternate_monk_ki_points")).toBe(
      true,
    )
    expect(next.class_resources?.find((r) => r.resource_key === "martial_arts_die")?.uses).toMatchObject({
      type: "special",
      dieSidesByLevel: [{ level: 1, count: 6 }],
    })
    const mystic = next.classes?.[0]?.features?.find((f) => f.name === "Mystic Techniques")
    expect(mystic?.choices?.optionsSource).toBe("class_knacks")
    expect(mystic?.choices?.resourceKey).toBe("techniques_known")

    const flurry = next.classes?.[0]?.features?.find((f) => f.name === "Flurry of Blows")
    expect(
      (flurry?.mechanics?.[0] as { classResourceKey?: string })?.classResourceKey,
    ).toBe("alternate_monk_ki_points")

    const technique = next.import_proposals?.custom_abilities?.find((a) => a.name === "Empty Body")
    expect(technique?.source_name).toBe("Alternate Monk")
    expect(technique?.eligible_classes).toEqual(expect.arrayContaining(["Alternate Monk"]))

    const savage = next.subclasses?.[0]?.features?.find((f) => f.name === "Savage Exploits")
    expect(savage?.choices?.optionsSource).toBeUndefined()
    expect(savage?.choices?.options?.some((o) => o.name === "Feint")).toBe(true)
  })
})
