import { describe, expect, it } from "vitest"
import {
  baseCompendiumName,
  filterPreferredSourceReplacements,
  preferredSourcesFromClasses,
  resolvePreferredNameMatch,
} from "@/lib/compendium/prefer-same-source"
import { resolveSpellNamesToIds } from "@/lib/import/subclass-spell-table"
import { SRD_SOURCE } from "@/lib/srd/source"

describe("prefer-same-source", () => {
  it("strips Alternate/Imported rename suffixes", () => {
    expect(baseCompendiumName("Fireball (Alternate)")).toBe("Fireball")
    expect(baseCompendiumName("Archery (Imported)")).toBe("Archery")
    expect(baseCompendiumName("Fireball")).toBe("Fireball")
  })

  it("resolves bare names to preferred-source renamed replacements", () => {
    const catalog = [
      { id: "srd", name: "Fireball", source: SRD_SOURCE },
      { id: "ll", name: "Fireball (Alternate)", source: "LaserLlama" },
    ]
    expect(resolvePreferredNameMatch("Fireball", catalog, "LaserLlama")?.id).toBe("ll")
    expect(resolvePreferredNameMatch("Fireball", catalog)?.id).toBe("srd")
  })

  it("resolveSpellNamesToIds prefers same-source replacements", () => {
    const catalog = [
      { id: "srd", name: "Cure Wounds", source: SRD_SOURCE },
      { id: "ll", name: "Cure Wounds (Imported)", source: "laserllama" },
    ]
    const { resolved, missing } = resolveSpellNamesToIds(
      ["Cure Wounds", "Missing Spell"],
      catalog,
      "laserllama",
    )
    expect(resolved).toEqual([{ name: "Cure Wounds (Imported)", spellId: "ll" }])
    expect(missing).toEqual(["Missing Spell"])
  })

  it("routes spell print-name aliases to the canonical SRD row", () => {
    const catalog = [
      { id: "stub-feeblemind", name: "Feeblemind", source: "Custom" },
      { id: "srd-befuddlement", name: "Befuddlement", source: SRD_SOURCE },
      { id: "stub-detect", name: "Detect Good and Evil", source: "Kibbles Tasty" },
      { id: "srd-detect", name: "Detect Evil and Good", source: SRD_SOURCE },
      { id: "stub-pass", name: "Pass without a Trace", source: "Custom" },
      { id: "srd-pass", name: "Pass without Trace", source: SRD_SOURCE },
    ]
    expect(resolvePreferredNameMatch("Feeblemind", catalog)?.id).toBe("srd-befuddlement")
    expect(resolvePreferredNameMatch("Befuddlement", catalog)?.id).toBe("srd-befuddlement")
    expect(resolvePreferredNameMatch("Detect Good and Evil", catalog)?.id).toBe("srd-detect")
    expect(resolvePreferredNameMatch("Detect Evil and Good", catalog)?.id).toBe("srd-detect")
    expect(resolvePreferredNameMatch("Pass without a Trace", catalog)?.id).toBe("srd-pass")
    expect(resolvePreferredNameMatch("Pass without Trace", catalog)?.id).toBe("srd-pass")

    const animateCatalog = [
      { id: "srd-animate", name: "Animate Objects", source: SRD_SOURCE },
      {
        id: "kib-dancing",
        name: "Dancing Objects (Animate Object)",
        source: "Kibbles Tasty",
      },
    ]
    expect(resolvePreferredNameMatch("Animate Objects", animateCatalog)?.id).toBe("kib-dancing")
    expect(
      resolvePreferredNameMatch("Dancing Objects (Animate Object)", animateCatalog)?.id,
    ).toBe("kib-dancing")

    const { resolved } = resolveSpellNamesToIds(
      ["Feeblemind", "Detect Good and Evil", "Pass without a Trace", "Animate Objects"],
      [...catalog, ...animateCatalog],
    )
    expect(resolved.map((row) => row.spellId)).toEqual([
      "srd-befuddlement",
      "srd-detect",
      "srd-pass",
      "kib-dancing",
    ])
  })
  it("filters SRD duplicates when a preferred-source replacement exists", () => {
    const feats = [
      { id: "1", name: "Archery", source: SRD_SOURCE },
      { id: "2", name: "Archery (Alternate)", source: "LaserLlama" },
      { id: "3", name: "Defense", source: SRD_SOURCE },
    ]
    const filtered = filterPreferredSourceReplacements(feats, ["LaserLlama"])
    expect(filtered.map((f) => f.id)).toEqual(["2", "3"])
  })

  it("collects preferred sources from opted-in classes", () => {
    expect(
      preferredSourcesFromClasses([
        { source: "LaserLlama", prefer_same_source_replacements: true },
        { source: SRD_SOURCE, prefer_same_source_replacements: true },
        { source: "MCDM", prefer_same_source_replacements: false },
      ]),
    ).toEqual(["LaserLlama"])
  })
})
