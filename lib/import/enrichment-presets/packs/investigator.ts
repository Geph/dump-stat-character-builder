import {
  buildInvestigatorGrimoireChoiceGrants,
  INVESTIGATOR_SPELLS_BY_LEVEL,
} from "@/lib/compendium/investigator-spell-list"
import { createModifierInstanceId, syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
import { srdSpellCastingTime } from "@/lib/compendium/srd-spell-casting-time"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, RestRechargeRule, RechargeRule, UsesConfig } from "@/lib/types"

function isRestRechargeRule(rule: RechargeRule): rule is RestRechargeRule {
  return rule.kind !== "real_time" && "rest" in rule
}

const TRINKETS_KEY = "trinkets"
const GRIMOIRE_GRANTS = buildInvestigatorGrimoireChoiceGrants()

function remapFinisherResourceKey(resourceKey: string): string {
  if (/^finisher(?:_dice)?$/i.test(resourceKey)) return "finisher"
  return resourceKey
}

function normalizeFinisherResourceRow<
  T extends {
    resource_key?: string
    name?: string
    uses?: UsesConfig
    description?: string | null
  },
>(row: T): T {
  const key = remapFinisherResourceKey(row.resource_key ?? "")
  if (key === (row.resource_key ?? "")) return row
  const uses: UsesConfig = {
    ...(row.uses ?? { type: "special" }),
    type: "special",
    dieType: row.uses?.dieType ?? "d8",
  }
  return {
    ...row,
    resource_key: key,
    name: row.name && /finisher/i.test(row.name) ? "Finisher" : row.name,
    uses,
    description:
      row.description ??
      "Bonus damage dice dealt by Finisher / Improved Finisher (e.g. 1d8 → 3d8). A damage rider, not a spendable pool.",
  }
}

function grimoireGrantsLookComplete(
  grants: { count?: number; unlocksAtClassLevel?: number; upToLevel?: boolean }[],
): boolean {
  const levelUps = grants.filter((grant) => (grant.unlocksAtClassLevel ?? 0) >= 2)
  return levelUps.length >= 19 && levelUps.every((grant) => grant.count === 2 && grant.upToLevel)
}

/** Ensure Ritualist carries the full grimoire pick schedule + Investigator spell list. */
export function ensureInvestigatorRitualistFeature<
  T extends { name?: string; linkedModifiers?: Feature["linkedModifiers"] },
>(feature: T): T {
  if (!/^ritualist$/i.test(feature.name ?? "")) return feature
  return pinInvestigatorSpellList(feature)
}

function pinInvestigatorSpellList<T extends { linkedModifiers?: Feature["linkedModifiers"] }>(
  feature: T,
): T {
  const existing = feature.linkedModifiers ?? []
  if (!existing.length) return feature
  let changed = false
  const linkedModifiers = existing.map((mod) => {
    const characteristics = (mod.characteristics ?? []).map((char) => {
      if (char.type !== "spells_known") return char
      const grants = char.choiceGrants ?? []
      const needsList = !char.spellListClassOptions?.some((name) => /investigator/i.test(name))
      const needsGrants = !grimoireGrantsLookComplete(grants)
      if (!needsList && !needsGrants) return char
      changed = true
      return {
        ...char,
        choiceGrants: needsGrants ? GRIMOIRE_GRANTS : grants,
        spellListClassOptions: ["Investigator"],
        label: char.label || "Investigator spell list",
      }
    })
    return { ...mod, characteristics }
  })
  if (!changed) return feature
  return { ...feature, linkedModifiers }
}

function grantSubclassTrinkets(abilityNames: string[]) {
  if (!abilityNames.length) return null
  return charInstance(createModifierInstanceId(), characteristicCatalogRefId("grant_custom_ability"), [
    {
      id: modId("investigator_subclass_trinkets"),
      type: "grant_custom_ability",
      abilityNames,
      label: "Gain subclass Trinkets",
    },
  ])
}

/** The trinkets are objects you carry, so unlocking them also puts them in the bag. */
function grantSubclassTrinketItems(equipmentNames: string[]) {
  if (!equipmentNames.length) return null
  return charInstance(createModifierInstanceId(), characteristicCatalogRefId("grant_equipment"), [
    {
      id: modId("investigator_subclass_trinket_items"),
      type: "grant_equipment",
      equipmentNames,
      label: "Gain subclass Trinket items",
    },
  ])
}

