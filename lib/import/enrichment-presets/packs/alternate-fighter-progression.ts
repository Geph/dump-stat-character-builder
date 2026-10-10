import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature, UsesConfig } from "@/lib/types"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { ensureSubclassUnlockFeature } from "@/lib/compendium/subclass-unlock-modifier"

const USE_TIERS: Record<string, [number, number][]> = {
  "second wind": [[1, 1], [14, 2]],
  "action surge": [[6, 1], [20, 2]],
  indomitable: [[9, 1], [13, 2], [17, 3]],
}
const FIGHTER_LIBRARY = { role: "knack", eligibleClassNames: ["Fighter", "Alternate Fighter"] }

function progressionFeature(row: Feature & { mechanics?: NonNullable<ImportContent["classes"]>[number]["features"][number]["mechanics"] }) {
  const key = row.name.toLowerCase()
  const id = `alt_fighter_${key.replace(/\s+/g, "_")}`
  if (key === "eye for talent") {
    return syncModifierRefs({
      ...row,
      activation: { ...row.activation, bonusAction: true },
      sheetDisplay: { ...row.sheetDisplay, combatActions: true, featuresTab: true },
      linkedModifiers: [
        ...(row.linkedModifiers ?? []).filter((modifier) => modifier.instanceId !== `${id}_targets`),
        {
          instanceId: `${id}_targets`, catalogRefId: "cat_char_player_note",
          activation: { bonusAction: true },
          characteristics: [{
            id: `${id}_targets`, type: "player_note" as const, target: "feature" as const,
            prompt: "Observed creatures and retry restrictions",
            placeholder: "Target, learned characteristic, failed Search; retry after a weapon hit or Long Rest",
          }],
        },
      ],
    })
  }
  if (USE_TIERS[key]) {
    const uses: UsesConfig = {
      type: "at_level",
      atLevelTable: USE_TIERS[key].map(([level, count]) => ({ level, count })),
      recharges: key === "indomitable" ? [{ rest: "long_rest" }] : [{ rest: "short_rest" }, { rest: "long_rest" }],
    }
    let linkedModifiers = (row.linkedModifiers ?? []).filter((instance) =>
      !instance.characteristics?.some((char) => char.type === "uses"))
    linkedModifiers.push({
      instanceId: `${id}_uses`, catalogRefId: "cat_char_uses",
      characteristics: [{ id: `${id}_uses`, type: "uses", uses, label: row.name }],
    })
    if (key === "second wind") {
      linkedModifiers = linkedModifiers.filter((instance) =>
        !instance.activation?.effects?.some((effect) => effect.kind === "heal_self"))
      linkedModifiers.push({
        instanceId: `${id}_heal`, catalogRefId: "cat_fx_heal_self",
        activation: { bonusAction: true, effects: [{
          id: `${id}_heal`, kind: "heal_self", healMode: "dice", healDiceCount: 1, healDieType: "d10",
          // Dice healing uses these fixed rows as the flat class-level bonus.
          bonusByLevel: Array.from({ length: 20 }, (_, i) => ({ level: i + 1, mode: "fixed", fixed: i + 1 })),
        }] },
      })
    }
    return syncModifierRefs({
      ...row, limitedUses: uses, linkedModifiers,
      mechanics: key === "second wind" ? [] : (row.mechanics ?? []).filter((mechanic) => mechanic.kind !== "uses"),
    })
  }
  if (key === "relentless") {
    const linkedModifiers: LinkedModifierInstance[] = [{
      instanceId: id, catalogRefId: "cat_fx_class_resource",
      activation: { onInitiative: true, effects: [{
        id, kind: "class_resource", classResourceKey: "exploit_dice",
        classResourceChange: "reset", resourceRefreshOnInitiative: true,
      }] },
    }, {
      instanceId: `${id}_limit`, catalogRefId: "cat_char_modify_custom_ability",
      characteristics: [{
        id: `${id}_limit`, type: "modify_custom_ability", abilityNames: [],
        abilityFilter: { ...FIGHTER_LIBRARY, minLevel: 9, maxLevel: 12 }, removeUseLimit: true,
      }],
    }]
    return syncModifierRefs({ ...row, mechanics: [], limitedUses: null, linkedModifiers })
  }
  if (key === "martial superiority") {
    return syncModifierRefs({
      ...row, mechanics: [], limitedUses: null,
      sheetDisplay: { ...row.sheetDisplay, combatActions: true },
      activation: { action: true, noEconomyCost: true, requirements: [{ kind: "custom" as const, text: "Once per round: a known 1st- or 2nd-degree exploit" }] },
      linkedModifiers: [{
        instanceId: id, catalogRefId: "cat_char_modify_custom_ability",
        characteristics: [{
          id, type: "modify_custom_ability" as const, abilityNames: [],
          abilityFilter: { ...FIGHTER_LIBRARY, maxLevel: 8 },
          resourceCostWaiver: "Martial Superiority: once per round in combat",
        }],
      }],
    })
  }
  return row
}

/** Mechanical metadata from Alternate Fighter 3.5.2; no source prose. */
export function wireAlternateFighterProgression(content: ImportContent): ImportContent {
  return {
    ...content,
    classes: content.classes?.map((cls) => {
      if (cls.name !== "Alternate Fighter") return cls
      const features = (cls.features ?? []).map((feature) => progressionFeature(feature as Parameters<typeof progressionFeature>[0]))
      for (const [level, attacks] of [[11, 3], [17, 4]]) {
        const name = `Extra Attack (${attacks} attacks)`
        if (features.some((feature) => feature.name === name)) continue
        const id = `alt_fighter_attacks_${level}`
        features.push({
          name, level, description: "Attack action progression.",
          linkedModifiers: [{ instanceId: id, catalogRefId: "cat_fx_extra_attack", activation: {
            effects: [{ id, kind: "extra_attack", extraAttackCount: attacks - 1 }],
          } }],
        })
      }
      return { ...cls, features: ensureSubclassUnlockFeature({ name: cls.name, features }, 3) as typeof cls.features }
    }),
  }
}
