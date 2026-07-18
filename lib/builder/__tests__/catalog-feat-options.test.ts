import { describe, expect, it } from "vitest"
import {
  buildCatalogFeatPickId,
  catalogFeatPickOptions,
  isCatalogFeatPickId,
  parseCatalogFeatPickId,
  resolveCatalogFeatPickCharacteristics,
  resolveCatalogFeatPickLabel,
  slotUsesCatalogFeatPicks,
} from "@/lib/builder/catalog-feat-options"
import { buildDefaultEldritchInvocations } from "@/lib/compendium/system-option-catalogs"
import { buildDefaultModifierCatalog } from "@/lib/compendium/modifier-catalog"
import type { CustomAbility } from "@/lib/types"

const ELDRITCH_CATALOG_ID = "00000000-0000-4000-8000-000000000003"

function mockEldritchCatalogAbility(): CustomAbility {
  return {
    id: ELDRITCH_CATALOG_ID,
    name: "Eldritch Invocations",
    modifier_catalog: buildDefaultEldritchInvocations(),
  } as unknown as CustomAbility
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

  it("resolves characteristics from linkedModifiers on catalog entries", () => {
    const common = buildDefaultModifierCatalog()

    const ability = {
      id: ELDRITCH_CATALOG_ID,
      name: "Eldritch Invocations",
      modifier_catalog: [
        {
          id: "cat_invocation_linked",
          name: "Linked Resist",
          group: "Eldritch Invocation",
          linkedModifiers: [
            {
              instanceId: "modinst_1",
              catalogRefId: "cat_char_damage_resistance",
              characteristics: [
                {
                  id: "mod_1",
                  type: "damage_resistance",
                  values: ["fire"],
                },
              ],
            },
          ],
          sheetDisplay: { featuresTab: true, combatActions: false, abilitiesActions: false },
          duration: "1_minute",
          limitedUses: { type: "per_rest", rest: "long_rest", amount: 1 },
        },
      ],
    } as unknown as CustomAbility

    const pickId = buildCatalogFeatPickId(ELDRITCH_CATALOG_ID, "cat_invocation_linked")
    const mods = resolveCatalogFeatPickCharacteristics(pickId, [ability], common)
    expect(mods.some((mod) => mod.type === "damage_resistance")).toBe(true)
  })

  it("still resolves legacy inline characteristics on catalog entries", () => {
    const ability = {
      id: ELDRITCH_CATALOG_ID,
      name: "Eldritch Invocations",
      modifier_catalog: [
        {
          id: "cat_invocation_inline",
          name: "Inline Resist",
          group: "Eldritch Invocation",
          characteristics: [
            {
              id: "mod_inline",
              type: "damage_resistance",
              values: ["cold"],
            },
          ],
        },
      ],
    } as unknown as CustomAbility

    const pickId = buildCatalogFeatPickId(ELDRITCH_CATALOG_ID, "cat_invocation_inline")
    const mods = resolveCatalogFeatPickCharacteristics(pickId, [ability], buildDefaultModifierCatalog())
    expect(mods).toEqual([
      expect.objectContaining({ type: "damage_resistance", values: ["cold"] }),
    ])
  })
})
