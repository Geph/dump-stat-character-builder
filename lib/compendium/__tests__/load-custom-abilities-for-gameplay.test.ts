import { describe, expect, it } from "vitest"
import {
  buildDefaultMetamagicOptions,
  METAMAGIC_OPTIONS_CATALOG_ID,
} from "@/lib/compendium/system-option-catalogs"
import { catalogFeatPickOptions } from "@/lib/builder/catalog-feat-options"
import type { CustomAbility } from "@/lib/types"

describe("loadCustomAbilitiesForGameplay integration", () => {
  it("catalog feat picks resolve when system catalogs are included in abilities list", () => {
    const abilities: CustomAbility[] = [
      {
        id: METAMAGIC_OPTIONS_CATALOG_ID,
        name: "Metamagic Options",
        modifier_catalog: buildDefaultMetamagicOptions(),
        show_in_builder: false,
        is_system: true,
      } as CustomAbility,
    ]

    const options = catalogFeatPickOptions(["Metamagic"], abilities)
    expect(options.length).toBeGreaterThan(5)
    expect(options.some((row) => row.name === "Twinned Spell")).toBe(true)
  })
})
