import { describe, expect, it, vi } from "vitest"
import {
  buildDefaultWeaponMasteryOptions,
  ensureSystemOptionCatalogs,
  getSystemCatalogDefaultIcon,
  LEGACY_SCHOOLS_OF_MAGIC_CATALOG_ID,
  SYSTEM_CATALOG_DEFAULT_ICONS,
  SYSTEM_OPTION_CATALOG_IDS,
  WEAPON_MASTERY_PROPERTIES_CATALOG_ID,
} from "@/lib/compendium/system-option-catalogs"
import { COMMON_MODIFIERS_CATALOG_ID } from "@/lib/compendium/modifier-catalog"

function mockDb(existingRows: Record<string, Record<string, unknown> | null>) {
  const inserts: Record<string, unknown>[] = []
  const updates: { id: string; patch: Record<string, unknown> }[] = []
  const deletes: string[] = []

  const from = vi.fn((table: string) => {
    if (table !== "custom_abilities") throw new Error(`unexpected table ${table}`)
    return {
      select: vi.fn(() => ({
        eq: vi.fn((_col: string, id: string) => ({
          maybeSingle: vi.fn(async () => ({ data: existingRows[id] ?? null, error: null })),
        })),
      })),
      insert: vi.fn(async (rows: Record<string, unknown>[]) => {
        inserts.push(...rows)
        return { error: null }
      }),
      update: vi.fn((patch: Record<string, unknown>) => ({
        eq: vi.fn(async (_col: string, id: string) => {
          updates.push({ id, patch })
          return { error: null }
        }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(async (_col: string, id: string) => {
          deletes.push(id)
          return { error: null }
        }),
      })),
    }
  })

  return {
    db: { from } as never,
    inserts,
    updates,
    deletes,
  }
}

describe("ensureSystemOptionCatalogs", () => {
  it("defines default icons for all system catalogs", () => {
    expect(SYSTEM_CATALOG_DEFAULT_ICONS[COMMON_MODIFIERS_CATALOG_ID]).toBe("hammer-nails")
    expect(getSystemCatalogDefaultIcon(WEAPON_MASTERY_PROPERTIES_CATALOG_ID)).toBe("winged-sword")
    expect(SYSTEM_OPTION_CATALOG_IDS).not.toContain(LEGACY_SCHOOLS_OF_MAGIC_CATALOG_ID)
  })

  it("deletes the legacy Schools of Magic catalog row", async () => {
    const { db, deletes } = mockDb({})
    await ensureSystemOptionCatalogs(db)
    expect(deletes).toContain(LEGACY_SCHOOLS_OF_MAGIC_CATALOG_ID)
  })

  it("inserts the Weapon Mastery Properties catalog when missing", async () => {
    const { db, inserts } = mockDb({})
    await ensureSystemOptionCatalogs(db)
    const weaponMasteryInsert = inserts.find((row) => row.id === WEAPON_MASTERY_PROPERTIES_CATALOG_ID)
    expect(weaponMasteryInsert).toBeTruthy()
    expect(weaponMasteryInsert?.name).toBe("Weapon Mastery Properties")
    expect(weaponMasteryInsert?.icon).toBe("winged-sword")
    expect(Array.isArray(weaponMasteryInsert?.modifier_catalog)).toBe(true)
  })

  it("merges missing default weapon mastery entries idempotently", async () => {
    const defaults = buildDefaultWeaponMasteryOptions()
    const existingCatalog = defaults.slice(0, 6)
    const { db, updates } = mockDb({
      [WEAPON_MASTERY_PROPERTIES_CATALOG_ID]: {
        id: WEAPON_MASTERY_PROPERTIES_CATALOG_ID,
        is_system: true,
        modifier_catalog: existingCatalog,
      },
    })

    await ensureSystemOptionCatalogs(db)

    const weaponMasteryUpdate = updates.find((row) => row.id === WEAPON_MASTERY_PROPERTIES_CATALOG_ID)
    expect(weaponMasteryUpdate).toBeTruthy()
    const merged = weaponMasteryUpdate!.patch.modifier_catalog as typeof defaults
    expect(merged).toHaveLength(8)
    expect(merged.map((entry) => entry.id)).toEqual(defaults.map((entry) => entry.id))
  })

  it("does not rewrite an up-to-date weapon mastery catalog", async () => {
    const defaults = buildDefaultWeaponMasteryOptions()
    const { db, updates } = mockDb({
      [WEAPON_MASTERY_PROPERTIES_CATALOG_ID]: {
        id: WEAPON_MASTERY_PROPERTIES_CATALOG_ID,
        is_system: true,
        modifier_catalog: defaults,
      },
    })

    await ensureSystemOptionCatalogs(db)

    expect(updates.some((row) => row.id === WEAPON_MASTERY_PROPERTIES_CATALOG_ID)).toBe(false)
  })
})
