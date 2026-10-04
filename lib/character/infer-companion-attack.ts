import type {
  CompanionAttack,
  CompanionAttackKind,
  CompanionDamageRoll,
  CompanionScaledPart,
  CompanionScaledValue,
  CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

const ABILITY_BY_WORD: Record<string, AbilityScoreKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
}

const ABILITY_WORD = "(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)"

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

function abilityFromWord(word: string | undefined): AbilityScoreKey | null {
  return word ? (ABILITY_BY_WORD[word.toLowerCase()] ?? null) : null
}

/** "your Charisma modifier plus your Proficiency Bonus" / "your spell attack modifier" → scale parts. */
function scaledFromOwnerPhrase(phrase: string, fixed = 0): CompanionScaledValue {
  const label = phrase.trim()
  const parts: CompanionScaledPart[] = [{ type: "fixed", value: fixed }]
  if (/spell attack modifier/i.test(label)) {
    parts.push({ type: "scale", ref: { kind: "spell_attack_modifier" } })
    return { parts, label }
  }
  if (/spell save DC/i.test(label)) {
    return { parts: [{ type: "scale", ref: { kind: "spell_save_dc" } }], label }
  }
  const ability = abilityFromWord(label.match(new RegExp(`your ${ABILITY_WORD}`, "i"))?.[1])
  if (ability) parts.push({ type: "scale", ref: { kind: "ability_modifier", ability } })
  if (/proficiency bonus|\bPB\b/i.test(label)) parts.push({ type: "scale", ref: { kind: "proficiency_bonus" } })
  return parts.length > 1 ? { parts, label } : { parts: [], label }
}

const DAMAGE_RE = new RegExp(
  String.raw`(\d+d\d+)(?:\s*([+-])\s*(\d+))?\)?` +
    String.raw`(\s*(?:\+|plus)\s*your\s+${ABILITY_WORD}(?:\s+or\s+${ABILITY_WORD})?\s+modifier)?` +
    String.raw`(?:\s*\+\s*the spell's level)?` +
    String.raw`(?:\s+([A-Z][a-z]+|[a-z]+))?\s+damage`,
  "gi",
)

const DAMAGE_TYPE_WORDS = new Set([
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
])

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/** Every "NdM [+ K] [plus your X modifier] Type damage" roll in a clause. */
export function parseDamageRolls(clause: string): CompanionDamageRoll[] {
  const rolls: CompanionDamageRoll[] = []
  for (const match of clause.matchAll(DAMAGE_RE)) {
    const [, dice, sign, flat, ownerPhrase, ability] = match
    const typeWord = match[7]
    const fixed = flat ? (sign === "-" ? -1 : 1) * parseInt(flat, 10) : 0
    const parts: CompanionScaledPart[] = []
    if (fixed) parts.push({ type: "fixed", value: fixed })
    const abilityKey = ownerPhrase ? abilityFromWord(ability) : null
    if (abilityKey) parts.push({ type: "scale", ref: { kind: "ability_modifier", ability: abilityKey } })
    rolls.push({
      dice: dice.toLowerCase(),
      bonus: parts.length ? { parts } : null,
      type: typeWord && DAMAGE_TYPE_WORDS.has(typeWord.toLowerCase()) ? capitalize(typeWord) : null,
    })
  }
  if (rolls.length) return rolls
  // "1d8 plus the spell's level of Radiant (Celestial), Psychic (Fey), or Necrotic (Fiend) damage"
  const loose = clause.match(/(\d+d\d+)(?:\s*([+-])\s*(\d+))?([^.]*?)\bdamage\b/i)
  if (!loose) return rolls
  const types = [...new Set((loose[4].match(/[A-Za-z]+/g) ?? []).map((w) => w.toLowerCase()))].filter((w) =>
    DAMAGE_TYPE_WORDS.has(w),
  )
  const fixed = loose[3] ? (loose[2] === "-" ? -1 : 1) * parseInt(loose[3], 10) : 0
  return [
    {
      dice: loose[1].toLowerCase(),
      bonus: fixed ? { parts: [{ type: "fixed", value: fixed }] } : null,
      type: types.length === 1 ? capitalize(types[0]!) : null,
    },
  ]
}

function attackKind(word: string): CompanionAttackKind {
  const lower = word.toLowerCase()
  if (lower.startsWith("melee or ranged")) return "melee_or_ranged"
  return lower.startsWith("ranged") ? "ranged" : "melee"
}

