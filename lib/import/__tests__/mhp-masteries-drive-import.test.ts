import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { aggregateUpgradeOptions } from "@/lib/builder/upgrade-choices"
import { weaponMasteryCatalogEntriesFromAbilities } from "@/lib/compendium/weapon-mastery"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { combineImportContents } from "@/lib/import/merge-import-content"
import {
  applyProposalSelections,
  collectImportProposals,
} from "@/lib/import/import-proposals"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { CustomAbility } from "@/lib/types"

const PATH = resolveHomebrewImportJsonPath("magehandpress-masteries-custom")
const CRAFTSMAN_PATH = resolveHomebrewImportJsonPath("magehandpress-craftsman-class")
const hasDriveFixture = Boolean(PATH)

describe.skipIf(!hasDriveFixture)("Mage Hand Press mastery library import", () => {
  it("routes every property without false passive modifiers", () => {
    const raw = parseImportContentJson(readFileSync(PATH!, "utf8"))!
    const enriched = applyImportEnrichmentPresets(raw)
    const proposals = collectImportProposals(enriched)
    expect(proposals.customAbilities).toHaveLength(19)
    expect(proposals.customAbilities.every((row) => row.abilityRole === "weapon_mastery")).toBe(true)

    const selected = applyProposalSelections(enriched, proposals, {
      classResourceIds: [],
      customAbilityIds: proposals.customAbilities.map((row) => row.id),
    })
    const wired = enrichImportContentModifiers(selected)
    expect(
      wired.abilities?.every(
        (row) =>
          row.ability_role === "weapon_mastery" &&
          !(row as unknown as { linkedModifiers?: unknown[] }).linkedModifiers?.length,
      ),
    ).toBe(true)

    const abilities = (wired.abilities ?? []).map(
      (row, index) =>
        ({
          ...row,
          id: `mastery-${index}`,
          prerequisites: row.prerequisite ?? null,
        }) as unknown as CustomAbility,
    )
    expect(weaponMasteryCatalogEntriesFromAbilities(abilities)).toHaveLength(19)
    expect(
      aggregateUpgradeOptions({
        customAbilities: abilities,
        classNames: ["Craftsman"],
        classLevel: 11,
        selectedUpgradeNames: [],
      }),
    ).toHaveLength(19)
    expect(
      aggregateUpgradeOptions({
        customAbilities: abilities,
        classNames: ["Dancer"],
        classLevel: 1,
        selectedUpgradeNames: [],
      }).map((option) => option.name),
    ).toEqual(expect.arrayContaining(["Parry", "Shift"]))
  })

  it.skipIf(!CRAFTSMAN_PATH)("stays correctly typed when merged before the Craftsman class", () => {
    const library = parseImportContentJson(readFileSync(PATH!, "utf8"))!
    const craftsman = parseImportContentJson(readFileSync(CRAFTSMAN_PATH!, "utf8"))!
    const merged = applyImportEnrichmentPresets(combineImportContents([library, craftsman]))
    const proposals = collectImportProposals(merged).customAbilities.filter(
      (row) => row.abilityRole === "weapon_mastery",
    )
    expect(proposals).toHaveLength(19)
    expect(new Set(proposals.map((row) => row.name)).size).toBe(19)
  })
})
