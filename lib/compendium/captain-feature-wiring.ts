import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { charInstance, fxInstance, modId, usesInstance } from "@/lib/compendium/modifier-instance-builders"
import {
  conditionImmunityFixed,
  damageResistanceChoice,
  damageResistanceFixed,
  FEAT_MODIFIER_CATALOG,
  savingThrowChoice,
  skillChoice,
} from "@/lib/compendium/feat-modifier-presets"
import type { Feature, FeatureChoice } from "@/lib/types"

/** Base Battle Tactics maneuvers every Captain knows. Not a Maneuvers Known picker. */
export const CAPTAIN_BASE_MANEUVERS = [
  "Bolster",
  "Born Leader",
  "Morale Boost",
  "Rally",
  "Staggering Strike",
] as const

export const CAPTAIN_BATTLE_TACTICS_GRANT_ID = "modinst_captain_battle_tactics_maneuvers"

/** Stat blocks the Captain picks when initiating a Cohort at 2nd level. */
export const CAPTAIN_COHORT_TYPES = [
  "Berserker",
  "Champion",
  "Cultist",
  "Hunter",
  "Mage",
  "Priest",
  "Minstrel",
  "Scoundrel",
  "Templar",
] as const

export const CAPTAIN_COHORT_SPECIES_FEATURE_NAME = "Cohort Species"

export const CAPTAIN_COHORT_SPECIES_INTRO =
  "When you initiate a new Humanoid Cohort, you can also give it one of the following traits to reflect its species."

type CohortSpeciesDef = {
  name: string
  trait: string
  description: string
  modifiers: () => LinkedModifierInstance[]
}

function checkAdvantageSave(instanceKey: string, conditions: string[]): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.checkRollModifier, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkRollMode: "advantage",
        checkCategory: "save",
        checkAbility: null,
        checkConditionTypes: conditions,
      },
    ],
  })
}

function checkAdvantageAbility(instanceKey: string, conditions: string[]): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.checkRollModifier, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkRollMode: "advantage",
        checkCategory: "ability",
        checkConditionTypes: conditions,
      },
    ],
  })
}

function dropToOneHp(instanceKey: string, label: string): LinkedModifierInstance {
  return {
    instanceId: `modinst_${instanceKey}`,
    catalogRefId: FEAT_MODIFIER_CATALOG.healSelf,
    activation: {
      onDropToZeroHp: true,
      effects: [
        {
          id: modId(instanceKey),
          kind: "heal_self",
          healMode: "fixed",
          healFixed: 1,
          label,
        },
      ],
    },
  }
}

