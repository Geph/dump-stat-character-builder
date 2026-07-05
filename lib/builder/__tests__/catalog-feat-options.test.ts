import { describe, expect, it } from "vitest"
import {
  buildCatalogFeatPickId,
  catalogFeatPickOptions,
  isCatalogFeatPickId,
  parseCatalogFeatPickId,
  resolveCatalogFeatPickLabel,
  slotUsesCatalogFeatPicks,
} from "@/lib/builder/catalog-feat-options"
import { buildDefaultEldritchInvocations } from "@/lib/compendium/system-option-catalogs"
import type { CustomAbility } from "@/lib/types"

const ELDRITCH_CATALOG_ID = "00000000-0000-4000-8000-000000000003"

function mockEldritchCatalogAbility(): CustomAbility {
  return {
    id: ELDRITCH_CATALOG_ID,
    name: "Eldritch Invocations",
    modifier_catalog: buildDefaultEldritchInvocations(),
  } as CustomAbility
}

describe("catalog-feat-options", () => {
  it("detects Eldritch Invocation catalog slots", () => {
    expect(slotUsesCatalogFeatPicks(["Eldritch Invocation"])).toBe(true)
    expect(slotUsesCatalogFeatPicks(["General"])).toBe(false)
    expect(slotUsesCatalogFeatPicks(["Fighting Style"])).toBe(false)
  })

  it("builds and parses catalog feat pick ids", () => {
    const pickId = buildCatalogFeatPickId(ELDRITCH_CATALOG_ID, "cat_invocation_0")
    expect(isCatalogFeatPickId(pickId)).toBe(true)
    expect(parseCatalogFeatPickId(pickId)).toEqual({
      catalogAbilityId: ELDRITCH_CATALOG_ID,
      entryId: "cat_invocation_0",
    })
  })

  it("lists Eldritch Invocation options from the system catalog", () => {
    const options = catalogFeatPickOptions(
      ["Eldritch Invocation"],
      [mockEldritchCatalogAbility()],
    )
    expect(options.length).toBeGreaterThan(5)
    expect(options.some((row) => row.name === "Agonizing Blast")).toBe(true)
  })

  it("resolves catalog pick labels", () => {
    const ability = mockEldritchCatalogAbility()
    const pickId = buildCatalogFeatPickId(ELDRITCH_CATALOG_ID, "cat_invocation_0")
    expect(resolveCatalogFeatPickLabel(pickId, [ability])).toBe("Agonizing Blast")
  })
})
