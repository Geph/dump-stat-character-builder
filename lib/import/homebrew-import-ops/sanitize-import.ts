/**
 * Auto-fix common LLM extract mistakes on homebrew class import JSON.
 * Safe to run before writing Drive import-json or after merging spell fill-ins.
 */

import { sanitizeWitchImportContent } from "@/lib/import/enrichment-presets/packs/witch"
import { sanitizeVagabondImportContent } from "@/lib/import/enrichment-presets/packs/vagabond"
import { sanitizeWarmageImportContent } from "@/lib/import/enrichment-presets/packs/warmage"
import { sanitizeOccultistImportContent } from "@/lib/import/enrichment-presets/packs/occultist"
import type { ImportContent } from "@/lib/import/content-schema"

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function className(content: JsonRecord): string {
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return ""
  return String(asRecord(classes[0])?.name ?? "")
}

function ensureEquipmentFromHolyTrinkets(content: JsonRecord): void {
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return
  const features = asRecord(classes[0])?.features
  if (!Array.isArray(features)) return
  const holy = features.map(asRecord).find((f) => /^holy trinkets$/i.test(String(f?.name ?? "")))
  if (!holy) return
  const desc = String(holy.description ?? "")
  const equipment = Array.isArray(content.equipment) ? [...content.equipment] : []
  const existing = new Set(
    equipment.map((e) => String(asRecord(e)?.name ?? "").toLowerCase()).filter(Boolean),
  )
  for (const name of ["Amulet of Warding", "Restorative Ankh", "Rune of Banishment"]) {
    if (existing.has(name.toLowerCase())) continue
    const re = new RegExp(
      `<strong>${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?</strong>\\s*([\\s\\S]*?)(?=<strong>|$)`,
      "i",
    )
    const m = desc.match(re)
    const body = (m?.[1] ?? name).replace(/<\/?p>/gi, "").trim()
    equipment.push({
      name,
      category: "Adventuring Gear",
      subcategory: null,
      description: `<p>${body}</p>`,
      cost: null,
      weight: null,
      properties: null,
      magic_item_category: "Wondrous Item",
      rarity: "Uncommon",
      requires_attunement: false,
      source: "Investigator",
    })
  }
  content.equipment = equipment
}

/** Apply structural fixes; returns a deep-cloned object. */
export function sanitizeHomebrewImportJson(content: unknown): Record<string, unknown> {
  const root = asRecord(content)
  if (!root) throw new Error("sanitizeHomebrewImportJson: root must be an object")
  const next = clone(root)
  const name = className(next)

  if (Array.isArray(next.class_resources)) {
    next.class_resources = next.class_resources.map((row) => {
      const r = asRecord(row)
      if (!r) return row
      const key = String(r.resource_key ?? "")
      if (/^finisher(?:_dice)?$/i.test(key)) {
        const uses = asRecord(r.uses) ?? { type: "special" }
        return {
          ...r,
          resource_key: "finisher",
          name: "Finisher",
          description:
            r.description ??
            "Bonus damage dice dealt by Finisher / Improved Finisher (e.g. 1d8 → 3d8). A damage rider, not a spendable pool.",
          uses: { ...uses, type: "special", dieType: uses.dieType ?? "d8" },
        }
      }
      if (key === "charnel_touch") {
        const uses = asRecord(r.uses) ?? {}
        const bad =
          uses.type === "multiply_level" ||
          (uses.multiplier != null && uses.atLevelMode !== "multiply_level")
        if (bad || (uses.type === "at_level" && !uses.atLevelTable)) {
          const mult =
            typeof uses.multiplier === "number"
              ? uses.multiplier
              : Array.isArray(uses.atLevelTable) && asRecord(uses.atLevelTable[0])?.count != null
                ? Number(asRecord(uses.atLevelTable[0])!.count)
                : 5
          return {
            ...r,
            uses: {
              type: "at_level",
              atLevelMode: "multiply_level",
              atLevelTable: [{ level: 1, count: mult }],
              recharges: Array.isArray(uses.recharges) ? uses.recharges : [{ rest: "long_rest" }],
            },
          }
        }
      }
      if (usesTypeMultiplyLevel(r)) {
        // Generic catch for other pools mistakenly typed multiply_level
        const uses = asRecord(r.uses) ?? {}
        const mult = typeof uses.multiplier === "number" ? uses.multiplier : 1
        return {
          ...r,
          uses: {
            type: "at_level",
            atLevelMode: "multiply_level",
            atLevelTable: [{ level: 1, count: mult }],
            recharges: Array.isArray(uses.recharges) ? uses.recharges : [{ rest: "long_rest" }],
          },
        }
      }
      return r
    })
  }

  if (/investigator/i.test(name)) {
    stripFeaturePicker(next, /^trinkets$/i)
    ensureEquipmentFromHolyTrinkets(next)
  }

  if (/necromancer/i.test(name)) {
    stripFeaturePicker(next, /^thralls$/i)
    const cls = asRecord(Array.isArray(next.classes) ? next.classes[0] : null)
    if (cls && !asRecord(cls.spellcasting)?.ability) {
      cls.spellcasting = { ability: "Intelligence", caster_progression: "full" }
      if (Array.isArray(next.classes)) next.classes = [{ ...cls }, ...next.classes.slice(1)]
    }
    fixLichdomImmunityKind(next)
  }

  if (/martyr/i.test(name) && Array.isArray(next.class_resources)) {
    next.class_resources = next.class_resources.map((row) => {
      const r = asRecord(row)
      if (!r) return row
      if (r.resource_key === "spell_uses") {
        const uses = asRecord(r.uses) ?? {}
        return {
          ...r,
          uses: {
            ...uses,
            recharges: Array.isArray(uses.recharges) ? uses.recharges : [{ rest: "long_rest" }],
          },
        }
      }
      if (r.resource_key === "max_spell_level") {
        const uses = asRecord(r.uses) ?? {}
        return { ...r, uses: { ...uses, type: "special" } }
      }
      return r
    })
  }

  if (/vagabond/i.test(name)) {
    fixVagabondBattleTactics(next)
    demoteSubclassManeuverKnacks(next)
  }

  if (/witch/i.test(name)) {
    fixWitchResourcesAndSpellcasting(next)
  }

  // Class-pack sanitizers (Hex grant shape, Battle Tactics, Arcane Surge, etc.)
  let out = next as ImportContent
  if (/witch/i.test(name)) out = sanitizeWitchImportContent(out)
  if (/vagabond/i.test(name)) out = sanitizeVagabondImportContent(out)
  if (/warmage/i.test(name)) out = sanitizeWarmageImportContent(out)
  if (/occultist/i.test(name)) out = sanitizeOccultistImportContent(out)

  return out as Record<string, unknown>
}