export const CAPTAIN_COHORT_SPECIES_DEFS: readonly CohortSpeciesDef[] = [
  {
    name: "Dragonborn: Draconic Ancestry",
    trait: "Draconic Ancestry",
    description:
      "Draconic Ancestry. The Cohort has Resistance to one of the following types of damage associated with its dragon progenitor (Captain’s choice): Acid, Cold, Fire, Lightning, or Poison.",
    modifiers: () => [
      damageResistanceChoice(
        "cohort_dragonborn_resistance",
        ["Acid", "Cold", "Fire", "Lightning", "Poison"],
        "Cohort Draconic Ancestry",
      ),
    ],
  },
  {
    name: "Dwarf: Resistances and Immunities",
    trait: "Resistances and Immunities",
    description:
      "Resistances and Immunities. The Cohort has Resistance to Poison damage and Immunity to the Poisoned condition.",
    modifiers: () => [
      damageResistanceFixed("cohort_dwarf_poison_res", ["Poison"], "Cohort Dwarf Poison Resistance"),
      conditionImmunityFixed("cohort_dwarf_poisoned", ["Poisoned"], "Cohort Dwarf Poisoned Immunity"),
    ],
  },
  {
    name: "Elf: Fey Ancestry",
    trait: "Fey Ancestry",
    description:
      "Fey Ancestry. The Cohort has Advantage on saving throws it makes to avoid or end the Charmed condition.",
    modifiers: () => [checkAdvantageSave("cohort_elf_fey_ancestry", ["Charmed"])],
  },
  {
    name: "Gnome: Saving Throws",
    trait: "Saving Throws",
    description:
      "Saving Throws. The Cohort has proficiency in one of the following saving throws: Intelligence, Wisdom, or Charisma.",
    modifiers: () => [
      savingThrowChoice(
        "cohort_gnome_save",
        "Cohort Gnome Saving Throw",
        ["Intelligence", "Wisdom", "Charisma"],
      ),
    ],
  },
  {
    name: "Goliath: Powerful Build",
    trait: "Powerful Build",
    description:
      "Powerful Build. The Cohort has Advantage on any ability check it makes to end the Grappled condition. It also counts as one size larger when determining its carrying capacity.",
    modifiers: () => [checkAdvantageAbility("cohort_goliath_grapple", ["Grappled"])],
  },
  {
    name: "Halfling: Brave",
    trait: "Brave",
    description:
      "Brave. The Cohort has Advantage on saving throws it makes to avoid or end the Frightened condition.",
    modifiers: () => [checkAdvantageSave("cohort_halfling_brave", ["Frightened"])],
  },
  {
    name: "Human: Skillful",
    trait: "Skillful",
    description: "Skillful. The Cohort has proficiency with one skill of your choice.",
    modifiers: () => [
      skillChoice("cohort_human_skill", {
        count: 1,
        allowAnySkill: true,
        label: "Cohort Human Skill",
      }),
    ],
  },
  {
    name: "Orc: Relentless (1/Day)",
    trait: "Relentless",
    description:
      "Relentless (1/Day). When the Cohort is reduced to 0 Hit Points, it is reduced to 1 Hit Point instead.",
    modifiers: () => [
      dropToOneHp("cohort_orc_relentless", "Cohort Relentless"),
      usesInstance(
        "modinst_cohort_orc_relentless_uses",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Cohort Relentless",
      ),
    ],
  },
  {
    name: "Tiefling: Fiendish Ancestry",
    trait: "Fiendish Ancestry",
    description:
      "Fiendish Ancestry. The Cohort has Resistance to one of the following types of damage associated with its fiendish progenitor (Captain’s choice): Fire, Necrotic, or Poison.",
    modifiers: () => [
      damageResistanceChoice(
        "cohort_tiefling_resistance",
        ["Fire", "Necrotic", "Poison"],
        "Cohort Fiendish Ancestry",
      ),
    ],
  },
]

function matchCohortSpeciesDef(optionName: string): CohortSpeciesDef | undefined {
  const key = optionName.trim().toLowerCase()
  return CAPTAIN_COHORT_SPECIES_DEFS.find((def) => {
    const full = def.name.toLowerCase()
    const species = def.name.split(":")[0]?.trim().toLowerCase() ?? full
    const trait = def.trait.toLowerCase()
    return (
      key === full ||
      key === species ||
      key.startsWith(`${species}:`) ||
      key.startsWith(`${species} `) ||
      key === trait ||
      key.includes(trait)
    )
  })
}

function optionHasCharacteristicType(
  option: { linkedModifiers?: LinkedModifierInstance[] },
  type: string,
): boolean {
  return (option.linkedModifiers ?? []).some((instance) =>
    (instance.characteristics ?? []).some((char) => char.type === type),
  )
}

function optionHasEffectKind(
  option: { linkedModifiers?: LinkedModifierInstance[] },
  kind: string,
): boolean {
  return (option.linkedModifiers ?? []).some((instance) =>
    (instance.activation?.effects ?? []).some((effect) => effect.kind === kind),
  )
}

function optionNeedsSpeciesModifiers(
  option: { linkedModifiers?: LinkedModifierInstance[] },
  def: CohortSpeciesDef,
): boolean {
  const sample = def.modifiers()
  return sample.some((instance) => {
    const types = new Set((instance.characteristics ?? []).map((char) => char.type))
    for (const type of types) {
      if (!optionHasCharacteristicType(option, type)) return true
    }
    const kinds = new Set((instance.activation?.effects ?? []).map((effect) => effect.kind))
    for (const kind of kinds) {
      if (!optionHasEffectKind(option, kind)) return true
    }
    return false
  })
}

