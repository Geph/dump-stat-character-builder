import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import { normalizeBonusByLevel } from "@/lib/compendium/bonus-by-level"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import type { Feature } from "@/lib/types"
import type { VisionCharacteristic } from "@/lib/compendium/characteristic-modifiers"

function parseBlindsenseRangeByLevel(
  description: string,
  featureLevel: number,
): BonusByLevelEntry[] {
  const text = description.trim()
  if (!text) return []

  const rows: BonusByLevelEntry[] = []
  for (const match of text.matchAll(
    /(?:at|reach)\s+(\d+)(?:st|nd|rd|th)?\s+level[^.]{0,100}?(\d+)\s+feet/gi,
  )) {
    const level = parseInt(match[1], 10)
    const range = parseInt(match[2], 10)
    if (Number.isFinite(level) && Number.isFinite(range) && range > 0) {
      rows.push({ level, mode: "fixed" as const, fixed: range })
    }
  }

  for (const match of text.matchAll(
    /increases to (\d+)\s+feet[^.]{0,60}?(\d+)(?:st|nd|rd|th)?\s+level/gi,
  )) {
    const range = parseInt(match[1], 10)
    const level = parseInt(match[2], 10)
    if (Number.isFinite(level) && Number.isFinite(range) && range > 0) {
      rows.push({ level, mode: "fixed" as const, fixed: range })
    }
  }

  if (!rows.length) {
    const simple = text.match(/(?:Blindsense|blindsight)[^.]{0,100}?(\d+)\s+feet/i)
    if (simple) {
      const range = parseInt(simple[1], 10)
      if (Number.isFinite(range) && range > 0) {
        rows.push({ level: featureLevel, mode: "fixed" as const, fixed: range })
      }
    }
  }

  const byLevel = new Map<number, number>()
  for (const row of rows) {
    byLevel.set(row.level, row.fixed)
  }
  return normalizeBonusByLevel(
    [...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, fixed]) => ({ level, mode: "fixed" as const, fixed })),
  )
}

/** Fill Blindsense preset range tiers from scaling description text. */
export function applyBlindsensePresetOverride(feature: Feature): Feature {
  if ((feature.name ?? "").trim() !== "Blindsense") return feature

  const rangeFeetByLevel = parseBlindsenseRangeByLevel(
    feature.description ?? "",
    feature.level ?? 1,
  )
  if (!rangeFeetByLevel.length) return feature

  const linked = (feature.linkedModifiers ?? []).map((inst) => {
    const characteristics = inst.characteristics?.map((mod) => {
      if (mod.type !== "vision") return mod
      const vision = mod as VisionCharacteristic
      const baseRange = rangeFeetByLevel[0]?.fixed ?? vision.rangeFeet
      return {
        ...vision,
        visionType: "blindsight" as const,
        rangeFeet: baseRange,
        rangeFeetByLevel,
        label: vision.label ?? "Blindsense (hearing)",
      }
    })
    return characteristics ? { ...inst, characteristics } : inst
  })

  return syncModifierRefs({
    ...feature,
    linkedModifiers: linked,
    importModifierMeta: feature.importModifierMeta,
  })
}
