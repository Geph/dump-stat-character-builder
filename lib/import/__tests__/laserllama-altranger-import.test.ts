import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { knackAbilitiesForClass } from "@/lib/builder/knack-choices"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import {
  sanitizeAlternateRangerImportContent,
  sanitizeLaserLlamaRangerKnacksImportContent,
} from "@/lib/import/enrichment-presets/packs/alternate-ranger"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility } from "@/lib/types"

const CLASS_FILE = "laserllama-altranger-class"
const KNACKS_FILE = "laserllama-knacks-custom"
const EXPLOITS_FILE = "laserllama-exploits-custom"

describe("LaserLlama Alternate Ranger import", () => {
  const classPath = resolveHomebrewImportJsonPath(CLASS_FILE)
  const knacksPath = resolveHomebrewImportJsonPath(KNACKS_FILE)
  const exploitsPath = resolveHomebrewImportJsonPath(EXPLOITS_FILE)
  const skip = !classPath || !knacksPath

  function loadMerged(): ImportContent {
    const classJson = JSON.parse(readFileSync(classPath!, "utf8")) as ImportContent
    const knacksJson = JSON.parse(readFileSync(knacksPath!, "utf8")) as ImportContent
    const exploitsJson = exploitsPath
      ? (JSON.parse(readFileSync(exploitsPath, "utf8")) as ImportContent)
      : null
    return {
      ...classJson,
      import_proposals: {
        ...classJson.import_proposals,
        custom_abilities: [
          ...(classJson.import_proposals?.custom_abilities ?? []),
          ...(knacksJson.import_proposals?.custom_abilities ?? []),
          ...(exploitsJson?.import_proposals?.custom_abilities ?? []),
        ],
      },
      creatures: [
        ...(classJson.creatures ?? []),
        ...(exploitsJson?.creatures ?? []),
      ],
    }
  }

  it.skipIf(skip)("wires Quarry, Knacks, and Bounty Hunter Martial Exploits", () => {
    const content = sanitizeHomebrewImportJson(loadMerged()) as ImportContent
    const enriched = applyImportEnrichmentPresets(content)

    const cls = enriched.classes?.[0]
    expect(cls?.name).toBe("Alternate Ranger")

    const keys = (enriched.class_resources ?? []).map((r) => r.resource_key)
    expect(keys).toEqual(
      expect.arrayContaining(["quarry", "quarry_die", "knacks_known", "exploit_degree"]),
    )

    const quarry = enriched.class_resources?.find((r) => r.resource_key === "quarry")
    expect(quarry?.uses?.type).toBe("ability_modifier")
    expect(quarry?.uses?.restoreBySpellSlot).toEqual({ minSpellLevel: 1, restores: 1 })
    expect(
      quarry?.uses?.rechargeOverrides?.some((o) => o.atClassLevel === 10),
    ).toBe(true)

    const quarryDie = enriched.class_resources?.find((r) => r.resource_key === "quarry_die")
    expect(quarryDie?.uses?.dieSidesByLevel?.some((t) => t.level === 2 && t.count === 4)).toBe(true)
    expect(quarryDie?.uses?.atLevelTable).toBeUndefined()

    const knacksFeat = cls?.features?.find((f) => /^knacks$/i.test(f.name ?? ""))
    expect(knacksFeat?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "knacks_known",
      swappableOnRest: false,
    })
    expect(knacksFeat?.choices?.choiceCountByLevel?.some((t) => t.level === 1 && t.count === 1)).toBe(
      true,
    )

    const quarryFeat = cls?.features?.find((f) => /quarry/i.test(f.name ?? ""))
    expect(
      (quarryFeat?.mechanics ?? []).some(
        (m) =>
          (m as { kind?: string; classResourceKey?: string }).kind === "uses" &&
          (m as { classResourceKey?: string }).classResourceKey === "quarry",
      ),
    ).toBe(true)

    const abilities = enriched.import_proposals?.custom_abilities ?? []
    const knackRows = abilities.filter(
      (a) => a.ability_role === "knack" && a.source_name === "Alternate Ranger",
    )
    expect(knackRows.length).toBeGreaterThanOrEqual(30)
    expect(knackRows.some((a) => a.name === "Wild Insight")).toBe(true)
    expect(knackRows.some((a) => a.name === "Wild Insight I")).toBe(false)
    expect(
      knackAbilitiesForClass(abilities as unknown as CustomAbility[], ["Alternate Ranger"]).length,
    ).toBeGreaterThanOrEqual(30)

    const bounty = enriched.subclasses?.find((s) => /^bounty hunter$/i.test(s.name ?? ""))
    const martial = bounty?.features?.find((f) => /^martial exploits$/i.test(f.name ?? ""))
    expect(martial?.choices?.optionsSource).toBeUndefined()
    expect((martial?.choices?.options?.length ?? 0)).toBeGreaterThanOrEqual(40)
    expect(martial?.choices?.resourceKey).toBe("exploits_known")

    const summary = summarizeFindings(auditImportWiring(enriched))
    expect(
      summary.errors,
      JSON.stringify(auditImportWiring(enriched).filter((f) => f.severity === "error")),
    ).toBe(0)
  })

  it.skipIf(skip)("sanitizer renames bare Ranger and remaps quarry_die sides", () => {
    const raw = JSON.parse(readFileSync(classPath!, "utf8")) as ImportContent
    const exploitsRaw = exploitsPath
      ? (JSON.parse(readFileSync(exploitsPath, "utf8")) as ImportContent)
      : null
    const broken: ImportContent = {
      ...raw,
      classes: (raw.classes ?? []).map((cls) => ({ ...cls, name: "Ranger" })),
      class_resources: (raw.class_resources ?? [])
        .filter((r) => r.resource_key !== "quarry")
        .map((r) =>
          r.resource_key === "quarry_die"
            ? {
                ...r,
                class_name: "Ranger",
                uses: {
                  type: "special",
                  atLevelMode: "tier",
                  atLevelTable: r.uses?.dieSidesByLevel ?? [
                    { level: 2, count: 4 },
                    { level: 18, count: 12 },
                  ],
                  dieSidesByLevel: undefined,
                },
              }
            : { ...r, class_name: "Ranger" },
        ),
      import_proposals: {
        ...raw.import_proposals,
        custom_abilities: [
          ...(raw.import_proposals?.custom_abilities ?? []),
          ...(exploitsRaw?.import_proposals?.custom_abilities ?? []).slice(0, 5),
        ],
      },
      subclasses: (raw.subclasses ?? []).map((sc) => ({
        ...sc,
        class_name: "Ranger",
        features: (sc.features ?? []).map((f) =>
          /^martial exploits$/i.test(f.name ?? "")
            ? {
                ...f,
                choices: {
                  category: "Martial Exploit",
                  count: 2,
                  options: [],
                  optionsSource: "class_knacks",
                  resourceKey: "exploits_known",
                },
              }
            : f,
        ),
      })),
    }

    const sanitized = sanitizeAlternateRangerImportContent(broken)
    expect(sanitized.classes?.[0]?.name).toBe("Alternate Ranger")
    const die = sanitized.class_resources?.find((r) => r.resource_key === "quarry_die")
    expect(die?.uses?.dieSidesByLevel?.length).toBeGreaterThan(0)
    expect(die?.uses?.atLevelTable).toBeUndefined()
    expect(sanitized.class_resources?.some((r) => r.resource_key === "quarry")).toBe(true)

    const martial = sanitized.subclasses
      ?.find((s) => /^bounty hunter$/i.test(s.name ?? ""))
      ?.features?.find((f) => /^martial exploits$/i.test(f.name ?? ""))
    expect(martial?.choices?.optionsSource).toBeUndefined()
    expect((martial?.choices?.options?.length ?? 0)).toBeGreaterThan(0)
  })

  it.skipIf(skip)("knacks-only paste normalizes source_name Alternate Ranger", () => {
    const raw = JSON.parse(readFileSync(knacksPath!, "utf8")) as ImportContent
    const stripped: ImportContent = {
      ...raw,
      import_proposals: {
        ...raw.import_proposals,
        custom_abilities: (raw.import_proposals?.custom_abilities ?? []).map((a) => ({
          ...a,
          source_name: "Ranger",
        })),
      },
    }
    const sanitized = sanitizeLaserLlamaRangerKnacksImportContent(stripped)
    const abilities = sanitized.import_proposals?.custom_abilities ?? []
    expect(abilities.every((a) => a.source_name === "Alternate Ranger")).toBe(true)
    expect(abilities.every((a) => a.ability_role === "knack")).toBe(true)
  })
})
