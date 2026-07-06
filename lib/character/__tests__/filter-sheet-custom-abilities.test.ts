import { describe, expect, it } from "vitest"
import {
  customAbilityAppliesOnCharacterSheet,
  filterCustomAbilitiesForCharacterSheet,
  type CharacterSheetAbilityContext,
} from "@/lib/character/filter-sheet-custom-abilities"
import {
  COMMON_MODIFIERS_CATALOG_ID,
  COMMON_MODIFIERS_CATALOG_NAME,
} from "@/lib/compendium/modifier-catalog"
import {
  ELDRITCH_INVOCATIONS_CATALOG_ID,
  METAMAGIC_OPTIONS_CATALOG_ID,
} from "@/lib/compendium/system-option-catalogs"
import type { CustomAbility } from "@/lib/types"

function ability(partial: Partial<CustomAbility> & Pick<CustomAbility, "id" | "name">): CustomAbility {
  return {
    description: null,
    prerequisites: null,
    characteristics: null,
    attached_to_type: null,
    attached_to_id: null,
    uses: null,
    show_in_builder: true,
    icon: null,
    source: "Custom",
    creator_url: null,
    created_at: "",
    updated_at: "",
    ...partial,
  }
}

const warlockCtx: CharacterSheetAbilityContext = {
  classIds: ["class-warlock"],
  classNames: ["Warlock"],
  subclassIds: [],
  subclassNames: [],
  speciesId: null,
  speciesName: null,
  backgroundId: null,
  backgroundName: null,
  featIds: [],
  featNames: [],
  equipmentIds: [],
  equipmentCategories: [],
  spellIds: [],
}

describe("filterCustomAbilitiesForCharacterSheet", () => {
  it("hides common modifiers and unrelated system catalogs", () => {
    const rows = [
      ability({ id: COMMON_MODIFIERS_CATALOG_ID, name: COMMON_MODIFIERS_CATALOG_NAME, is_system: true }),
      ability({ id: METAMAGIC_OPTIONS_CATALOG_ID, name: "Metamagic Options", is_system: true }),
      ability({ id: ELDRITCH_INVOCATIONS_CATALOG_ID, name: "Eldritch Invocations", is_system: true }),
    ]

    expect(filterCustomAbilitiesForCharacterSheet(rows, warlockCtx).map((row) => row.id)).toEqual([
      ELDRITCH_INVOCATIONS_CATALOG_ID,
    ])
  })

  it("shows class-attached abilities only for matching classes", () => {
    const psionDiscipline = ability({
      id: "discipline-1",
      name: "Primary Discipline",
      attached_to_type: "class",
      attached_to_id: "class-psion",
    })

    expect(
      customAbilityAppliesOnCharacterSheet(psionDiscipline, {
        ...warlockCtx,
        classIds: ["class-psion"],
        classNames: ["KibblesTasty Psion"],
      }),
    ).toBe(true)
    expect(customAbilityAppliesOnCharacterSheet(psionDiscipline, warlockCtx)).toBe(false)
  })

  it("uses import source metadata when no attachment is set", () => {
    const row = ability({
      id: "imported-discipline",
      name: "Knowing Mind",
      source_type: "class",
      source_name: "KibblesTasty Psion",
    } as unknown as CustomAbility & { source_type: string; source_name: string })

    expect(
      customAbilityAppliesOnCharacterSheet(row, {
        ...warlockCtx,
        classNames: ["KibblesTasty Psion"],
      }),
    ).toBe(true)
    expect(customAbilityAppliesOnCharacterSheet(row, warlockCtx)).toBe(false)
  })
})
