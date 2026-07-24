import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { knackAbilitiesForClass } from "@/lib/builder/knack-choices"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeAlternateFighterImportContent } from "@/lib/import/enrichment-presets/packs/alternate-fighter"
import { sanitizeLaserLlamaExploitsImportContent } from "@/lib/import/enrichment-presets/packs/alternate-barbarian"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility } from "@/lib/types"

const CLASS_FILE = "laserllama-altfighter-class"
const EXPLOITS_FILE = "laserllama-exploits-custom"

describe("LaserLlama Alternate Fighter import", () => {
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
      creatures: [...(classJson.creatures ?? []), ...(exploitsJson.creatures ?? [])],
      feats: [...(classJson.feats ?? []), ...(exploitsJson.feats ?? [])],
    }
  }

  it.skipIf(skip)("wires Martial Exploits knacks, Relentless, and subclass catalogs", () => {
    const content = sanitizeHomebrewImportJson(loadMerged()) as ImportContent
    const enriched = applyImportEnrichmentPresets(content)

    const cls = enriched.classes?.[0]
    expect(cls?.name).toBe("Alternate Fighter")

    const keys = (enriched.class_resources ?? []).map((r) => r.resource_key)
    expect(keys).toEqual(expect.arrayContaining(["exploit_dice", "exploits_known"]))

    const dice = enriched.class_resources?.find((r) => r.resource_key === "exploit_dice")
    expect(dice?.class_name).toBe("Alternate Fighter")
    expect(dice?.uses?.atLevelTable?.some((t) => t.level === 16 && t.count === 6)).toBe(true)
    expect(dice?.uses?.dieSidesByLevel?.some((t) => t.level === 17 && t.count === 12)).toBe(true)
    expect(dice?.uses?.rechargeOnInitiative).toBe(true)

    const martial = cls?.features?.find((f) => /^martial exploits$/i.test(f.name ?? ""))
    expect(martial?.isChoice).toBe(true)
    expect(martial?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "exploits_known",
      swappableOnRest: false,
    })
    expect(martial?.choices?.choiceCountByLevel?.some((t) => t.level === 2 && t.count === 2)).toBe(
      true,
    )
    expect(martial?.choices?.choiceCountByLevel?.some((t) => t.level === 19 && t.count === 11)).toBe(
      true,
    )

    const abilities = enriched.import_proposals?.custom_abilities ?? []
    const knacks = knackAbilitiesForClass(abilities as unknown as CustomAbility[], [
      "Alternate Fighter",
    ])
    expect(knacks.length).toBeGreaterThanOrEqual(50)
    expect(knacks.some((a) => /^cloud rune$/i.test(a.name ?? ""))).toBe(false)
    expect(knacks.some((a) => /^beguiling shot$/i.test(a.name ?? ""))).toBe(false)
    expect(knacks.some((a) => /^featherweight schematic$/i.test(a.name ?? ""))).toBe(false)

    const champion = enriched.subclasses?.find((s) => /^champion$/i.test(s.name ?? ""))
    const championExploits = champion?.features?.find((f) =>
      /^champion exploits$/i.test(f.name ?? ""),
    )
    const grants = (championExploits?.mechanics ?? []).filter(
      (m) => (m as { kind?: string }).kind === "grant_custom_ability",
    ) as { abilityNames?: string[] }[]
    const granted = grants.flatMap((g) => g.abilityNames ?? [])
    expect(granted).toEqual(
      expect.arrayContaining([
        "Feat of Strength",
        "Heroic Fortitude",
        "Concussive Blow",
        "Martial Focus",
        "Mythic Athleticism",
      ]),
    )

    const runecarver = enriched.subclasses?.find((s) => /^runecarver$/i.test(s.name ?? ""))
    const runeCarving = runecarver?.features?.find((f) => /^rune carving$/i.test(f.name ?? ""))
    expect(runeCarving?.isChoice).toBe(true)
    expect(runeCarving?.choices?.optionsSource).toBeUndefined()
    expect((runeCarving?.choices?.options?.length ?? 0)).toBeGreaterThanOrEqual(6)
    expect(
      runeCarving?.choices?.choiceCountByLevel?.some((t) => t.level === 3 && t.count === 2),
    ).toBe(true)

    const catalog = abilities.filter((a) =>
      /^(runecarver|sylvan archer|tinker|quartermaster)$/i.test(a.source_name ?? ""),
    )
    expect(catalog.length).toBeGreaterThanOrEqual(20)
    expect(catalog.every((a) => !a.eligible_classes?.length)).toBe(true)
    expect(catalog.every((a) => a.ability_role !== "knack")).toBe(true)

    expect((enriched.feats ?? []).some((f) => f.category === "Fighting Style")).toBe(true)

    const findings = auditImportWiring(enriched)
    const summary = summarizeFindings(findings)
    expect(summary.errors, JSON.stringify(findings.filter((f) => f.severity === "error"))).toBe(0)
  })

  it("sanitizes bare Fighter paste into Alternate Fighter wiring", () => {
    const broken = {
      classes: [
        {
          name: "Fighter",
          description: null,
          primary_ability: ["strength", "dexterity"],
          hit_die: 10,
          features: [
            {
              level: 2,
              name: "Martial Exploits",
              description: "You learn exploits.",
              isChoice: true,
              choices: {
                category: "Martial Exploit",
                count: 2,
                optionsSource: "class_knacks",
                resourceKey: "exploits_known",
                options: [],
              },
            },
            {
              level: 20,
              name: "Relentless",
              description: "Regain Exploit Dice on initiative.",
            },
          ],
        },
      ],
      subclasses: [
        {
          name: "Champion",
          class_name: "Fighter",
          features: [
            {
              level: 3,
              name: "Champion Exploits",
              description:
                "<table><tbody><tr><td>3rd</td><td>feat of strength, heroic fortitude</td></tr></tbody></table>",
              mechanics: [],
            },
          ],
        },
        {
          name: "Runecarver",
          class_name: "Fighter",
          features: [
            {
              level: 3,
              name: "Rune Carving",
              description: "You learn two Runes.",
            },
          ],
        },
      ],
      class_resources: [
        {
          class_name: "Fighter",
          resource_key: "exploit_dice",
          name: "Exploit Dice",
          uses: {
            type: "at_level",
            atLevelMode: "tier",
            atLevelTable: [
              { level: 2, count: 2 },
              { level: 4, count: 3 },
            ],
            dieSidesByLevel: [{ level: 2, count: 6 }],
            recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          },
        },
        {
          class_name: "Fighter",
          resource_key: "exploits_known",
          name: "Exploits Known",
          uses: {
            type: "special",
            atLevelMode: "tier",
            atLevelTable: [
              { level: 2, count: 2 },
              { level: 19, count: 11 },
            ],
          },
        },
      ],
      import_proposals: {
        custom_abilities: [
          {
            name: "Cloud Rune",
            ability_role: "knack",
            source_type: "subclass",
            source_name: "Runecarver",
            eligible_classes: ["Alternate Fighter"],
            definition: "A rune.",
          },
          {
            name: "Feat of Strength",
            ability_role: "knack",
            eligible_classes: ["Fighter"],
            execution: "When you…",
            definition: "1st-degree.",
          },
        ],
      },
    } as unknown as ImportContent

    let next = sanitizeAlternateFighterImportContent(broken)
    next = sanitizeLaserLlamaExploitsImportContent(next)

    expect(next.classes?.[0]?.name).toBe("Alternate Fighter")
    expect(
      next.class_resources?.find((r) => r.resource_key === "exploit_dice")?.uses
        ?.rechargeOnInitiative,
    ).toBe(true)
    expect(
      next.classes?.[0]?.features?.find((f) => /^martial exploits$/i.test(f.name ?? ""))?.choices
        ?.choiceCountByLevel?.length,
    ).toBeGreaterThan(0)

    const rune = next.import_proposals?.custom_abilities?.find((a) =>
      /^cloud rune$/i.test(a.name ?? ""),
    )
    expect(rune?.eligible_classes).toBeNull()
    expect(rune?.ability_role).toBeUndefined()

    const feat = next.import_proposals?.custom_abilities?.find((a) =>
      /^feat of strength$/i.test(a.name ?? ""),
    )
    expect(feat?.eligible_classes).toEqual(expect.arrayContaining(["Alternate Fighter"]))

    const runecarver = next.subclasses?.find((s) => /^runecarver$/i.test(s.name ?? ""))
    const carving = runecarver?.features?.find((f) => /^rune carving$/i.test(f.name ?? ""))
    expect(carving?.isChoice).toBe(true)
    expect((carving?.choices?.options?.length ?? 0)).toBeGreaterThanOrEqual(1)
  })
})
