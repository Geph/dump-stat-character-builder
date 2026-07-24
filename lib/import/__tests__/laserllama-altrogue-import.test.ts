import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { knackAbilitiesForClass } from "@/lib/builder/knack-choices"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import {
  parseSignatureExploitTable,
  sanitizeAlternateRogueImportContent,
} from "@/lib/import/enrichment-presets/packs/alternate-rogue"
import { sanitizeLaserLlamaExploitsImportContent } from "@/lib/import/enrichment-presets/packs/alternate-barbarian"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility } from "@/lib/types"

const CLASS_FILE = "laserllama-altrogue-class"
const EXPLOITS_FILE = "laserllama-exploits-custom"

describe("LaserLlama Alternate Rogue import", () => {
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
    }
  }

  it.skipIf(skip)("wires Devious Exploits knacks, exploit dice, and signature grants", () => {
    const content = sanitizeHomebrewImportJson(loadMerged()) as ImportContent
    const enriched = applyImportEnrichmentPresets(content)

    const cls = enriched.classes?.[0]
    expect(cls?.name).toBe("Alternate Rogue")

    const keys = (enriched.class_resources ?? []).map((r) => r.resource_key)
    expect(keys).toEqual(
      expect.arrayContaining(["exploit_dice", "exploits_known", "divine_favor", "divine_limit"]),
    )

    const dice = enriched.class_resources?.find((r) => r.resource_key === "exploit_dice")
    expect(dice?.class_name).toBe("Alternate Rogue")
    expect(dice?.uses?.atLevelTable?.some((t) => t.level === 17 && t.count === 5)).toBe(true)
    expect(dice?.uses?.dieSidesByLevel?.some((t) => t.level === 17 && t.count === 10)).toBe(true)

    const uncanny = cls?.features?.find((f) => /^uncanny dodge$/i.test(f.name ?? ""))
    expect(uncanny).toBeDefined()
    expect(
      cls?.features?.some((f) => /^expertise\s*\(\s*uncanny dodge\s*\)$/i.test(f.name ?? "")),
    ).toBe(false)

    const devious = cls?.features?.find((f) => /^devious exploits$/i.test(f.name ?? ""))
    expect(devious?.isChoice).toBe(true)
    expect(devious?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "exploits_known",
      swappableOnRest: false,
    })
    expect(devious?.choices?.choiceCountByLevel?.some((t) => t.level === 2 && t.count === 2)).toBe(
      true,
    )
    expect(devious?.choices?.choiceCountByLevel?.some((t) => t.level === 17 && t.count === 8)).toBe(
      true,
    )

    const abilities = enriched.import_proposals?.custom_abilities ?? []
    const knacks = knackAbilitiesForClass(abilities as unknown as CustomAbility[], ["Alternate Rogue"])
    expect(knacks.length).toBeGreaterThanOrEqual(50)
    expect(knacks.some((a) => /^hand bomb$/i.test(a.name ?? ""))).toBe(false)
    expect(
      knacks.every((a) =>
        (a.eligible_classes ?? []).some((n) => /^(alternate\s+)?rogue$/i.test(n)),
      ),
    ).toBe(true)

    const acrobat = enriched.subclasses?.find((s) => /^acrobat$/i.test(s.name ?? ""))
    const acrobatExploits = acrobat?.features?.find((f) => /^acrobat exploits$/i.test(f.name ?? ""))
    const grants = (acrobatExploits?.mechanics ?? []).filter(
      (m) => (m as { kind?: string }).kind === "grant_custom_ability",
    ) as { abilityNames?: string[] }[]
    const granted = grants.flatMap((g) => g.abilityNames ?? [])
    expect(granted).toEqual(
      expect.arrayContaining(["Aerial Maneuver", "Lunge", "Dirty Hit", "Trick Shot", "Survey Settlement"]),
    )

    const saboteurBombs = abilities.filter((a) => /^saboteur$/i.test(a.source_name ?? ""))
    expect(saboteurBombs.length).toBeGreaterThanOrEqual(8)
    expect(saboteurBombs.every((a) => !a.eligible_classes?.length)).toBe(true)

    const findings = auditImportWiring(enriched)
    const summary = summarizeFindings(findings)
    expect(summary.errors, JSON.stringify(findings.filter((f) => f.severity === "error"))).toBe(0)
  })

  it("parses signature exploit HTML tables", () => {
    const rows = parseSignatureExploitTable(
      `<table><tbody><tr><td>Rogue Level</td><td>Exploit</td></tr><tr><td>3rd</td><td>aerial maneuver, lunge</td></tr><tr><td>5th</td><td>dirty hit</td></tr></tbody></table>`,
    )
    expect(rows).toEqual([
      { level: 3, names: ["Aerial Maneuver", "Lunge"] },
      { level: 5, names: ["Dirty Hit"] },
    ])
  })

  it("sanitizes bare Rogue paste into Alternate Rogue wiring", () => {
    const broken = {
      classes: [
        {
          name: "Rogue",
          description: null,
          primary_ability: ["dexterity"],
          hit_die: 8,
          features: [
            {
              level: 2,
              name: "Devious Exploits",
              description: "You learn exploits.",
              isChoice: true,
              choices: {
                category: "Devious Exploit",
                count: 2,
                optionsSource: "class_knacks",
                resourceKey: "exploits_known",
                options: [],
              },
            },
            {
              level: 6,
              name: "Expertise (Uncanny Dodge)",
              description: "Uncanny Dodge text.",
            },
          ],
        },
      ],
      subclasses: [
        {
          name: "Acrobat",
          class_name: "Rogue",
          features: [
            {
              level: 3,
              name: "Acrobat Exploits",
              description:
                "<table><tbody><tr><td>3rd</td><td>aerial maneuver, lunge</td></tr></tbody></table>",
              mechanics: [],
            },
          ],
        },
        {
          name: "Saboteur",
          class_name: "Rogue",
          features: [{ level: 3, name: "Alchemical Explosives", description: "Bombs." }],
        },
      ],
      class_resources: [
        {
          class_name: "Rogue",
          resource_key: "exploit_dice",
          name: "Exploit Dice",
          uses: {
            type: "at_level",
            atLevelMode: "tier",
            atLevelTable: [
              { level: 2, count: 2 },
              { level: 5, count: 3 },
              { level: 11, count: 4 },
            ],
            dieSidesByLevel: [
              { level: 2, count: 4 },
              { level: 5, count: 6 },
              { level: 11, count: 8 },
              { level: 17, count: 10 },
            ],
            recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          },
        },
        {
          class_name: "Rogue",
          resource_key: "exploits_known",
          name: "Exploits Known",
          uses: {
            type: "special",
            atLevelMode: "tier",
            atLevelTable: [
              { level: 2, count: 2 },
              { level: 5, count: 3 },
              { level: 17, count: 8 },
            ],
          },
        },
      ],
      import_proposals: {
        custom_abilities: [
          {
            name: "Hand Bomb",
            ability_role: "knack",
            source_type: "subclass",
            source_name: "Saboteur",
            eligible_classes: ["Alternate Rogue"],
            definition: "A bomb.",
          },
          {
            name: "Aerial Maneuver",
            ability_role: "knack",
            eligible_classes: ["Rogue"],
            execution: "When you jump…",
            definition: "1st-degree.",
          },
        ],
      },
    } as unknown as ImportContent

    let next = sanitizeAlternateRogueImportContent(broken)
    next = sanitizeLaserLlamaExploitsImportContent(next)

    expect(next.classes?.[0]?.name).toBe("Alternate Rogue")
    expect(
      next.class_resources?.find((r) => r.resource_key === "exploit_dice")?.uses?.atLevelTable?.some(
        (t) => t.level === 17 && t.count === 5,
      ),
    ).toBe(true)
    expect(next.classes?.[0]?.features?.find((f) => /^uncanny dodge$/i.test(f.name ?? ""))).toBeDefined()
    expect(
      next.classes?.[0]?.features?.find((f) => /^devious exploits$/i.test(f.name ?? ""))?.choices
        ?.choiceCountByLevel?.length,
    ).toBeGreaterThan(0)

    const bomb = next.import_proposals?.custom_abilities?.find((a) => /^hand bomb$/i.test(a.name ?? ""))
    expect(bomb?.eligible_classes).toBeNull()

    const aerial = next.import_proposals?.custom_abilities?.find((a) =>
      /^aerial maneuver$/i.test(a.name ?? ""),
    )
    expect(aerial?.eligible_classes).toEqual(expect.arrayContaining(["Alternate Rogue"]))

    const acrobat = next.subclasses?.find((s) => /^acrobat$/i.test(s.name ?? ""))
    const grants = (acrobat?.features?.[0]?.mechanics ?? []).filter(
      (m) => (m as { kind?: string }).kind === "grant_custom_ability",
    )
    expect(grants.length).toBeGreaterThanOrEqual(1)
  })
})