function inferAttackRoll(text: string): CompanionAttack | null {
  const modern = text.match(
    /(Melee or Ranged|Melee|Ranged)\s+Attack Roll:\s*(?:([+-]\d+)|Bonus equals ([^,]+))/i,
  )
  const legacy = modern
    ? null
    : text.match(/(Melee or Ranged|Melee|Ranged)\s+(?:Weapon|Spell)\s+Attack:\s*([+-]\d+)\s+to hit/i)
  const match = modern ?? legacy
  if (!match) return null
  const kind = attackKind(match[1])
  const toHit = match[2]
    ? { parts: [{ type: "fixed" as const, value: parseInt(match[2], 10) }] }
    : scaledFromOwnerPhrase(match[3] ?? "")
  const reach = text.match(/\breach\s+(\d+\s*(?:ft\.?|feet))/i)?.[1] ?? null
  const range = text.match(/\brange\s+(\d+(?:\/\d+)?\s*(?:ft\.?|feet)?)/i)?.[1]?.trim() ?? null
  const hitIndex = text.search(/\bHit:/i)
  const damage = parseDamageRolls(hitIndex >= 0 ? text.slice(hitIndex) : text)
  return { kind, toHit, reach, range, damage }
}

function inferSavingThrow(text: string): CompanionAttack | null {
  const modern = text.match(
    new RegExp(`${ABILITY_WORD} Saving Throw:\\s*DC\\s*(?:(\\d+)|equals ([^,]+?))\\s*,\\s*([^.]*)`, "i"),
  )
  const legacy = modern
    ? null
    : text.match(new RegExp(`DC\\s*(\\d+)\\s+${ABILITY_WORD} saving throw`, "i"))
  if (!modern && !legacy) return null

  const saveAbility = abilityFromWord(modern ? modern[1] : legacy![2])
  const dcNumber = modern ? modern[2] : legacy![1]
  const saveDc: CompanionScaledValue = dcNumber
    ? { parts: [{ type: "fixed", value: parseInt(dcNumber, 10) }] }
    : scaledFromOwnerPhrase(modern![3] ?? "")
  const area = modern?.[4]?.trim() || null

  const failureIndex = text.search(/\bFailure:/i)
  const successIndex = text.search(/\bSuccess:/i)
  const damageClause =
    failureIndex >= 0 ? text.slice(failureIndex, successIndex > failureIndex ? successIndex : undefined) : text
  return {
    kind: "save",
    saveAbility,
    saveDc,
    area,
    halfOnSuccess: /Success:\s*Half damage|half as much damage/i.test(text),
    damage: parseDamageRolls(damageClause),
  }
}

/**
 * Structured attack from stat block action prose. Covers 2024 ("Melee Attack Roll: +5 … Hit:",
 * "Constitution Saving Throw: DC 13 … Failure:") and 2014 ("+5 to hit", "DC 13 Constitution
 * saving throw … half as much damage") wording. Returns null for actions with neither.
 */
export function inferCompanionAttackFromText(description: string | null | undefined): CompanionAttack | null {
  const text = stripHtml(description ?? "")
  if (!text) return null
  return inferAttackRoll(text) ?? inferSavingThrow(text)
}

/** Infer attacks on every action list of a stat block (Actions, Bonus Actions, Reactions, Legendary). */
export function withInferredStatBlockAttacks<T extends CompanionStatBlockTemplate | null>(template: T): T {
  if (!template) return template
  return {
    ...template,
    actions: withInferredCompanionAttacks(template.actions),
    bonusActions: template.bonusActions ? withInferredCompanionAttacks(template.bonusActions) : template.bonusActions,
    reactions: template.reactions ? withInferredCompanionAttacks(template.reactions) : template.reactions,
    legendaryActions: template.legendaryActions
      ? withInferredCompanionAttacks(template.legendaryActions)
      : template.legendaryActions,
  }
}

/** Fill `attack` on action blocks that lack one; authored attacks are left alone. */
export function withInferredCompanionAttacks<T extends { description: string; attack?: CompanionAttack | null }>(
  blocks: T[] | null | undefined,
): T[] {
  return (blocks ?? []).map((block) => {
    if (block.attack) return block
    const attack = inferCompanionAttackFromText(block.description)
    return attack ? { ...block, attack } : block
  })
}
