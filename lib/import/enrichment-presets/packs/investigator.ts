import {
  buildInvestigatorGrimoireChoiceGrants,
  INVESTIGATOR_SPELLS_BY_LEVEL,
} from "@/lib/compendium/investigator-spell-list"
import { createModifierInstanceId, syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
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

function trinketPoolSpendUses(): UsesConfig {
  return {
    type: "class_resource",
    classResourceKey: TRINKETS_KEY,
    classResourceAmount: 1,
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
            if (!/^trinkets$/i.test(feature.name ?? "")) return feature
            // Pool tracker lives on class_resources.trinkets; options are auto-granted by subclass.
            const { isChoice: _dropChoice, choices: _dropChoices, ...rest } = feature
            const note =
              "Subclass Trinkets are known automatically when you choose your archetype (not a pick-N upgrades catalog). Activating a trinket expends uses from your Trinkets pool."
            const description = feature.description ?? ""
            const marker = `\n\n${note}`
            const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            return {
              ...rest,
              description: description
                .replace(new RegExp(`(?:${escapedMarker}){2,}`, "g"), marker)
                .concat(description.includes(note) ? "" : marker)
                .trim(),
            }
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
            const grant = grantSubclassTrinkets(names)
            if (!grant) return feature
            const existing =
              ((feature as { linkedModifiers?: Feature["linkedModifiers"] }).linkedModifiers ?? [])
            const alreadyGranted = existing.some((mod) =>
              mod.characteristics?.some((char) => char.type === "grant_custom_ability"),
            )
            if (alreadyGranted) return feature
            const synced = syncModifierRefs({
              name: feature.name,
              description: feature.description ?? "",
              linkedModifiers: [...existing, grant],
            } as Feature)
            return {
              ...feature,
              linkedModifiers: synced.linkedModifiers,
            } as typeof feature
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
          const existingUses = record.uses as UsesConfig | undefined
          if (existingUses?.type === "class_resource" && existingUses.classResourceKey === TRINKETS_KEY) {
            return ability
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
            ...ability,
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
