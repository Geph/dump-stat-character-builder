import { createModifierInstanceId, syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import type { ImportContent } from "@/lib/import/content-schema"
import type { EnrichmentPreset } from "@/lib/import/enrichment-presets/types"
import type { Feature } from "@/lib/types"

/** Maneuvers Known tiers from the Vagabond Features table (cumulative). */
export const VAGABOND_MANEUVERS_KNOWN_BY_LEVEL = [
  { level: 1, count: 3 },
  { level: 2, count: 4 },
  { level: 3, count: 5 },
  { level: 6, count: 6 },
  { level: 9, count: 7 },
  { level: 12, count: 8 },
  { level: 15, count: 9 },
  { level: 18, count: 10 },
] as const

function maneuverBaseName(featureName: string): string {
  return featureName.replace(/\s*\[Maneuver\]\s*$/i, "").trim()
}

function grantNamedAbilities(idKey: string, abilityNames: string[], label: string) {
  if (!abilityNames.length) return null
  return charInstance(createModifierInstanceId(), characteristicCatalogRefId("grant_custom_ability"), [
    {
      id: modId(idKey),
      type: "grant_custom_ability",
      abilityNames,
      label,
    },
  ])
}

/**
 * Sanitize Vagabond imports:
 * - Battle Tactics is a Maneuvers Known picker (class_knacks), not battle_dice / maneuvers_known resourceKey.
 * - Subclass [Maneuver] options are auto-known — keep as custom_abilities for grant wiring, but not ability_role knack
 *   (otherwise they pollute the Maneuvers Known picker when the subclass is selected).
 * - Mage Brand Spellbranding: CHA cantrips + prepared list; no normal caster_progression slots.
 */
export function sanitizeVagabondImportContent(content: ImportContent): ImportContent {
  const hasVagabond = (content.classes ?? []).some((cls) => /vagabond/i.test(cls.name ?? ""))
  if (!hasVagabond) return content

  let next: ImportContent = { ...content }

  if (next.classes?.length) {
    next = {
      ...next,
      classes: next.classes.map((cls) => {
        if (!/vagabond/i.test(cls.name ?? "")) return cls
        const features = (cls.features ?? []).map((feat) => {
          if (!/^battle tactics$/i.test(feat.name ?? "")) return feat
          const prior = feat.choices as
            | (NonNullable<typeof feat.choices> & {
                choiceCountByLevel?: { level: number; count: number }[]
              })
            | undefined
          const restChoices = prior ? { ...prior } : {}
          delete (restChoices as { resourceKey?: string }).resourceKey
          return {
            ...feat,
            isChoice: true,
            choices: {
              category: "Maneuver",
              count: 3,
              options: [] as { name: string; description: string }[],
              swappableOnRest: false,
              ...restChoices,
              optionsSource: "class_knacks" as const,
              choiceCountByLevel: prior?.choiceCountByLevel?.length
                ? prior.choiceCountByLevel
                : [...VAGABOND_MANEUVERS_KNOWN_BY_LEVEL],
            },
          }
        }) as NonNullable<ImportContent["classes"]>[number]["features"]
        return { ...cls, features }
      }),
    }
  }

  const proposals = next.import_proposals?.custom_abilities ?? []
  if (proposals.length) {
    const normalized = proposals.map((ability) => {
      if (ability.source_type !== "subclass") return ability
      // Auto-granted subclass maneuvers must not appear in the Maneuvers Known pick list.
      if (ability.ability_role !== "knack") return ability
      const { ability_role: _role, ...rest } = ability
      return rest
    })
    next = {
      ...next,
      import_proposals: {
        ...next.import_proposals,
        custom_abilities: normalized as NonNullable<
          NonNullable<ImportContent["import_proposals"]>["custom_abilities"]
        >,
      },
    }
  }

  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((sc) => {
        if (!/vagabond/i.test(sc.class_name ?? "")) return sc
        const features = (sc.features ?? []).map((feat) => {
          if (!/\[maneuver\]/i.test(feat.name ?? "")) return feat
          const abilityName = maneuverBaseName(feat.name ?? "")
          const grant = grantNamedAbilities(
            `vagabond_${abilityName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
            [abilityName],
            `Gain ${abilityName}`,
          )
          if (!grant) return feat
          const existing = Array.isArray((feat as Feature).linkedModifiers)
            ? ((feat as Feature).linkedModifiers ?? [])
            : []
          const alreadyGranted = existing.some((mod) =>
            mod.characteristics?.some((c) => c.type === "grant_custom_ability"),
          )
          if (alreadyGranted) return feat
          const synced = syncModifierRefs({
            name: feat.name,
            description: feat.description ?? "",
            linkedModifiers: [...existing, grant],
          } as Feature)
          return {
            ...feat,
            linkedModifiers: synced.linkedModifiers,
          } as typeof feat
        })
        return { ...sc, features }
      }),
    }
  }

  // Mage Brand: ensure cantrip unlock at 10 is present on Spellbranding mechanics.
  if (next.subclasses?.length) {
    next = {
      ...next,
      subclasses: next.subclasses.map((sc) => {
        if (!/^mage brand$/i.test(sc.name ?? "")) return sc
        const features = (sc.features ?? []).map((feat) => {
          if (!/^spellbranding$/i.test(feat.name ?? "")) return feat
          const mechanics = Array.isArray(feat.mechanics) ? [...feat.mechanics] : []
          const hasL10Cantrip = mechanics.some((m) => {
            if (!m || typeof m !== "object" || Array.isArray(m)) return false
            const row = m as Record<string, unknown>
            if (row.kind !== "spells_known") return false
            const grants = row.spellChoiceGrants
            return (
              Array.isArray(grants) &&
              grants.some(
                (g) =>
                  g &&
                  typeof g === "object" &&
                  (g as { level?: number; unlocksAtClassLevel?: number }).level === 0 &&
                  (g as { unlocksAtClassLevel?: number }).unlocksAtClassLevel === 10,
              )
            )
          })
          if (!hasL10Cantrip) {
            mechanics.push({
              kind: "spells_known",
              spellChoiceGrants: [{ level: 0, count: 1, unlocksAtClassLevel: 10 }],
              spellChoiceLabel: "Sorcerer cantrips",
              sourcePhrase: "When you reach Vagabond level 10, you learn another Sorcerer cantrip of your choice.",
              confidence: "high",
            })
          }
          return { ...feat, mechanics }
        })
        return { ...sc, features }
      }),
    }
  }

  return next
}

export const VAGABOND_PRESETS: EnrichmentPreset[] = [
  {
    id: "vagabond.class.battle_tactics",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^battle tactics$/i },
    operations: [
      {
        op: "setChoices",
        isChoice: true,
        choices: {
          category: "Maneuver",
          count: 3,
          options: [],
          optionsSource: "class_knacks",
          choiceCountByLevel: [...VAGABOND_MANEUVERS_KNOWN_BY_LEVEL],
          swappableOnRest: false,
        },
      },
      {
        op: "appendDescription",
        text: "Maneuvers Known scale from the Maneuvers column (choiceCountByLevel). Pool is Battle Dice (class_resources.battle_dice with rechargeOnInitiative) — do not set choices.resourceKey to battle_dice or invent maneuvers_known. Subclass [Maneuver] features are auto-granted and do not count against Maneuvers Known.",
      },
    ],
  },
  {
    id: "vagabond.class.desperate_attack",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^desperate attack$/i },
    operations: [
      {
        op: "appendDescription",
        text: "While you are Bloodied, you have Advantage on attack rolls. Dump Stat gates this with the built-in Bloodied sheet state (below_half_hp).",
      },
    ],
  },
  {
    id: "vagabond.class.desperate_fury",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^desperate fury$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Bloodied extra weapon/Unarmed damage uses below_half_hp. Keep the 1d8 rider phrasing so damage_roll_modifiers detect.",
      },
    ],
  },
  {
    id: "vagabond.class.desperate_survival",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^desperate survival$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Critical Hits against you miss while Bloodied (unless Incapacitated) — tracked narratively / Features tab; no dedicated crit-miss primitive.",
      },
    ],
  },
  {
    id: "vagabond.class.wayworn",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^wayworn$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Always considered Bloodied for Vagabond features — treat below_half_hp riders as always on at this level (or leave the Bloodied toggle on). No separate sheet primitive.",
      },
    ],
  },
  {
    id: "vagabond.class.breather",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^breather$/i },
    operations: [
      { op: "setActivation", activation: { action: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Spend one Hit Point Die from the sheet Hit Dice tracker when you use this (play-time).",
      },
    ],
  },
  {
    id: "vagabond.class.last_stand",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^last stand$/i },
    operations: [
      { op: "setActivation", activation: { onDropToZeroHp: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "long_rest" }],
        },
      },
    ],
  },
  {
    id: "vagabond.class.martial_recovery",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^martial recovery$/i },
    operations: [
      { op: "setActivation", activation: { bonusAction: true } },
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "setLimitedUses",
        uses: {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
      },
      {
        op: "appendDescription",
        text: "Regains all expended Battle Dice when used — resolve against the battle_dice pool on the sheet.",
      },
    ],
  },
  {
    id: "vagabond.class.deft_maneuver",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^deft maneuver$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Extra Bonus Action each turn that can only be used to perform a maneuver — track narratively when selecting maneuvers.",
      },
    ],
  },
  {
    id: "vagabond.class.overexertion",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^overexertion$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "When you have 0 Battle Dice, regain one die to spend immediately and take Necrotic damage equal to one roll of your Battle Die — play-time; keep \"Battle Die\" phrasing.",
      },
    ],
  },
  {
    id: "vagabond.class.tenacity",
    pack: "vagabond",
    target: "class_feature",
    match: { className: /vagabond/i, name: /^tenacity$/i },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Expend one Battle Die to reroll a failed save and add the die — keep expend phrasing so battle_dice links.",
      },
    ],
  },
  {
    id: "vagabond.subclass.maneuver_feature",
    pack: "vagabond",
    target: "subclass_feature",
    match: {
      subclassClassName: /vagabond/i,
      name: /\[maneuver\]/i,
    },
    operations: [
      { op: "setSheetDisplay", sheetDisplay: { combatActions: true, featuresTab: true } },
      {
        op: "appendDescription",
        text: "Subclass maneuver is auto-known and does not count against Maneuvers Known. Keep \"expend one Battle Die\" phrasing. Not a knack-pool pick.",
      },
    ],
  },
  {
    id: "vagabond.subclass.spellbranding",
    pack: "vagabond",
    target: "subclass_feature",
    match: { subclassClassName: /vagabond/i, name: /^spellbranding$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Spellbrand Spellcasting creates temporary slots by expending Battle Dice (up to mage_brand_max_slot_level) — not normal caster_progression slots. Prepared Spells scale from the Mage Brand table (narrative / Features tab if pick counts are incomplete). Use Sorcerer list cantrips + level 1+ picks; Charisma casting. Do not dump the shared magehandpress-spells catalog into the class JSON.",
      },
    ],
  },
  {
    id: "vagabond.subclass.desperate_ward",
    pack: "vagabond",
    target: "subclass_feature",
    match: { subclassClassName: /vagabond/i, name: /^desperate ward$/i },
    operations: [
      {
        op: "appendDescription",
        text: "Advantage on saves vs spells/magical effects while Bloodied — gate with below_half_hp when detectable.",
      },
    ],
  },
]