/** Swapped preset args stored choiceOptions as a label string (and vice versa). */
function optionHasMalformedChoiceFields(option: { linkedModifiers?: LinkedModifierInstance[] }): boolean {
  return (option.linkedModifiers ?? []).some((instance) =>
    (instance.characteristics ?? []).some((char) => {
      const choiceOptions = "choiceOptions" in char ? char.choiceOptions : undefined
      const label = "label" in char ? char.label : undefined
      return (
        (choiceOptions != null && !Array.isArray(choiceOptions)) ||
        (label != null && typeof label !== "string")
      )
    }),
  )
}

function wireCohortSpeciesOption(option: FeatureChoice["options"][number]): FeatureChoice["options"][number] {
  const def = matchCohortSpeciesDef(option.name)
  if (!def) return option
  const description = option.description?.trim() ? option.description : def.description
  if (optionHasMalformedChoiceFields(option)) {
    return { ...option, description, linkedModifiers: def.modifiers() }
  }
  if (!optionNeedsSpeciesModifiers(option, def)) {
    return description === option.description ? option : { ...option, description }
  }
  return {
    ...option,
    description,
    linkedModifiers: [...(option.linkedModifiers ?? []), ...def.modifiers()],
  }
}

function defaultCohortSpeciesOptions(): FeatureChoice["options"] {
  return CAPTAIN_COHORT_SPECIES_DEFS.map((def) => ({
    name: def.name,
    description: def.description,
    linkedModifiers: def.modifiers(),
  }))
}

function mergeCohortSpeciesOptions(
  existing: FeatureChoice["options"] | undefined,
): FeatureChoice["options"] {
  if (!existing?.length) return defaultCohortSpeciesOptions()
  const wired = existing.map(wireCohortSpeciesOption)
  const seen = new Set(
    wired
      .map((option) => matchCohortSpeciesDef(option.name)?.name.toLowerCase())
      .filter((name): name is string => Boolean(name)),
  )
  const missing = CAPTAIN_COHORT_SPECIES_DEFS.filter((def) => !seen.has(def.name.toLowerCase())).map(
    (def) => ({
      name: def.name,
      description: def.description,
      linkedModifiers: def.modifiers(),
    }),
  )
  return [...wired, ...missing]
}

export function isCaptainCohortSpeciesFeature(feature: { name?: string | null }): boolean {
  return /^cohort\s+species$/i.test(feature.name?.trim() ?? "")
}

function looksLikeCohortSpeciesIntro(text: string | null | undefined): boolean {
  return /humanoid\s+cohort/i.test(text ?? "") && /species/i.test(text ?? "")
}

function sanitizeCaptainCohortSpeciesFeature(feature: Feature): Feature {
  const options = mergeCohortSpeciesOptions(feature.choices?.options)
  const alreadyWired =
    feature.isChoice === true &&
    (feature.choices?.count ?? 0) === 1 &&
    feature.choices?.applyTo === "companion" &&
    feature.choices?.applyToCompanionFeature === "Cohort" &&
    options.length >= CAPTAIN_COHORT_SPECIES_DEFS.length &&
    options.every((option, index) => option === (feature.choices?.options ?? [])[index])
  if (alreadyWired) return feature
  const description =
    feature.description?.trim() && !looksLikeCohortSpeciesIntro(feature.description)
      ? feature.description
      : feature.description?.trim() || `<p>${CAPTAIN_COHORT_SPECIES_INTRO}</p>`
  return {
    ...feature,
    name: feature.name.trim() || CAPTAIN_COHORT_SPECIES_FEATURE_NAME,
    description,
    isChoice: true,
    choices: {
      category: feature.choices?.category ?? CAPTAIN_COHORT_SPECIES_FEATURE_NAME,
      count: 1,
      options,
      applyTo: "companion",
      applyToCompanionFeature: "Cohort",
      swappableOnRest: feature.choices?.swappableOnRest ?? false,
    },
  }
}

