/**
 * Reshape Kibbles-style Psion custom ability imports into nested packages:
 * - One visible discipline row per discipline (modifier_catalog entries + choices)
 * - Sibling psionic_power rows kept for sheet casting (hidden from compendium list)
 * - class_talent rows folded under a "General Psionic Talents" package
 */
import { createCatalogEntryId, type ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { PsionicAugmentsConfig } from "@/lib/compendium/parse-psionic-augments"
import { activationFromCastingTime } from "@/lib/import/parse-special-attack-from-power"
import type { FeatureActivation } from "@/lib/types"

export const GENERAL_PSIONIC_TALENTS_NAME = "General Psionic Talents"

const POWER_TO_DISCIPLINE: Record<string, string> = {
  "enhancing surge": "Enhancement Discipline",
  "astral construct": "Projection Discipline",
  "telekinetic force": "Telekinesis Discipline",
  "telekinetic weapons": "Telekinesis Discipline",
  "telepathic intrusion": "Telepathy Discipline",
  "phase rift": "Transposition Discipline",
  "elemental blast": "Psychokinesis Discipline",
  seeing: "Precognition Discipline",
  denial: "Nullification Discipline",
  "mind leech": "Consumption Discipline",
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function abilityRole(row: Record<string, unknown>): string {
  return typeof row.ability_role === "string" ? row.ability_role.trim().toLowerCase() : ""
}

type CustomAbilityLike = {
  name?: string | null
  description?: string | null
  parent_ability_name?: string | null
  definition?: string | null
}

function resolveDisciplineNameForPower(row: Record<string, unknown>): string | null {
  const name = normalizeName(String(row.name ?? ""))
  if (POWER_TO_DISCIPLINE[name]) return POWER_TO_DISCIPLINE[name]

  const parent =
    typeof row.parent_ability_name === "string" ? row.parent_ability_name.trim() : ""
  if (parent && /\bdiscipline\b/i.test(parent)) return parent

  const definition = String(row.definition ?? "")
  const fromDef = definition.match(/from\s+([A-Za-z][A-Za-z' ]+Discipline)/i)
  if (fromDef?.[1]) return fromDef[1].trim()

  const description = stripHtml(String(row.description ?? ""))
  const fromDesc = description.match(/\b([A-Za-z][A-Za-z' ]+Discipline)\b/)
  if (fromDesc?.[1] && /discipline/i.test(fromDesc[1])) return fromDesc[1].trim()

  return null
}

/** Resolve which discipline package owns a psionic power row (import / sheet gating). */
export function resolvePsionicPowerDisciplineName(ability: CustomAbilityLike): string | null {
  return resolveDisciplineNameForPower({
    name: ability.name,
    description: ability.description ?? "",
    parent_ability_name: ability.parent_ability_name ?? null,
    definition: ability.definition ?? "",
  })
}

/** Pull the first bold/named passive feature before Alternate Effects. */
export function extractDisciplinePassive(description: string): { name: string; body: string } | null {
  const html = description.trim()
  if (!html) return null
  const plain = stripHtml(html)
  const beforeAe = plain.split(/\bAlternate Effects\b/i)[0]?.trim() ?? plain
  const strong = html.match(/<strong>([^<]{2,80})<\/strong>\s*\.?\s*([^<]{10,800})/i)
  if (strong) {
    const name = strong[1].replace(/\.$/, "").trim()
    if (!/alternate effects|specializations?/i.test(name)) {
      return { name, body: stripHtml(strong[2]).trim() }
    }
  }
  const named = beforeAe.match(
    /\b([A-Z][A-Za-z' ]{2,40})\.\s+((?:You|Whenever|After|While|As)[^.]{20,400}\.)/,
  )
  if (named && !/discipline|psionic power/i.test(named[1])) {
    return { name: named[1].trim(), body: named[2].trim() }
  }
  return null
}

function castingSummary(row: Record<string, unknown>): string {
  const parts = [
    typeof row.casting_time === "string" ? row.casting_time : null,
    typeof row.range === "string" ? row.range : null,
    typeof row.duration === "string" ? row.duration : null,
  ].filter(Boolean)
  const augments = row.psionic_augments as PsionicAugmentsConfig | null | undefined
  if (augments?.augments?.length) {
    parts.push(`${augments.augments.length} psi augment${augments.augments.length === 1 ? "" : "s"}`)
  }
  return parts.join(" · ")
}

function entry(
  name: string,
  group: string,
  description: string,
  summary?: string,
  characteristics: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] = [],
  activation: FeatureActivation | null = null,
): ModifierCatalogEntry {
  return {
    id: createCatalogEntryId(),
    name,
    group,
    summary: summary ?? "",
    description: description.startsWith("<") ? description : `<p>${description}</p>`,
    characteristics,
    activation,
  }
}

function specialAttackCharsFromPower(
  power: Record<string, unknown>,
): import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] {
  const linked =
    (power.linkedModifiers as { characteristics?: { type?: string }[] }[] | undefined) ??
    (power.linked_modifiers as { characteristics?: { type?: string }[] }[] | undefined) ??
    []
  const chars: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] = []
  for (const instance of linked) {
    for (const char of instance.characteristics ?? []) {
      if (char.type === "special_attack") {
        chars.push(char as import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier)
      }
    }
  }
  return chars
}

function buildDisciplineCatalog(
  discipline: Record<string, unknown>,
  powers: Record<string, unknown>[],
): ModifierCatalogEntry[] {
  const catalog: ModifierCatalogEntry[] = []
  const description = String(discipline.description ?? "")
  const passive = extractDisciplinePassive(description)
  if (passive) {
    catalog.push(entry(passive.name, "Passive Features", passive.body))
  }

  for (const power of powers) {
    const castingTime =
      (typeof power.casting_time === "string" && power.casting_time.trim()
        ? power.casting_time.trim()
        : null) ??
      (typeof power.execution === "string" && power.execution.trim()
        ? power.execution.trim()
        : null)
    const specialChars = specialAttackCharsFromPower(power)
    catalog.push(
      entry(
        String(power.name ?? "Psionic Power"),
        "Psionic Powers",
        String(power.description ?? ""),
        castingSummary(power),
        specialChars,
        specialChars.length || castingTime
          ? activationFromCastingTime(castingTime)
          : null,
      ),
    )
  }

  if (/\bAlternate Effects\b/i.test(description)) {
    catalog.push(
      entry(
        "Alternate Effects",
        "Alternate Effects",
        "Spells granted by this discipline (cast via Psionics / psi points). Linked as Common Modifiers on this ability. A Specialization may replace this list.",
        "Spell links on this ability",
      ),
    )
  }

  const specializationChoices = (discipline.specialization_choices ??
    (/specialization/i.test(
      String((discipline.choices as { category?: string } | undefined)?.category ?? ""),
    )
      ? discipline.choices
      : null)) as
    | { options?: { name: string; description?: string }[] }
    | null
    | undefined
  for (const option of specializationChoices?.options ?? []) {
    catalog.push(
      entry(
        option.name,
        "Specializations",
        option.description ?? "",
        "Optional specialization (may replace Alternate Effects)",
      ),
    )
  }

  const choices = discipline.choices as
    | { category?: string; options?: { name: string; description?: string; prerequisite?: string | null }[] }
    | undefined
  if (!/specialization/i.test(choices?.category ?? "")) {
    for (const option of choices?.options ?? []) {
      const prereq = option.prerequisite?.trim()
      catalog.push(
        entry(
          option.name,
          "Discipline Talents",
          option.description ?? "",
          prereq ? `Prerequisite: ${prereq}` : "Discipline talent",
        ),
      )
    }
  }

  return catalog
}

/**
 * Nest psionic library rows for compendium display.
 * Mutates/returns a new array — does not drop power/talent leaf rows (sheet casting needs them).
 */
export function nestPsionicAbilityLibrary(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  const disciplines = rows.filter((row) => abilityRole(row) === "discipline")
  if (!disciplines.length) return rows

  const powers = rows.filter((row) => abilityRole(row) === "psionic_power")
  const classTalents = rows.filter((row) => abilityRole(row) === "class_talent")
  const other = rows.filter((row) => {
    const role = abilityRole(row)
    return role !== "discipline" && role !== "psionic_power" && role !== "class_talent"
  })

  const powersByDiscipline = new Map<string, Record<string, unknown>[]>()
  for (const power of powers) {
    const disciplineName = resolveDisciplineNameForPower(power)
    if (!disciplineName) continue
    const key = normalizeName(disciplineName)
    const list = powersByDiscipline.get(key) ?? []
    list.push(power)
    powersByDiscipline.set(key, list)
  }

  const nestedDisciplines = disciplines.map((discipline) => {
    const name = String(discipline.name ?? "")
    const childPowers = powersByDiscipline.get(normalizeName(name)) ?? []
    const existingCatalog = Array.isArray(discipline.modifier_catalog)
      ? (discipline.modifier_catalog as ModifierCatalogEntry[])
      : []
    const built = buildDisciplineCatalog(discipline, childPowers)
    return {
      ...discipline,
      ability_role: "discipline",
      show_in_builder: true,
      modifier_catalog: existingCatalog.length ? existingCatalog : built,
      isChoice: Boolean(
        (discipline.choices as { options?: unknown[] } | undefined)?.options?.length,
      ),
    }
  })

  const nestedPowers = powers.map((power) => {
    const parentName = resolveDisciplineNameForPower(power)
    return {
      ...power,
      ability_role: "psionic_power",
      show_in_builder: true,
      // Soft parent link for editors/list grouping (class attach still drives sheet filter).
      ...(parentName ? { parent_ability_name: parentName } : {}),
    }
  })

  let generalPackage: Record<string, unknown> | null = null
  if (classTalents.length) {
    const catalog = classTalents.map((talent) =>
      entry(
        String(talent.name ?? "Talent"),
        "General Talents",
        String(talent.description ?? ""),
        typeof talent.prerequisite === "string" && talent.prerequisite.trim()
          ? `Prerequisite: ${talent.prerequisite.trim()}`
          : "Class talent",
      ),
    )
    generalPackage = {
      name: GENERAL_PSIONIC_TALENTS_NAME,
      description:
        "<p>General psionic talents available to any Psion, independent of known disciplines. Class-level talents such as Astral Arms, Aura Sight, and Schism live here.</p>",
      ability_role: "talent_pool",
      source_type: classTalents[0]?.source_type ?? "class",
      source_name: classTalents[0]?.source_name ?? "Psion",
      show_in_builder: true,
      modifier_catalog: catalog,
      choices: {
        category: "General Psionic Talents",
        count: 1,
        options: classTalents.map((talent) => ({
          name: String(talent.name ?? ""),
          description: String(talent.description ?? ""),
          prerequisite:
            typeof talent.prerequisite === "string" ? talent.prerequisite : null,
        })),
      },
      isChoice: true,
      is_choice: true,
    }
  }

  const nestedTalents = classTalents.map((talent) => ({
    ...talent,
    ability_role: "class_talent",
    show_in_builder: true,
    parent_ability_name: GENERAL_PSIONIC_TALENTS_NAME,
  }))

  return [
    ...nestedDisciplines,
    ...(generalPackage ? [generalPackage] : []),
    ...nestedPowers,
    ...nestedTalents,
    ...other,
  ]
}

/** Compendium list: top-level packages only (disciplines, talent pools, catalogs, standalone). */
export function isTopLevelCompendiumAbility(row: {
  ability_role?: string | null
  parent_ability_name?: string | null
  is_system?: boolean | null
  name?: string | null
}): boolean {
  if (row.is_system) return true
  const role = (row.ability_role ?? "").trim().toLowerCase()
  if (role === "psionic_power" || role === "class_talent") return false
  if (row.parent_ability_name) return false
  if (role === "discipline" || role === "talent_pool") return true
  // Knacks / bombs / upgrades / untagged stay visible
  return role !== "psionic_power"
}
