/**
 * Weapon-bound spell buffs (Magic Weapon, Elemental Weapon, …).
 *
 * Play state owns which equipment id is enchanted. Sheet toggles gate the catalog
 * modifiers; those modifiers are excluded from the flattened aggregate and applied
 * only to the bound weapon in deriveWeaponAttack.
 */
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"

export type WeaponSpellBuffId = "magic_weapon_active" | "elemental_weapon_active"

export type WeaponSpellBuffDefinition = {
  toggleId: WeaponSpellBuffId
  label: string
  /** Spell / action names that start this buff (lowercased). */
  activateNames: readonly string[]
  hint: string
}

export const WEAPON_SPELL_BUFFS: readonly WeaponSpellBuffDefinition[] = [
  {
    toggleId: "magic_weapon_active",
    label: "Magic Weapon",
    activateNames: ["magic weapon", "consecrated whetstone"],
    hint: "Concentration, up to 1 hour. +1 to attack and damage with the chosen weapon.",
  },
  {
    toggleId: "elemental_weapon_active",
    label: "Elemental Weapon",
    activateNames: ["elemental weapon"],
    hint: "Concentration. Enchant one weapon; pick damage type when casting.",
  },
]

const BY_TOGGLE = new Map(WEAPON_SPELL_BUFFS.map((entry) => [entry.toggleId, entry]))

export function isWeaponSpellBuffToggleId(toggleId: string): toggleId is WeaponSpellBuffId {
  return BY_TOGGLE.has(toggleId as WeaponSpellBuffId)
}

export function weaponSpellBuffDefinition(
  toggleId: string,
): WeaponSpellBuffDefinition | null {
  return BY_TOGGLE.get(toggleId as WeaponSpellBuffId) ?? null
}

/** Toggle id activated by casting / using this spell or named action. */
export function weaponSpellBuffToggleForActionName(name: string): WeaponSpellBuffId | null {
  const needle = name.trim().toLowerCase()
  if (!needle) return null
  for (const buff of WEAPON_SPELL_BUFFS) {
    if (buff.activateNames.includes(needle)) return buff.toggleId
  }
  return null
}

export function boundWeaponIdForToggle(
  bindings: Record<string, string> | null | undefined,
  toggleId: string,
): string | null {
  const id = bindings?.[toggleId]?.trim()
  return id || null
}

export function isWeaponSpellBuffActiveOnWeapon(params: {
  toggleId: string
  weaponId: string
  activeToggleIds: Iterable<string> | null | undefined
  bindings: Record<string, string> | null | undefined
}): boolean {
  if (!isWeaponSpellBuffToggleId(params.toggleId)) return false
  let active = false
  for (const id of params.activeToggleIds ?? []) {
    if (id === params.toggleId) {
      active = true
      break
    }
  }
  if (!active) return false
  return boundWeaponIdForToggle(params.bindings, params.toggleId) === params.weaponId
}

/** True when this characteristic is a weapon-bound spell buff (skip flat aggregate). */
export function isWeaponBoundSpellBuffModifier(mod: CharacteristicModifier): boolean {
  const toggle = mod.requiresSheetToggle
  return Boolean(toggle && isWeaponSpellBuffToggleId(toggle))
}

export function activeWeaponSpellBuffsOnWeapon(params: {
  weaponId: string
  activeToggleIds: readonly string[] | null | undefined
  bindings: Record<string, string> | null | undefined
}): WeaponSpellBuffDefinition[] {
  const out: WeaponSpellBuffDefinition[] = []
  for (const buff of WEAPON_SPELL_BUFFS) {
    if (
      isWeaponSpellBuffActiveOnWeapon({
        toggleId: buff.toggleId,
        weaponId: params.weaponId,
        activeToggleIds: params.activeToggleIds,
        bindings: params.bindings,
      })
    ) {
      out.push(buff)
    }
  }
  return out
}

/**
 * Attack / damage bonuses from weapon-bound spell buffs for one weapon.
 * Walks raw characteristics so amounts stay catalog-driven.
 */
export function weaponSpellBuffRollBonuses(params: {
  mods: readonly CharacteristicModifier[]
  weaponId: string
  activeToggleIds: Iterable<string> | null | undefined
  bindings: Record<string, string> | null | undefined
}): { attack: number; damage: number; labels: string[] } {
  let attack = 0
  let damage = 0
  const labels: string[] = []
  const seen = new Set<string>()

  for (const mod of params.mods) {
    if (!isWeaponBoundSpellBuffModifier(mod)) continue
    const toggleId = mod.requiresSheetToggle as SheetToggleKey
    if (
      !isWeaponSpellBuffActiveOnWeapon({
        toggleId,
        weaponId: params.weaponId,
        activeToggleIds: params.activeToggleIds,
        bindings: params.bindings,
      })
    ) {
      continue
    }
    const def = weaponSpellBuffDefinition(toggleId)
    if (mod.type === "attack_roll_modifiers") {
      for (const entry of mod.entries ?? []) {
        attack += entry.bonus ?? 0
      }
      if (def && !seen.has(`atk:${toggleId}`)) {
        seen.add(`atk:${toggleId}`)
        labels.push(def.label)
      }
    }
    if (mod.type === "damage_roll_modifiers") {
      for (const entry of mod.entries ?? []) {
        damage += entry.bonus ?? 0
      }
      if (def && !seen.has(`dmg:${toggleId}`)) {
        seen.add(`dmg:${toggleId}`)
        if (!labels.includes(def.label)) labels.push(def.label)
      }
    }
  }

  return { attack, damage, labels }
}

export function normalizeSheetToggleWeaponIds(
  raw: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(
    Object.entries(raw)
      .filter(
        ([key, value]) =>
          key.trim().length > 0 && typeof value === "string" && value.trim().length > 0,
      )
      .map(([key, value]) => [key, value.trim()]),
  )
}

export function clearWeaponBindingsForToggles(
  bindings: Record<string, string>,
  toggleIds: readonly string[],
): Record<string, string> {
  if (!toggleIds.length) return bindings
  const next = { ...bindings }
  let changed = false
  for (const id of toggleIds) {
    if (id in next) {
      delete next[id]
      changed = true
    }
  }
  return changed ? next : bindings
}
