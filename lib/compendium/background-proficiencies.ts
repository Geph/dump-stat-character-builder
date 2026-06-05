import type { Background, CharacterDraft } from "@/lib/types"
import { SRD_TOOL_NAMES } from "@/lib/compendium/srd-tool-names"

export const BACKGROUND_ARMOR_OPTIONS = [
  "Light armor",
  "Medium armor",
  "Heavy armor",
  "Shields",
] as const

export const BACKGROUND_WEAPON_CATEGORY_OPTIONS = [
  "Simple weapons",
  "Martial weapons",
] as const

export type BackgroundProficiencies = {
  tools: string[]
  vehicles: string[]
  weapons: string[]
  armor: string[]
  languages: string[]
}

export const emptyBackgroundProficiencies = (): BackgroundProficiencies => ({
  tools: [],
  vehicles: [],
  weapons: [],
  armor: [],
  languages: [],
})

export function normalizeBackgroundProficiencies(
  proficiencies: BackgroundProficiencies | null | undefined,
  legacyToolProficiencies?: string[] | null,
): BackgroundProficiencies {
  if (proficiencies && typeof proficiencies === "object") {
    return {
      tools: mergeProficiencyLists(proficiencies.tools, proficiencies.vehicles),
      vehicles: [],
      weapons: [...(proficiencies.weapons ?? [])],
      armor: [...(proficiencies.armor ?? [])],
      languages: [...(proficiencies.languages ?? [])],
    }
  }
  return {
    ...emptyBackgroundProficiencies(),
    tools: [...(legacyToolProficiencies ?? [])],
  }
}

export function backgroundProficienciesToCharacterFields(
  proficiencies: BackgroundProficiencies,
): Pick<CharacterDraft, "tool_proficiencies" | "languages" | "weapon_proficiencies" | "armor_proficiencies"> {
  return {
    tool_proficiencies: [
      ...proficiencies.tools,
      ...proficiencies.vehicles,
    ],
    languages: [...proficiencies.languages],
    weapon_proficiencies: [...proficiencies.weapons],
    armor_proficiencies: [...proficiencies.armor],
  }
}

export function applyBackgroundProficienciesToDraft(
  draft: CharacterDraft,
  background: Pick<Background, "proficiencies" | "tool_proficiencies"> | null,
): CharacterDraft {
  if (!background) return draft
  const prof = normalizeBackgroundProficiencies(
    background.proficiencies as BackgroundProficiencies | null,
    background.tool_proficiencies,
  )
  const fields = backgroundProficienciesToCharacterFields(prof)
  return {
    ...draft,
    tool_proficiencies: fields.tool_proficiencies,
    languages: fields.languages.length > 0 ? fields.languages : draft.languages,
    weapon_proficiencies: fields.weapon_proficiencies,
    armor_proficiencies: fields.armor_proficiencies,
  }
}

export function mergeProficiencyLists(
  ...lists: (string[] | null | undefined)[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const item of list ?? []) {
      const trimmed = item?.trim()
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      out.push(trimmed)
    }
  }
  return out
}

export function getEffectiveWeaponProficiencies(
  classProficiencies: string[] | null | undefined,
  characterProficiencies: string[] | null | undefined,
  extra: string[] | null | undefined = [],
): string[] {
  return mergeProficiencyLists(classProficiencies, characterProficiencies, extra)
}

export function getEffectiveArmorProficiencies(
  classProficiencies: string[] | null | undefined,
  characterProficiencies: string[] | null | undefined,
  extra: string[] | null | undefined = [],
): string[] {
  return mergeProficiencyLists(classProficiencies, characterProficiencies, extra)
}

export function formatBackgroundProficiencies(
  proficiencies: BackgroundProficiencies,
): { label: string; items: string[] }[] {
  const sections: { label: string; items: string[] }[] = []
  const toolsAndVehicles = mergeProficiencyLists(proficiencies.tools, proficiencies.vehicles)
  if (toolsAndVehicles.length) {
    sections.push({ label: "Tools and Vehicles", items: toolsAndVehicles })
  }
  if (proficiencies.weapons.length) sections.push({ label: "Weapons", items: proficiencies.weapons })
  if (proficiencies.armor.length) sections.push({ label: "Armor", items: proficiencies.armor })
  if (proficiencies.languages.length) sections.push({ label: "Languages", items: proficiencies.languages })
  return sections
}

export function parseToolProficiencyField(text: string | null | undefined): string[] {
  if (!text?.trim()) return []
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^[_\s]*choose one kind of[_\s]*/i, "")
  cleaned = cleaned.replace(/^a\s+/i, "")
  cleaned = cleaned.replace(/\s*\(see\s+.*$/i, "").trim()
  if (/artisan'?s?\s+tools/i.test(cleaned)) {
    return ["Artisan's tools"]
  }
  return [cleaned]
}