function buildCaptainCohortSpeciesFeature(level: number): Feature {
  return sanitizeCaptainCohortSpeciesFeature({
    level,
    name: CAPTAIN_COHORT_SPECIES_FEATURE_NAME,
    description: `<p>${CAPTAIN_COHORT_SPECIES_INTRO}</p>`,
  })
}

function ensureCaptainCohortSpeciesFeature(features: Feature[]): Feature[] {
  const existingIndex = features.findIndex(isCaptainCohortSpeciesFeature)
  if (existingIndex >= 0) {
    const next = [...features]
    next[existingIndex] = sanitizeCaptainCohortSpeciesFeature(features[existingIndex]!)
    return next
  }
  const cohortIndex = features.findIndex((feature) => /^cohort$/i.test(feature.name.trim()))
  const speciesStub = features.findIndex(
    (feature) => looksLikeCohortSpeciesIntro(feature.description) && !/^cohort$/i.test(feature.name.trim()),
  )
  if (speciesStub >= 0) {
    const next = [...features]
    next[speciesStub] = sanitizeCaptainCohortSpeciesFeature({
      ...features[speciesStub]!,
      name: CAPTAIN_COHORT_SPECIES_FEATURE_NAME,
    })
    return next
  }
  if (cohortIndex < 0) return features
  const level = features[cohortIndex]?.level ?? 2
  const next = [...features]
  next.splice(cohortIndex + 1, 0, buildCaptainCohortSpeciesFeature(level))
  return next
}

export function isCaptainBaseManeuverName(name: string | null | undefined): boolean {
  const key = name?.trim().toLowerCase() ?? ""
  return CAPTAIN_BASE_MANEUVERS.some((entry) => entry.toLowerCase() === key)
}

export function captainBattleTacticsGrantModifier(
  abilityNames: readonly string[] = CAPTAIN_BASE_MANEUVERS,
): LinkedModifierInstance {
  return charInstance(
    CAPTAIN_BATTLE_TACTICS_GRANT_ID,
    characteristicCatalogRefId("grant_custom_ability"),
    [
      {
        id: modId("captain_battle_tactics_maneuvers"),
        type: "grant_custom_ability",
        abilityNames: [...abilityNames],
        label: "Gain Captain Maneuver Options",
      },
    ],
  )
}

function mergeGrantNames(
  existing: LinkedModifierInstance[] | undefined,
  names: readonly string[],
): { modifiers: LinkedModifierInstance[]; changed: boolean } {
  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  const grantIndex = (existing ?? []).findIndex((instance) =>
    instance.characteristics?.some((char) => char.type === "grant_custom_ability"),
  )
  if (grantIndex < 0) {
    return {
      modifiers: [...(existing ?? []), captainBattleTacticsGrantModifier(wanted)],
      changed: true,
    }
  }
  const instance = existing![grantIndex]
  const chars = instance.characteristics ?? []
  const nextChars = chars.map((char) => {
    if (char.type !== "grant_custom_ability") return char
    const current = char.abilityNames ?? []
    const merged = [...new Set([...current, ...wanted])]
    if (merged.length === current.length && merged.every((name, i) => name === current[i])) {
      return char
    }
    return { ...char, abilityNames: merged }
  })
  const changed = nextChars.some((char, i) => char !== chars[i])
  if (!changed) return { modifiers: existing!, changed: false }
  const next = [...existing!]
  next[grantIndex] = { ...instance, characteristics: nextChars }
  return { modifiers: next, changed: true }
}

function sanitizeCaptainCohortFeature(feature: Feature): Feature {
  if (!/^cohort$/i.test(feature.name.trim())) return feature
  const existingOptions = feature.choices?.options ?? []
  const options =
    existingOptions.length > 0
      ? existingOptions
      : CAPTAIN_COHORT_TYPES.map((name) => ({ name, description: `${name} cohort.` }))
  const alreadyChoice =
    feature.isChoice === true &&
    (feature.choices?.count ?? 0) === 1 &&
    options.length >= CAPTAIN_COHORT_TYPES.length
  if (alreadyChoice) return feature
  return {
    ...feature,
    isChoice: true,
    choices: {
      category: feature.choices?.category ?? "Cohort",
      count: 1,
      options,
      swappableOnRest: feature.choices?.swappableOnRest ?? false,
    },
  }
}

