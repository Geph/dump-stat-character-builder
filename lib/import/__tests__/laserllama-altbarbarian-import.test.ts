import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { knackAbilitiesForClass } from "@/lib/builder/knack-choices"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import {
  sanitizeAlternateBarbarianImportContent,
  sanitizeLaserLlamaExploitsImportContent,
} from "@/lib/import/enrichment-presets/packs/alternate-barbarian"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import { sanitizeHomebrewImportJson } from "@/lib/import/homebrew-import-ops/sanitize-import"
import type { ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility, UsesConfig } from "@/lib/types"

const CLASS_FILE = "laserllama-altbarbarian-class"
const EXPLOITS_FILE = "laserllama-exploits-custom"

describe("LaserLlama Alternate Barbarian import", () => {
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

  it.skipIf(skip)("wires Rage, Savage Exploits knacks, and path ancestry pickers", () => {
    const content = sanitizeHomebrewImportJson(loadMerged()) as ImportContent
    const enriched = applyImportEnrichmentPresets(content)

    const cls = enriched.classes?.[0]
    expect(cls?.name).toBe("Alternate Barbarian")

    const keys = (enriched.class_resources ?? []).map((r) => r.resource_key)
    expect(keys).toEqual(expect.arrayContaining(["rage", "exploit_dice", "exploits_known"]))
    expect(keys).not.toContain("rages")

    const rage = enriched.class_resources?.find((r) => r.resource_key === "rage")
    expect(rage?.class_name).toBe("Alternate Barbarian")
    expect(rage?.uses?.freeUseAfterLevel).toBe(20)
    expect(rage?.uses?.atLevelTable?.some((t) => t.level === 20 && t.count >= 50)).toBeFalsy()
    expect(
      resolveUsesAtLevel(rage!.uses as UsesConfig, 20),
    ).toBeNull()
    expect(resolveUsesAtLevel(rage!.uses as UsesConfig, 17)).toBe(6)

    const savage = cls?.features?.find((f) => /^savage exploits$/i.test(f.name ?? ""))
    expect(savage?.isChoice).toBe(true)
    expect(savage?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "exploits_known",
      swappableOnRest: false,
    })
    expect(savage?.choices?.choiceCountByLevel?.some((t) => t.level === 2 && t.count === 2)).toBe(
      true,
    )

    const abilities = (enriched.import_proposals?.custom_abilities ?? []) as unknown as CustomAbility[]
    const knacks = knackAbilitiesForClass(abilities, ["Alternate Barbarian"])
    expect(knacks.length).toBeGreaterThanOrEqual(50)
    expect(
      knacks.every((a) => a.ability_role === "knack" || (a.eligible_classes?.length ?? 0) > 0),
    ).toBe(true)
    expect(
      knacks.some((a) =>
        (a.eligible_classes ?? []).some((n) => /alternate\s+barbarian|^barbarian$/i.test(n)),
      ),
    ).toBe(true)

    const titan = enriched.subclasses?.find((s) => /path of the titan/i.test(s.name ?? ""))
    const giantBlood = titan?.features?.find((f) => /giant bloodline/i.test(f.name ?? ""))
    expect(giantBlood?.isChoice).toBe(true)
    expect((giantBlood?.choices?.options?.length ?? 0)).toBeGreaterThanOrEqual(6)

    const wyrm = enriched.subclasses?.find((s) => /wyrmblood/i.test(s.name ?? ""))
    const ancestry = wyrm?.features?.find((f) => /draconic ancestry/i.test(f.name ?? ""))
    expect(ancestry?.isChoice).toBe(true)
    expect((ancestry?.choices?.options?.length ?? 0)).toBeGreaterThanOrEqual(10)

    const summary = summarizeFindings(auditImportWiring(enriched))
    expect(summary.errors).toBe(0)
  })

  it.skipIf(skip)("sanitizer remaps rages→rage and freeUseAfterLevel without Drive edits", () => {
    const raw = JSON.parse(readFileSync(classPath!, "utf8")) as ImportContent
    const broken: ImportContent = {
      ...raw,
      class_resources: (raw.class_resources ?? []).map((r) =>
        r.resource_key === "rage"
          ? {
              ...r,
              resource_key: "rages",
              uses: {
                ...r.uses,
                freeUseAfterLevel: undefined,
                atLevelTable: [
                  ...(r.uses?.atLevelTable ?? []),
                  { level: 20, count: 100 },
                ],
              },
            }
          : r,
      ),
      classes: (raw.classes ?? []).map((cls) => ({
        ...cls,
        features: (cls.features ?? []).map((f) =>
          /^savage exploits$/i.test(f.name ?? "")
            ? { ...f, isChoice: false, choices: undefined }
            : f,
        ),
      })),
    }

    const sanitized = sanitizeAlternateBarbarianImportContent(broken)
    const rage = sanitized.class_resources?.find((r) => r.resource_key === "rage")
    expect(rage).toBeTruthy()
    expect(sanitized.class_resources?.some((r) => r.resource_key === "rages")).toBe(false)
    expect(rage?.uses?.freeUseAfterLevel).toBe(20)
    expect(rage?.uses?.atLevelTable?.some((t) => t.level === 20)).toBeFalsy()

    const savage = sanitized.classes?.[0]?.features?.find((f) =>
      /^savage exploits$/i.test(f.name ?? ""),
    )
    expect(savage?.choices?.optionsSource).toBe("class_knacks")
  })

  it.skipIf(skip)("exploits-only paste adds Alternate Barbarian eligible + knack role", () => {
    const raw = JSON.parse(readFileSync(exploitsPath!, "utf8")) as ImportContent
    // Strip enrichment fields to prove sanitizer restores them.
    const stripped: ImportContent = {
      ...raw,
      import_proposals: {
        ...raw.import_proposals,
        custom_abilities: (raw.import_proposals?.custom_abilities ?? []).map((a) => ({
          ...a,
          ability_role: undefined,
          eligible_classes: (a.eligible_classes ?? []).filter(
            (n) => !/alternate\s+barbarian/i.test(n),
          ),
        })),
      },
    }
    const sanitized = sanitizeLaserLlamaExploitsImportContent(stripped)
    const abilities = sanitized.import_proposals?.custom_abilities ?? []
    const barbEligible = abilities.filter((a) =>
      (a.eligible_classes ?? []).some((n) => /^barbarian$/i.test(n)),
    )
    expect(barbEligible.length).toBeGreaterThan(0)
    expect(
      barbEligible.every((a) =>
        (a.eligible_classes ?? []).some((n) => /alternate\s+barbarian/i.test(n)),
      ),
    ).toBe(true)
    expect(barbEligible.every((a) => a.ability_role === "knack")).toBe(true)
  })
})
