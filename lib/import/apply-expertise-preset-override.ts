import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/feat-modifier-presets"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import type { Feature, LinkedModifierInstance } from "@/lib/types"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"

const WORD_TO_COUNT: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }

function parseExpertisePickCount(description: string): number | null {
  const text = description.trim()
  if (!text) return null

  const another = text.match(
    /\banother\s+(?:skill\s+or\s+tool|skill\s+and\s+tool)\s+proficienc/i,
  )
  if (another) return 1

  const combination = text.match(
    /\bany combination of (one|two|three|four|\d+) skill(?:s)?(?:\s+and|\s+or)\s+tool proficienc/i,
  )
  if (combination) {
    const raw = combination[1].toLowerCase()
    const count = WORD_TO_COUNT[raw] ?? parseInt(raw, 10)
    return Number.isFinite(count) && count > 0 ? count : null
  }

  const choose = text.match(
    /\bchoose (one|two|three|four|\d+) (?:skills?|skill or tools?)(?:\s+of your choice)?(?:\s+to (?:gain|have) (?:this benefit|Expertise))?/i,
  )
  if (choose) {
    const raw = choose[1].toLowerCase()
    const count = WORD_TO_COUNT[raw] ?? parseInt(raw, 10)
    return Number.isFinite(count) && count > 0 ? count : null
  }

  return null
}

function descriptionUsesSkillOrToolPick(description: string): boolean {
  return /\bskill(?:s)?(?:\s+and|\s+or)\s+tool proficienc/i.test(description)
}

function expertiseModId(key: string): string {
  return `mod_${key}`
}

function skillOrToolExpertiseChoice(
  groupId: string,
  count: number,
  label?: string,
): LinkedModifierInstance[] {
  return [
    {
      instanceId: `modinst_${groupId}_skill`,
      catalogRefId: FEAT_MODIFIER_CATALOG.skills,
      characteristics: [
        {
          id: expertiseModId(`${groupId}_skill`),
          type: "skills",
          entries: [],
          allowAnySkill: true,
          choiceCount: 0,
          grantExpertise: true,
          sharedChoiceGroup: groupId,
          sharedChoiceCount: count,
          label,
        },
      ],
    },
    {
      instanceId: `modinst_${groupId}_tool`,
      catalogRefId: FEAT_MODIFIER_CATALOG.toolProficiencies,
      characteristics: [
        {
          id: expertiseModId(`${groupId}_tool`),
          type: "tool_proficiencies",
          values: [],
          choiceCount: 0,
          grantExpertise: true,
          sharedChoiceGroup: groupId,
          sharedChoiceCount: count,
          label,
        },
      ],
    },
  ]
}

function patchSkillsModifier(
  mod: CharacteristicModifier,
  count: number,
  skillOrTool: boolean,
  featureLevel: number,
): CharacteristicModifier {
  if (skillOrTool) {
    return {
      ...mod,
      choiceCount: 0,
      sharedChoiceGroup: `expertise_${featureLevel}`,
      sharedChoiceCount: count,
      grantExpertise: true,
    }
  }
  return { ...mod, choiceCount: count, grantExpertise: true }
}

/** Override *::Expertise preset pick count (and skill-or-tool shape) from feature text. */
export function applyExpertisePresetOverride(feature: Feature): Feature {
  if ((feature.name ?? "").trim() !== "Expertise") return feature

  const count = parseExpertisePickCount(feature.description ?? "")
  if (count == null) return feature

  const skillOrTool = descriptionUsesSkillOrToolPick(feature.description ?? "")
  const level = feature.level ?? 1
  const label = feature.linkedModifiers?.[0]?.characteristics?.[0]?.label ?? "Expertise"

  if (skillOrTool) {
    const groupId = `expertise_${level}`
    const replacements = skillOrToolExpertiseChoice(groupId, count, label)
    const kept = (feature.linkedModifiers ?? []).filter(
      (inst) =>
        !inst.characteristics?.some(
          (char) => char.type === "skills" || char.type === "tool_proficiencies",
        ),
    )
    return syncModifierRefs({
      ...feature,
      linkedModifiers: [...kept, ...replacements],
      importModifierMeta: feature.importModifierMeta,
    })
  }

  const linked = (feature.linkedModifiers ?? []).map((inst) => {
    const characteristics = inst.characteristics?.map((mod) =>
      mod.type === "skills" ? patchSkillsModifier(mod, count, false, level) : mod,
    )
    return characteristics ? { ...inst, characteristics } : inst
  })

  return syncModifierRefs({
    ...feature,
    linkedModifiers: linked,
    importModifierMeta: feature.importModifierMeta,
  })
}