export const CAPTAIN_VANTAGE_POINT_CLIMB_ID = "modinst_captain_eagle_vantage_climb"

/** Eagle Banner Vantage Point: Climb Speed equal to Speed. */
export function captainVantagePointClimbModifier(): LinkedModifierInstance {
  return charInstance(CAPTAIN_VANTAGE_POINT_CLIMB_ID, characteristicCatalogRefId("speed"), [
    {
      id: modId("captain_eagle_vantage_climb"),
      type: "speed",
      speedType: "climb",
      mode: "equal_to_walk",
      value: 0,
      label: "Climb Speed equal to your Speed",
    },
  ])
}

function featureHasClimbEqualToWalk(feature: Feature): boolean {
  return (feature.linkedModifiers ?? []).some((instance) =>
    (instance.characteristics ?? []).some(
      (char) =>
        char.type === "speed" && char.speedType === "climb" && char.mode === "equal_to_walk",
    ),
  )
}

/** Ensure Vantage Point grants climb speed equal to walk (idempotent). */
export function ensureCaptainVantagePointClimb(feature: Feature): Feature {
  if (!/^vantage\s*point$/i.test(feature.name.trim())) return feature
  if (featureHasClimbEqualToWalk(feature)) return feature
  // Drop a broken climb stub (e.g. add/0) so equal_to_walk is the sole climb grant.
  const withoutClimb = (feature.linkedModifiers ?? []).filter(
    (instance) =>
      !(instance.characteristics ?? []).some(
        (char) => char.type === "speed" && char.speedType === "climb",
      ),
  )
  return syncModifierRefs({
    ...feature,
    linkedModifiers: [...withoutClimb, captainVantagePointClimbModifier()],
  })
}

export function sanitizeCaptainFeature(
  feature: Feature,
  extraManeuverNames: readonly string[] = [],
): Feature {
  return ensureCaptainVantagePointClimb(
    sanitizeCaptainBattleTacticsOrCohort(feature, extraManeuverNames),
  )
}

function sanitizeCaptainBattleTacticsOrCohort(
  feature: Feature,
  extraManeuverNames: readonly string[] = [],
): Feature {
  if (isCaptainCohortSpeciesFeature(feature)) {
    return sanitizeCaptainCohortSpeciesFeature(feature)
  }
  const cohort = sanitizeCaptainCohortFeature(feature)
  if (!/^battle tactics$/i.test(feature.name.trim())) return cohort
  const names = [...CAPTAIN_BASE_MANEUVERS, ...extraManeuverNames]
  const { modifiers, changed } = mergeGrantNames(cohort.linkedModifiers, names)
  const sheetDisplay = {
    combatActions: true,
    featuresTab: true,
    ...cohort.sheetDisplay,
  }
  const displayChanged =
    cohort.sheetDisplay?.combatActions !== true || cohort.sheetDisplay?.featuresTab !== true
  if (!changed && !displayChanged && cohort === feature) return feature
  return syncModifierRefs({
    ...cohort,
    linkedModifiers: modifiers,
    sheetDisplay,
  })
}

export function sanitizeCaptainFeatures(
  features: Feature[] | undefined,
  extraManeuverNames: readonly string[] = [],
): Feature[] | undefined {
  if (!features?.length) return features
  return ensureCaptainCohortSpeciesFeature(
    features.map((feature) => sanitizeCaptainFeature(feature, extraManeuverNames)),
  )
}

/** Subclass features (Eagle Banner Vantage Point, etc.). */
export function sanitizeCaptainSubclassFeatures(
  features: Feature[] | undefined,
): Feature[] | undefined {
  if (!features?.length) return features
  return features.map((feature) => ensureCaptainVantagePointClimb(feature))
}