function usesTypeMultiplyLevel(row: JsonRecord): boolean {
  const uses = asRecord(row.uses)
  return uses?.type === "multiply_level"
}

function stripFeaturePicker(content: JsonRecord, nameRe: RegExp): void {
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return
  const cls = asRecord(classes[0])
  if (!cls || !Array.isArray(cls.features)) return
  cls.features = cls.features.map((feat) => {
    const f = asRecord(feat)
    if (!f || typeof f.name !== "string" || !nameRe.test(f.name)) return feat
    const { isChoice: _i, choices: _c, ...rest } = f
    return rest
  })
  content.classes = [{ ...cls }, ...classes.slice(1)]
}

function fixLichdomImmunityKind(content: JsonRecord): void {
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return
  const cls = asRecord(classes[0])
  if (!cls || !Array.isArray(cls.features)) return
  cls.features = cls.features.map((feat) => {
    const f = asRecord(feat)
    if (!f || !/^lichdom$/i.test(String(f.name ?? ""))) return feat
    if (!Array.isArray(f.mechanics)) return feat
    return {
      ...f,
      mechanics: f.mechanics.map((mech) => {
        const m = asRecord(mech)
        if (!m || m.kind !== "damage_resistance") return mech
        const types = Array.isArray(m.damageTypes) ? m.damageTypes.map(String) : []
        if (types.includes("Necrotic") && types.includes("Poison")) {
          return { ...m, kind: "damage_immunity", confidence: "high" }
        }
        return mech
      }),
    }
  })
  content.classes = [{ ...cls }, ...classes.slice(1)]
}

function fixVagabondBattleTactics(content: JsonRecord): void {
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return
  const cls = asRecord(classes[0])
  if (!cls || !Array.isArray(cls.features)) return
  cls.features = cls.features.map((feat) => {
    const f = asRecord(feat)
    if (!f || !/^battle tactics$/i.test(String(f.name ?? ""))) return feat
    const choices = asRecord(f.choices) ?? {}
    const { resourceKey: _drop, ...rest } = choices
    return {
      ...f,
      isChoice: true,
      choices: {
        ...rest,
        category: rest.category ?? "Maneuver",
        optionsSource: "class_knacks",
        swappableOnRest: false,
      },
    }
  })
  content.classes = [{ ...cls }, ...classes.slice(1)]
}

function demoteSubclassManeuverKnacks(content: JsonRecord): void {
  const proposals = asRecord(content.import_proposals)
  if (!proposals || !Array.isArray(proposals.custom_abilities)) return
  proposals.custom_abilities = proposals.custom_abilities.map((row) => {
    const a = asRecord(row)
    if (!a || a.source_type !== "subclass" || a.ability_role !== "knack") return row
    const { ability_role: _role, ...rest } = a
    return rest
  })
  content.import_proposals = proposals
}

function fixWitchResourcesAndSpellcasting(content: JsonRecord): void {
  if (Array.isArray(content.class_resources)) {
    content.class_resources = content.class_resources.map((row) => {
      const r = asRecord(row)
      if (!r) return row
      if (r.resource_key === "grand_hexes_known") {
        return { ...r, resource_key: "grand_hexes", name: "Grand Hexes" }
      }
      return r
    })
  }
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return
  const cls = asRecord(classes[0])
  if (!cls) return
  const spellcasting = asRecord(cls.spellcasting) ?? {}
  cls.spellcasting = {
    ...spellcasting,
    ability: spellcasting.ability ?? "Charisma",
    caster_progression: spellcasting.caster_progression ?? "full",
    prepared: spellcasting.prepared ?? true,
  }
  if (Array.isArray(cls.features)) {
    cls.features = cls.features.map((feat) => {
      const f = asRecord(feat)
      if (!f || !/^grand hex$/i.test(String(f.name ?? ""))) return feat
      const mechanics = Array.isArray(f.mechanics)
        ? f.mechanics.filter((mech) => {
            const m = asRecord(mech)
            if (!m || m.kind !== "grant_creature") return true
            const names = Array.isArray(m.creatureNames) ? m.creatureNames.map(String) : []
            return !names.some((n) => /abominable familiar/i.test(n))
          })
        : f.mechanics
      const choices = asRecord(f.choices) ?? {}
      return {
        ...f,
        isChoice: true,
        mechanics,
        choices: { ...choices, resourceKey: "grand_hexes", category: choices.category ?? "Grand Hex" },
      }
    })
  }
  content.classes = [{ ...cls }, ...classes.slice(1)]
}
