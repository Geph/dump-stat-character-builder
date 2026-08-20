import {
  isSubclassFeatureGrant,
  isSubclassUnlockFeature,
} from "@/lib/builder/subclass-unlock"
import type { Feature } from "@/lib/types"

export type ModifierReviewCarrier = Feature & {
  modifierReviewPending?: boolean
}

/**
 * Class features that are intentionally structural / narrative — subclass unlock
 * choices, later “subclass feature” placeholders, and similar shells that do not
 * need common modifiers (same idea as SRD progression table rows).
 */
export function isStructuralOrNarrativeFeature(
  feature: Pick<Feature, "name" | "description" | "isChoice" | "choices"> & {
    level?: number
    ability_role?: string | null
  },
): boolean {
  const name = (feature.name ?? "").trim()
  if (!name) return false

  // Weapon Mastery Properties catalog rows (Parry, Shift, Explode, ...) are reference
  // text for equipment tooltips / upgrade pickers, not standalone modifier-bearing
  // features — never expected to carry linked modifiers of their own.
  if (feature.ability_role === "weapon_mastery") return true

  const asFeature = feature as Feature
  if (isSubclassFeatureGrant(asFeature)) return true
  if (isSubclassUnlockFeature(asFeature)) return true

  // First discipline comes from the archetype grant, not a free pick.
  if (/^primary\s+discipline$/i.test(name)) return true
  // Capstone shells that are prose / transformation rather than a roll modifier.
  if (/^ascension$/i.test(name)) return true

  // Alchemist (and similar) resource / unlock shells — the pool or list lives elsewhere.
  if (/^reagents$/i.test(name)) return true
  if (/^potions$/i.test(name)) return true
  if (/^experimentalist$/i.test(name)) return true
  // Object/structure damage riders with no sheet modifier yet.
  if (/^blasting specialty$/i.test(name)) return true

  const description = feature.description ?? ""
  // Spellcasting-focus permissions are rules text, not a derived numeric modifier.
  if (/\buse (?:an?|your) .{0,40}\bas a Spellcasting Focus\b/i.test(description)) return true
  // Spell-expansion prose that adds free-form cosmetic/utility modes to a named spell.
  if (
    /\bwhen you cast Thaumaturgy\b/i.test(description) &&
    /\bcreate the following effects\b/i.test(description)
  ) {
    return true
  }
  // Companion-only death/movement riders have no owner-sheet modifier. Keep these visible as
  // narrative rather than falsely granting the benefit to the player character.
  if (
    /\bone of your thralls is reduced to 0 Hit Points or you release it\b/i.test(description) &&
    (/\bregain\b[\s\S]{0,80}\bCharnel Touch points\b/i.test(description) ||
      /\bcause it to explode\b/i.test(description))
  ) {
    return true
  }
  if (
    /\beach of your thralls gains a Fly Speed\b/i.test(description) &&
    /\bdon'?t provoke Opportunity Attacks\b/i.test(description)
  ) {
    return true
  }

  // Mage Hand Press Warmage — narrative / play-time-only features with no reasonable
  // mechanical primitive (random card/dice tables, GM-adjudicated trackers, freeform
  // teleport/positioning riders). Rules text stays in the description; nothing to wire.
  const WARMAGE_NARRATIVE_FEATURE_NAMES = [
    // These two are pure pointers into class_resources.arcane_surge (uses count/recharge
    // already live on the base Arcane Surge feature's setLimitedUses) — no modifiers of
    // their own to carry.
    "arcane surge improvement",
    "master warmage",
    "reliable cantrip",
    "spell sculpting",
    "high stakes",
    "card reading",
    "ace in the hole",
    "loaded dice",
    "twisted fate",
    "steal luck",
    "grandmaster",
    "tactical maneuver",
    "vanishing toss",
    "elusive step",
    "pawn wall",
    "fundamental mastery",
    "lead from the front",
    // Capstone maneuver shell — ally-direction rider tracked as Battle Die spend, not a sheet mod.
    String.raw`checkmate(?:\s*\[maneuver\])?`,
  ]
  if (WARMAGE_NARRATIVE_FEATURE_NAMES.some((entry) => new RegExp(`^${entry}$`, "i").test(name))) {
    return true
  }

  // Mage Hand Press Vagabond — base-class background state overrides with no discrete
  // "power" of their own to attach a reminder to (always-on Bloodied-state prose / a
  // freeform extra Bonus Action for maneuvers). Rules text stays in the description;
  // nothing to wire. (Subclass features with a concrete, specific rule instead get a
  // power_rider alert on their own named action — see packs/vagabond.ts.)
  const VAGABOND_NARRATIVE_FEATURE_NAMES = [
    // Critical Hits against you miss while Bloodied — no crit-immunity primitive.
    "desperate survival",
    // Extra Bonus Action usable only for a maneuver — GM/player-tracked economy.
    "deft maneuver",
    // "Always considered Bloodied" state override — no separate sheet primitive.
    "wayworn",
  ]
  if (VAGABOND_NARRATIVE_FEATURE_NAMES.some((entry) => new RegExp(`^${entry}$`, "i").test(name))) {
    return true
  }

  return false
}

/** Imported feature flagged for modifier wiring and still has no linked modifiers. */
export function featureNeedsModifierReview(feature: ModifierReviewCarrier): boolean {
  if (isStructuralOrNarrativeFeature(feature)) return false
  return Boolean(feature.modifierReviewPending) && (feature.linkedModifiers?.length ?? 0) === 0
}

export function clearModifierReviewPending<T extends ModifierReviewCarrier>(feature: T): T {
  if (!feature.modifierReviewPending) return feature
  const { modifierReviewPending: _flag, ...rest } = feature
  return rest as T
}

export function markFeatureModifierReviewForPersist(feature: Feature): Feature {
  if (isStructuralOrNarrativeFeature(feature)) {
    return clearModifierReviewPending(feature as ModifierReviewCarrier)
  }
  if ((feature.linkedModifiers?.length ?? 0) > 0) {
    return clearModifierReviewPending(feature as ModifierReviewCarrier)
  }
  return { ...feature, modifierReviewPending: true }
}
