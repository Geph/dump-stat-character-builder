import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/feat-modifier-presets"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Feature } from "@/lib/types"
import type { CharacteristicModifier, SkillsCharacteristic } from "@/lib/compendium/characteristic-modifiers"

const WORD_TO_COUNT: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }

function parseCountToken(raw: string): number | null {
  const key = raw.toLowerCase()
  const count = WORD_TO_COUNT[key] ?? parseInt(raw, 10)
  return Number.isFinite(count) && count > 0 ? count : null
}

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
  if (combination) return parseCountToken(combination[1])

  const choose = text.match(
    /\bchoose (one|two|three|four|\d+) (?:skills?|skill or tools?)(?:\s+of your choice)?(?:\s+to (?:gain|have) (?:this benefit|Expertise))?/i,
  )
  if (choose) return parseCountToken(choose[1])

  const chooseOfYours = text.match(
    /\bchoose (one|two|three|four|\d+)(?: more)? of your (?:skill|skill or tool) proficienc/i,
  )
  if (chooseOfYours) return parseCountToken(chooseOfYours[1])

  const gainInSkills = text.match(
    /\bgain Expertise in (one|two|three|four|\d+) of your skill proficienc/i,
  )
  if (gainInSkills) return parseCountToken(gainInSkills[1])

  return null
}

/** Later-level "two more" grants on the same Expertise feature (Investigator L9). */
export function parseExpertiseCountUnlocks(
  description: string,
): { unlocksAtClassLevel: number; count: number }[] {
  const unlocks: { unlocksAtClassLevel: number; count: number }[] = []
  const pattern =
    /at(?:\s+[A-Za-z][\w']*)?\s+(?:level\s+(\d+)|(\d+)(?:st|nd|rd|th)\s+level),?\s+you gain Expertise in (one|two|three|four|\d+) more/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(description)) !== null) {
    const level = parseInt(match[1] || match[2], 10)
    const count = parseCountToken(match[3])
    if (Number.isFinite(level) && level > 0 && count) {
      unlocks.push({ unlocksAtClassLevel: level, count })
    }
  }
  return unlocks
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
  count: number | null,
  skillOrTool: boolean,
  featureLevel: number,
  unlocks: { unlocksAtClassLevel: number; count: number }[],
): CharacteristicModifier {
  const nextCount = count ?? (mod as SkillsCharacteristic).choiceCount ?? 2
  if (skillOrTool) {
    return {
      ...mod,
      choiceCount: 0,
      sharedChoiceGroup: `expertise_${featureLevel}`,
      sharedChoiceCount: nextCount,
      grantExpertise: true,
      choiceCountUnlocks: unlocks.length ? unlocks : undefined,
    } as unknown as CharacteristicModifier
  }
  return {
    ...mod,
    choiceCount: nextCount,
    grantExpertise: true,
    choiceCountUnlocks: unlocks.length ? unlocks : undefined,
  } as unknown as CharacteristicModifier
}

/** Override *::Expertise preset pick count (and skill-or-tool shape) from feature text. */
export function applyExpertisePresetOverride(feature: Feature): Feature {
  if ((feature.name ?? "").trim() !== "Expertise") return feature

  const description = feature.description ?? ""
  const count = parseExpertisePickCount(description)
  const unlocks = parseExpertiseCountUnlocks(description)
  if (count == null && unlocks.length === 0) return feature

  const skillOrTool = descriptionUsesSkillOrToolPick(description)
  const level = feature.level ?? 1
  const label = feature.linkedModifiers?.[0]?.characteristics?.[0]?.label ?? "Expertise"

  if (skillOrTool) {
    const groupId = `expertise_${level}`
    const replacements = skillOrToolExpertiseChoice(groupId, count ?? 2, label)
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
      mod.type === "skills" ? patchSkillsModifier(mod, count, false, level, unlocks) : mod,
    )
    return characteristics ? { ...inst, characteristics } : inst
  })

  return syncModifierRefs({
    ...feature,
    linkedModifiers: linked,
    importModifierMeta: feature.importModifierMeta,
  })
}