function trinketPoolSpendUses(): UsesConfig {
  return {
    type: "class_resource",
    classResourceKey: TRINKETS_KEY,
    classResourceAmount: 1,
  }
}

export type ParsedTrinket = { name: string; description: string }

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function paragraphs(html: string): string[] {
  return html
    .split(/<\/p>/i)
    .map((chunk) => chunk.replace(/<p[^>]*>/gi, "").trim())
    .filter(Boolean)
}

/**
 * Pull the individual trinkets out of a "Trinkets" feature description, which lists each one as
 * a bolded name followed by its rules text. Only prose already present in the import is used —
 * no item text is invented.
 */
export function parseTrinketEntries(html: string | null | undefined): ParsedTrinket[] {
  if (!html) return []
  const entries: ParsedTrinket[] = []
  const seen = new Set<string>()
  for (const paragraph of paragraphs(html)) {
    const match = /^<(strong|b)>\s*([^<]+?)\s*<\/\1>\s*([\s\S]+)$/i.exec(paragraph)
    if (!match) continue
    const name = match[2].replace(/[.:]\s*$/, "").trim()
    const description = stripTags(match[3])
    if (!name || !description) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({ name, description })
  }
  return entries
}

const GRANTED_SPELL_RE =
  /\bcast\s+([A-Z][A-Za-z'’]*(?:\s+(?:of|and|the|from)\s+[A-Za-z'’]+|\s+[A-Z][A-Za-z'’]*)*)/

/**
 * What a trinket button costs. A stated Bonus Action wins; otherwise a trinket that simply lets
 * you cast a spell for free costs whatever that spell costs.
 */
export function trinketCastingTime(description: string): string | null {
  if (/\bbonus action\b/i.test(description)) return "1 bonus action"
  if (/\breaction\b/i.test(description)) return "1 reaction"
  const granted = GRANTED_SPELL_RE.exec(description)
  const castingTime = srdSpellCastingTime(granted?.[1]?.trim())
  if (castingTime) return castingTime
  if (/\bas an action\b/i.test(description)) return "1 action"
  return null
}

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

type TrinketSource = { subclassName: string; level: number; trinket: ParsedTrinket }

/** Collect every subclass trinket an Investigator import describes. */
function collectSubclassTrinkets(content: ImportContent): TrinketSource[] {
  const found: TrinketSource[] = []
  for (const subclass of content.subclasses ?? []) {
    if (!/investigator/i.test(subclass.class_name ?? "")) continue
    const subclassName = (subclass.name ?? "").trim()
    if (!subclassName) continue
    for (const feature of subclass.features ?? []) {
      if (!/^trinkets$/i.test(feature.name ?? "")) continue
      for (const trinket of parseTrinketEntries(feature.description)) {
        found.push({ subclassName, level: feature.level ?? 3, trinket })
      }
    }
  }
  return found
}

type ProposedAbility = NonNullable<
  NonNullable<ImportContent["import_proposals"]>["custom_abilities"]
>[number]

/**
 * One ability row per trinket so each gets its own sheet button. The umbrella Trinkets feature
 * keeps the full write-up on the Features tab.
 */
function trinketAbilityProposal({ subclassName, level, trinket }: TrinketSource): ProposedAbility {
  return {
    proposal_id: `investigator_trinket_${slugPart(subclassName)}_${slugPart(trinket.name)}`,
    name: trinket.name,
    description: trinket.description,
    definition: `${subclassName} Trinket. ${trinket.description}`,
    source_type: "subclass",
    source_name: subclassName,
    level_requirement: level,
    ability_role: "upgrade",
    casting_time: trinketCastingTime(trinket.description),
  } as ProposedAbility
}

type EquipmentRow = NonNullable<ImportContent["equipment"]>[number]

/** Trinkets are physical objects, so they also belong in the inventory as magic items. */
function trinketEquipmentRow({ subclassName, trinket }: TrinketSource): EquipmentRow {
  return {
    name: trinket.name,
    source: `Investigator (${subclassName})`,
    category: "Adventuring Gear",
    subcategory: null,
    description: trinket.description,
    requires_attunement: false,
    magic_item_category: "Wondrous Item",
    rarity: "Uncommon",
    cost: null,
    weight: null,
    properties: null,
    magic_effects: [
      usesInstance(createModifierInstanceId(), trinketPoolSpendUses(), trinket.name),
    ] as unknown as EquipmentRow["magic_effects"],
  } as EquipmentRow
}

/** Umbrella Trinkets features describe the options; the per-trinket rows own the buttons. */
function featuresTabOnly<T extends object>(feature: T): T {
  return {
    ...feature,
    sheetDisplay: { abilitiesActions: false, combatActions: false, featuresTab: true },
  }
}

/**
 * Sanitize Investigator imports:
 * - Remap finisher_dice → finisher (special NdM rider).
 * - Class Trinkets is a spend pool, not a class_upgrades picker (you know all subclass options).
 * - Subclass Trinkets features auto-grant matching upgrade proposals (Gunslinger Risk pattern).
 * - Trinket proposals spend from the shared Trinkets pool.
 */
export function sanitizeInvestigatorImportContent(content: ImportContent): ImportContent {
  const hasInvestigator = (content.classes ?? []).some((cls) => /investigator/i.test(cls.name ?? ""))
  if (!hasInvestigator) return content

  let next: ImportContent = { ...content }

  if (next.class_resources?.length) {
    next = {
      ...next,
      class_resources: next.class_resources.map((row) => normalizeFinisherResourceRow(row)),
    }
  }
  if (next.import_proposals?.class_resources?.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        class_resources: next.import_proposals.class_resources.map((row) =>
          normalizeFinisherResourceRow(row),
        ),
      },
    }
  }

  // Subclass trinkets usually arrive as bolded entries inside one "Trinkets" feature. Split them
  // into their own ability rows so each trinket gets a single sheet button, and into equipment
  // rows so they also appear in the inventory as magic items.
  const trinketSources = collectSubclassTrinkets(next)
  const authoredProposals = next.import_proposals?.custom_abilities ?? []
  const authoredNames = new Set(
    authoredProposals.map((ability) => (ability.name ?? "").trim().toLowerCase()).filter(Boolean),
  )
  const derivedProposals = trinketSources
    .filter((source) => !authoredNames.has(source.trinket.name.toLowerCase()))
    .map(trinketAbilityProposal)

  if (derivedProposals.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        custom_abilities: [...authoredProposals, ...derivedProposals],
      },
    }
  }

  if (trinketSources.length) {
    const existingEquipment = next.equipment ?? []
    const existingNames = new Set(
      existingEquipment.map((row) => (row.name ?? "").trim().toLowerCase()).filter(Boolean),
    )
    const newRows = trinketSources
      .filter((source) => !existingNames.has(source.trinket.name.toLowerCase()))
      .map(trinketEquipmentRow)
    if (newRows.length) next = { ...next, equipment: [...existingEquipment, ...newRows] }
  }

  const proposals = next.import_proposals?.custom_abilities ?? []
  const trinketProposals = proposals.filter(
    (ability) =>
      ability.ability_role === "upgrade" &&
      (ability.source_type === "subclass" || /trinket/i.test(ability.definition ?? "")),
  )

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/investigator/i.test(cls.name ?? "")) return cls
        const officialList = Object.values(INVESTIGATOR_SPELLS_BY_LEVEL).flat()
        const existingList = (cls.spell_list ?? []).map((name) => String(name).trim()).filter(Boolean)
        const spellList = [...new Set([...existingList, ...officialList])]
        return {
          ...cls,
          spell_list: spellList,
          features: (cls.features ?? []).map((feature) => {
            if (/^ritualist$/i.test(feature.name ?? "")) {
              return ensureInvestigatorRitualistFeature(feature)
            }
            if (/^holy trinkets$/i.test(feature.name ?? "")) return featuresTabOnly(feature)
            if (!/^trinkets$/i.test(feature.name ?? "")) return feature
            // Pool tracker lives on class_resources.trinkets; options are auto-granted by subclass.
            const { isChoice: _dropChoice, choices: _dropChoices, ...rest } = feature
            const note =
              "Subclass Trinkets are known automatically when you choose your archetype (not a pick-N upgrades catalog). Activating a trinket expends uses from your Trinkets pool."
            const description = feature.description ?? ""
            const marker = `\n\n${note}`
            const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            return featuresTabOnly({
              ...rest,
              description: description
                .replace(new RegExp(`(?:${escapedMarker}){2,}`, "g"), marker)
                .concat(description.includes(note) ? "" : marker)
                .trim(),
            })
          }),
        }
      }),
    }
  }

  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((subclass) => {
        if (!/investigator/i.test(subclass.class_name ?? "")) return subclass
        const names = trinketProposals
          .filter((ability) => ability.source_name === subclass.name)
          .map((ability) => ability.name)
          .filter((name): name is string => Boolean(name))
        if (!names.length) return subclass
        return {
          ...subclass,
          features: (subclass.features ?? []).map((feature) => {
            if (!/^trinkets$/i.test(feature.name ?? "")) return feature
            const existing =
              ((feature as { linkedModifiers?: Feature["linkedModifiers"] }).linkedModifiers ?? [])
            const hasCharacteristic = (type: string) =>
              existing.some((mod) => mod.characteristics?.some((char) => char.type === type))
            const additions = [
              hasCharacteristic("grant_custom_ability") ? null : grantSubclassTrinkets(names),
              hasCharacteristic("grant_equipment") ? null : grantSubclassTrinketItems(names),
            ].filter((instance): instance is NonNullable<typeof instance> => Boolean(instance))
            if (!additions.length) return featuresTabOnly(feature)
            const synced = syncModifierRefs({
              name: feature.name,
              description: feature.description ?? "",
              linkedModifiers: [...existing, ...additions],
            } as Feature)
            return featuresTabOnly({
              ...feature,
              linkedModifiers: synced.linkedModifiers,
            }) as typeof feature
          }),
        }
      }),
    }
  }

  if (proposals.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        custom_abilities: proposals.map((ability) => {
          const isTrinket =
            ability.ability_role === "upgrade" &&
            (ability.source_type === "subclass" || /trinket/i.test(ability.definition ?? ""))
          if (!isTrinket) return ability
          const record = ability as Record<string, unknown>
          // Without a stated cost the sheet has to guess from prose, which files spell-granting
          // trinkets under Actions even when the spell they grant is a Bonus Action.
          const withCost = ability.casting_time
            ? ability
            : {
                ...ability,
                casting_time: trinketCastingTime(
                  `${ability.description ?? ""} ${ability.definition ?? ""}`,
                ),
              }
          const existingUses = record.uses as UsesConfig | undefined
          if (existingUses?.type === "class_resource" && existingUses.classResourceKey === TRINKETS_KEY) {
            return withCost
          }
          const uses = trinketPoolSpendUses()
          const existingMods =
            (record.linkedModifiers as Feature["linkedModifiers"]) ??
            (record.linked_modifiers as Feature["linkedModifiers"]) ??
            []
          const hasSpend = existingMods.some((mod) =>
            mod.characteristics?.some(
              (char) =>
                char.type === "uses" &&
                char.uses?.type === "class_resource" &&
                char.uses.classResourceKey === TRINKETS_KEY,
            ),
          )
          const linkedModifiers = hasSpend
            ? existingMods
            : [
                ...existingMods,
                usesInstance(createModifierInstanceId(), uses, ability.name ?? "Trinket"),
              ]
          return syncModifierRefs({
            ...withCost,
            uses,
            linkedModifiers,
          }) as typeof ability
        }),
      },
    }
  }

  const patchPoolRecharges = <T extends { resource_key?: string; uses?: UsesConfig }>(row: T): T => {
    const key = row.resource_key ?? ""
    if (key !== "rushed_incantation" && key !== "trinkets") return row
    const uses = row.uses
    if (!uses) return row
    const recharges = [...(uses.recharges ?? [])]
    const nextRecharges = recharges.map((rule) =>
      isRestRechargeRule(rule) && rule.rest === "short_rest" && rule.amount == null
        ? { ...rule, amount: 1 }
        : rule,
    )
    if (!nextRecharges.some((rule) => isRestRechargeRule(rule) && rule.rest === "short_rest")) {
      nextRecharges.unshift({ rest: "short_rest", amount: 1 })
    }
    if (!nextRecharges.some((rule) => isRestRechargeRule(rule) && rule.rest === "long_rest")) {
      nextRecharges.push({ rest: "long_rest" })
    }
    return { ...row, uses: { ...uses, recharges: nextRecharges } }
  }

  if (next.class_resources?.length) {
    next = { ...next, class_resources: next.class_resources.map(patchPoolRecharges) }
  }
  if (next.import_proposals?.class_resources?.length) {
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        class_resources: next.import_proposals.class_resources.map(patchPoolRecharges),
      },
    }
  }

  return next
}
