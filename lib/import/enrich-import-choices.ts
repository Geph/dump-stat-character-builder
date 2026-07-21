import { buildWeaponMasteryModifier } from "@/lib/compendium/shared-feature-modifier-builders"
import { enrichWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { legacyFeatureOptionPickerCharacteristic, migrateFeatureOptionPickers } from "@/lib/compendium/feature-option-choice-migration"
import { createModifierInstanceId, syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { ImportContent, ImportContentWithAbilities } from "@/lib/import/content-schema"
import { resolveClassSkillChoices } from "@/lib/import/parse-class-shell"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"
import type { Feature } from "@/lib/types"
import { extractPrerequisiteFromDescription } from "@/lib/builder/choice-prerequisite"
import { enrichPsionicTalentGrantFeatures } from "@/lib/builder/aggregate-psionic-talents"

const FEATURE_OPTION_PICKER_CATALOG_ID = "cat_char_feature_option_picker"

const ABILITY_WORD_TO_KEY: Record<string, AbilityScoreKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
}

function parseAbilityWord(word: string): AbilityScoreKey | null {
  return ABILITY_WORD_TO_KEY[word.trim().toLowerCase()] ?? null
}

function buildChoiceOptionPicker(feature: Feature): LinkedModifierInstance | null {
  const options = feature.choices?.options
  if (!feature.isChoice || !options?.length) return null

  const instanceId = createModifierInstanceId()
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId(`choice_${feature.name.replace(/\s+/g, "_").toLowerCase()}`),
      category: feature.choices?.category ?? feature.name,
      choiceCount: feature.choices?.count ?? 1,
      swappableOnRest: /\breplace\b/i.test(feature.description ?? ""),
      options: options.map((option) => ({
        name: option.name,
        description: option.description,
      })),
      label: feature.name,
    }),
  ])
}

function buildGrandHexPicker(
  feature: Feature,
  options: { name: string; description: string }[],
): LinkedModifierInstance {
  const countMatch = (feature.description ?? "").match(
    /gain\s+(?:one|1)\s+Grand Hex[\s\S]{0,120}?(\d+)\s+Grand Hex/i,
  )
  const choiceCount = countMatch ? parseInt(countMatch[1], 10) : 1
  const instanceId = createModifierInstanceId()
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId("grand_hex_picker"),
      category: "Grand Hex",
      choiceCount: Number.isFinite(choiceCount) ? choiceCount : 1,
      swappableOnRest: /\breplace\b/i.test(feature.description ?? ""),
      resourceKey: "grand_hexes",
      options,
      label: "Grand Hex options",
    }),
  ])
}

function buildHexesResourcePicker(feature: Feature): LinkedModifierInstance {
  const instanceId = createModifierInstanceId()
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId("hexes_known"),
      category: "Hex",
      choiceCount: 1,
      swappableOnRest: true,
      resourceKey: "hexes_known",
      label: "Hexes known (count scales on class table)",
    }),
  ])
}

function enrichKnacksFeature(feature: Feature): Feature {
  const name = feature.name.trim()
  const isKnackPool =
    /^knacks?$/i.test(name) || /(?:warmage\s+)?tricks?$/i.test(name)
  if (!isKnackPool) return feature
  const category = /trick/i.test(name) ? (name || "Trick") : "Knack"
  const resourceKey = /trick/i.test(name) ? "tricks_known" : "knacks_known"
  if ((feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => {
      const legacy = char as { type?: string; resourceKey?: string | null }
      return (
        legacy.type === "feature_option_picker" &&
        (legacy.resourceKey === "knacks_known" || legacy.resourceKey === "tricks_known")
      )
    }),
  )) {
    return feature
  }
  const picker = charInstance(createModifierInstanceId(), FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId(resourceKey),
      category,
      choiceCount: feature.choices?.count ?? 1,
      swappableOnRest: /\breplace\b/i.test(feature.description ?? ""),
      swapRestType: /\bshort\s+rest\b/i.test(feature.description ?? "") ? "short" : "long",
      resourceKey,
      optionsSource: "class_knacks",
      label: `${category} options (count scales on class table)`,
    }),
  ])
  return syncModifierRefs({
    ...feature,
    isChoice: true,
    choices: {
      category,
      count: feature.choices?.count ?? 1,
      options: feature.choices?.options ?? [],
      resourceKey,
      optionsSource: "class_knacks",
      swappableOnRest: /\breplace\b/i.test(feature.description ?? ""),
      swapRestType: /\bshort\s+rest\b/i.test(feature.description ?? "") ? "short" : "long",
    },
    linkedModifiers: [...(feature.linkedModifiers ?? []), picker],
  })
}

function buildBombFormulasPicker(feature: Feature): LinkedModifierInstance {
  const instanceId = createModifierInstanceId()
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId("bomb_formulas_known"),
      category: "Bomb Formula",
      choiceCount: 1,
      swappableOnRest: true,
      swapRestType: "long",
      resourceKey: "bomb_formulas_known",
      optionsSource: "class_bomb_formulas",
      label: "Bomb formulas known (count scales on class table)",
    }),
  ])
}

function enrichBombFormulasFeature(feature: Feature): Feature {
  if (!/^bomb formulas?$/i.test(feature.name.trim())) return feature
  if ((feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => {
      const legacy = char as { type?: string; resourceKey?: string | null }
      return legacy.type === "feature_option_picker" && legacy.resourceKey === "bomb_formulas_known"
    }),
  )) {
    return feature
  }
  return syncModifierRefs({
    ...feature,
    isChoice: true,
    choices: {
      category: "Bomb Formula",
      count: 1,
      options: [],
      resourceKey: "bomb_formulas_known",
      optionsSource: "class_bomb_formulas",
      swappableOnRest: true,
      swapRestType: "long",
    },
    linkedModifiers: [...(feature.linkedModifiers ?? []), buildBombFormulasPicker(feature)],
  })
}

function buildDiscoveriesPicker(feature: Feature): LinkedModifierInstance {
  const instanceId = createModifierInstanceId()
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId("discoveries_known"),
      category: "Discovery",
      choiceCount: 1,
      resourceKey: "discoveries_known",
      optionsSource: "class_discoveries",
      label: "Discoveries known (count scales on class table)",
    }),
  ])
}

function enrichDiscoveriesFeature(feature: Feature): Feature {
  if (!/^discoveries$/i.test(feature.name.trim())) return feature
  if ((feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => {
      const legacy = char as { type?: string; resourceKey?: string | null }
      return legacy.type === "feature_option_picker" && legacy.resourceKey === "discoveries_known"
    }),
  )) {
    return feature
  }
  return syncModifierRefs({
    ...feature,
    isChoice: true,
    choices: {
      category: "Discovery",
      count: 1,
      options: [],
      resourceKey: "discoveries_known",
      optionsSource: "class_discoveries",
    },
    linkedModifiers: [...(feature.linkedModifiers ?? []), buildDiscoveriesPicker(feature)],
  })
}

function buildUpgradesResourcePicker(feature: Feature): LinkedModifierInstance {
  const instanceId = createModifierInstanceId()
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId("upgrades"),
      category: "Upgrade",
      choiceCount: 1,
      swappableOnRest: /\bexchange\b/i.test(feature.description ?? ""),
      resourceKey: "upgrades",
      optionsSource: "class_upgrades",
      label: "Upgrades (count scales on class table)",
    }),
  ])
}

function enrichDanceStylesFeature(feature: Feature): Feature {
  if (!/^dance styles?$/i.test(feature.name.trim())) return feature
  if (feature.choices?.optionsSource === "class_upgrades") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        ...feature.choices,
        category: feature.choices.category || "Dance Style",
        resourceKey: feature.choices.resourceKey || "dance_styles_known",
        optionsSource: "class_upgrades",
        choiceCountByLevel:
          feature.choices.choiceCountByLevel ??
          [
            { level: 2, count: 1 },
            { level: 13, count: 2 },
          ],
      },
    }
  }
  if ((feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => {
      const legacy = char as { type?: string; resourceKey?: string | null }
      return legacy.type === "feature_option_picker" && legacy.resourceKey === "dance_styles_known"
    }),
  )) {
    return feature
  }
  return syncModifierRefs({
    ...feature,
    isChoice: true,
    choices: {
      category: "Dance Style",
      count: feature.choices?.count ?? 1,
      options: [],
      resourceKey: "dance_styles_known",
      optionsSource: "class_upgrades",
      choiceCountByLevel: feature.choices?.choiceCountByLevel ?? [
        { level: 2, count: 1 },
        { level: 13, count: 2 },
      ],
    },
    linkedModifiers: [
      ...(feature.linkedModifiers ?? []),
      charInstance(createModifierInstanceId(), FEATURE_OPTION_PICKER_CATALOG_ID, [
        legacyFeatureOptionPickerCharacteristic({
          id: modId("dance_styles_known"),
          category: "Dance Style",
          choiceCount: feature.choices?.count ?? 1,
          resourceKey: "dance_styles_known",
          optionsSource: "class_upgrades",
          label: "Dance Styles (count scales; Freestyle at 13 = 2)",
        }),
      ]),
    ],
  })
}

function enrichUpgradesFeature(feature: Feature): Feature {
  if (!isUpgradeSelectionFeature(feature)) return feature
  if ((feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => {
      const legacy = char as { type?: string; resourceKey?: string | null }
      return legacy.type === "feature_option_picker" && legacy.resourceKey === "upgrades"
    }),
  )) {
    return feature
  }
  return syncModifierRefs({
    ...feature,
    isChoice: true,
    choices: {
      category: "Upgrade",
      count: 1,
      options: [],
      resourceKey: "upgrades",
      optionsSource: "class_upgrades",
      swappableOnRest: /\bexchange\b/i.test(feature.description ?? ""),
    },
    linkedModifiers: [...(feature.linkedModifiers ?? []), buildUpgradesResourcePicker(feature)],
  })
}

function buildInventorSpecializationPicker(description: string): LinkedModifierInstance | null {
  const listMatch = description.match(/specialization:\s*([^.]+)/i)
  if (!listMatch) return null
  const options = listMatch[1]
    .split(/,|\bor\b/i)
    .map((name) => name.trim())
    .filter((name) => name.length > 1 && !/^each of which/i.test(name))
  if (options.length < 2) return null
  const instanceId = createModifierInstanceId()
  return charInstance(instanceId, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId("inventor_specialization"),
      category: "Inventor Specialization",
      choiceCount: 1,
      options: options.map((name) => ({ name, description: `${name} specialization` })),
      label: "Inventor Specialization",
    }),
  ])
}

function isUpgradeSelectionFeature(feature: Feature): boolean {
  const name = feature.name.trim()
  if (/upgrade/i.test(name)) return true
  return /\b(?:select|choose)\s+an?\s+upgrade\b/i.test(feature.description ?? "")
}

function fillChoiceOptionPrerequisites(feature: Feature): Feature {
  if (!feature.choices?.options?.length) return feature
  let changed = false
  const options = feature.choices.options.map((option) => {
    if (option.prerequisite?.trim()) return option
    const scraped = extractPrerequisiteFromDescription(option.description)
    if (!scraped) return option
    changed = true
    return { ...option, prerequisite: scraped }
  })
  if (!changed) return feature
  return {
    ...feature,
    choices: { ...feature.choices, options },
  }
}

function enrichPsionicPoolFeature(feature: Feature): Feature {
  const [enriched] = enrichPsionicTalentGrantFeatures([feature])
  const next = enriched ?? feature
  // optionsSource on Feature.choices is the live wire — do not attach a legacy
  // feature_option_picker characteristic (that only confuses the editor).
  return migrateFeatureOptionPickers(next)
}

function enrichPsionicsAbilityFeature(feature: Feature): Feature {
  if (!/^psionics$/i.test(feature.name.trim())) return feature

  const abilityMatch = (feature.description ?? "").match(
    /\b(?:your\s+)?psionic\s+ability\s+is\s+(Intelligence|Wisdom|Charisma)\b/i,
  )
  const ability = abilityMatch ? parseAbilityWord(abilityMatch[1]) : "intelligence"
  const abilityLabel = abilityMatch?.[1] ?? "Intelligence"

  const hasSpellcastingAbility = (feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => char.type === "spellcasting_ability"),
  )
  const hasCustomSkill = (feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some(
      (char) => char.type === "custom_skill" && /^psionics$/i.test(String(char.name ?? "")),
    ),
  )

  if (hasSpellcastingAbility && hasCustomSkill) return feature

  const nextMods = [...(feature.linkedModifiers ?? [])]
  if (!hasSpellcastingAbility && ability) {
    nextMods.push(
      charInstance(createModifierInstanceId(), characteristicCatalogRefId("spellcasting_ability"), [
        {
          id: modId("psionic_ability"),
          type: "spellcasting_ability",
          ability,
          label: `${abilityLabel} psionic ability`,
        },
      ]),
    )
  }
  if (!hasCustomSkill) {
    nextMods.push(
      charInstance(createModifierInstanceId(), characteristicCatalogRefId("custom_skill"), [
        {
          id: modId("psionics_skill"),
          type: "custom_skill",
          name: "Psionics",
          ability: ability ?? "intelligence",
          expertise: false,
          label: "Psionics skill",
        },
      ]),
    )
  }

  return syncModifierRefs({
    ...feature,
    linkedModifiers: nextMods,
  })
}

function enrichInnatePsionicAbilityFeature(feature: Feature, className: string): Feature {
  const name = feature.name.trim()
  const isInnateAbility = /^innate\s+psionic\s+ability/i.test(name)
  const isInnatePsionics = /^innate\s+psionics$/i.test(name)
  if (!isInnateAbility && !isInnatePsionics) return feature

  const spellLevelMatch =
    feature.name.match(/\((\d+)(?:st|nd|rd|th)\s+level\)/i) ??
    feature.description.match(/\b(\d+)(?:st|nd|rd|th)-level\s+spell\b/i)
  const spellLevel = spellLevelMatch ? parseInt(spellLevelMatch[1], 10) : null
  if (isInnateAbility && (!spellLevel || !Number.isFinite(spellLevel))) return feature

  const hasSpellsKnown = (feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => char.type === "spells_known"),
  )
  const hasUses = (feature.linkedModifiers ?? []).some((mod) =>
    mod.characteristics?.some((char) => char.type === "uses"),
  )
  if (hasSpellsKnown && (hasUses || isInnatePsionics)) return feature

  const classLevel = feature.level ?? 1
  const nextMods = [...(feature.linkedModifiers ?? [])]
  const label = isInnateAbility
    ? `Innate Psionic Ability (${spellLevel}${ordinalSuffix(spellLevel!)})`
    : "Innate Psionics"

  if (!hasUses && isInnateAbility) {
    nextMods.push(
      charInstance(createModifierInstanceId(), characteristicCatalogRefId("uses"), [
        {
          id: modId(`innate_psionic_${spellLevel}_uses`),
          type: "uses",
          uses: { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
          label,
        },
      ]),
    )
  }

  if (!hasSpellsKnown) {
    const namedSpells = (feature.choices?.options ?? [])
      .map((option) => option.name.trim())
      .filter(Boolean)
      .map((spellName) => ({
        spellId: spellNamePlaceholder(spellName),
        alwaysPrepared: true,
      }))

    const choiceCount = feature.choices?.count ?? (namedSpells.length > 0 ? namedSpells.length : 1)
    const grantLevel =
      spellLevel && Number.isFinite(spellLevel)
        ? spellLevel
        : /\bcantrip/i.test(feature.description)
          ? 0
          : 1

    nextMods.push(
      charInstance(createModifierInstanceId(), characteristicCatalogRefId("spells_known"), [
        {
          id: modId(`innate_psionic_${spellLevel ?? classLevel}_spell`),
          type: "spells_known",
          spells: namedSpells,
          choiceGrants: namedSpells.length
            ? []
            : [
                {
                  level: grantLevel,
                  count: choiceCount,
                  unlocksAtClassLevel: classLevel,
                },
              ],
          spellListClassOptions: [className || "Psion"],
          label,
        },
      ]),
    )
  }

  return syncModifierRefs({
    ...feature,
    isChoice: false,
    choices: undefined,
    linkedModifiers: nextMods,
  })
}

function ordinalSuffix(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return "th"
  switch (n % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

function enrichFeatureChoices(
  feature: Feature,
  content: ImportContent,
  className = "",
): Feature {
  let next = fillChoiceOptionPrerequisites(feature)
  next = enrichKnacksFeature(next)
  next = enrichDanceStylesFeature(next)
  next = enrichUpgradesFeature(next)
  next = enrichBombFormulasFeature(next)
  next = enrichDiscoveriesFeature(next)
  next = enrichPsionicPoolFeature(next)
  next = enrichPsionicsAbilityFeature(next)
  next = enrichInnatePsionicAbilityFeature(next, className)

  if (next.isChoice && (next.choices?.options?.length ?? 0) > 0) {
    const picker = buildChoiceOptionPicker(next)
    if (picker) {
      next = syncModifierRefs({
        ...next,
        linkedModifiers: [...(next.linkedModifiers ?? []), picker],
      })
    }
  }

  if (/^grand hex$/i.test(feature.name.trim())) {
    const grandHexOptions = ((content as ImportContentWithAbilities).abilities ?? [])
      .filter(
        (ability: { source_name?: string | null; level_requirement?: number | null; name: string }) =>
          /witch/i.test(ability.source_name ?? "") &&
          (ability.level_requirement ?? 0) >= 11 &&
          !/creature form/i.test(ability.name),
      )
      .map((ability: { name: string; description: string }) => ({ name: ability.name, description: ability.description }))
    if (grandHexOptions.length) {
      next = syncModifierRefs({
        ...next,
        linkedModifiers: [
          ...(next.linkedModifiers ?? []),
          buildGrandHexPicker(feature, grandHexOptions),
        ],
      })
    }
  }

  if (/^hexes$/i.test(feature.name.trim())) {
    next = syncModifierRefs({
      ...next,
      linkedModifiers: [...(next.linkedModifiers ?? []), buildHexesResourcePicker(feature)],
    })
  }

  if (/^weapon mastery$/i.test(feature.name.trim())) {
    if (!(next.linkedModifiers?.length ?? 0)) {
      next = syncModifierRefs({
        ...next,
        linkedModifiers: [buildWeaponMasteryModifier(createModifierInstanceId())],
      })
    }
    next = enrichWeaponMasteryFeature(migrateFeatureOptionPickers(next), className)
  }

  if (/^inventor specialization$/i.test(feature.name.trim()) && !(feature.isChoice && feature.choices?.options?.length)) {
    const picker = buildInventorSpecializationPicker(feature.description ?? "")
    if (picker) {
      next = syncModifierRefs({
        ...next,
        linkedModifiers: [...(next.linkedModifiers ?? []), picker],
      })
    }
  }

  return next
}

type ClassSpellcastingContext = {
  primary_ability?: string[] | null
  spellcasting?: { ability?: string | null } | null
}

function enrichSpellcastingFeature(
  feature: Feature,
  classContext?: ClassSpellcastingContext,
): Feature {
  if (!/^spellcasting$/i.test(feature.name.trim())) return feature
  if ((feature.linkedModifiers?.length ?? 0) > 0) return feature

  const abilityMatch = (feature.description ?? "").match(
    /\b(Charisma|Intelligence|Wisdom|Strength|Dexterity|Constitution)\b\s+is\s+your\s+spellcasting\s+ability/i,
  )
  const abilityFromText = abilityMatch ? parseAbilityWord(abilityMatch[1]) : null
  const abilityFromClass =
    parseAbilityWord(classContext?.spellcasting?.ability ?? "") ??
    parseAbilityWord(classContext?.primary_ability?.[0] ?? "")
  const ability = abilityFromText ?? abilityFromClass
  if (!ability) return feature

  const instanceId = createModifierInstanceId()
  const picker = charInstance(instanceId, characteristicCatalogRefId("spellcasting_ability"), [
    {
      id: modId("spellcasting_ability"),
      type: "spellcasting_ability",
      ability,
      label: `${abilityMatch?.[1] ?? classContext?.primary_ability?.[0] ?? ability} spellcasting`,
    },
  ])
  return syncModifierRefs({
    ...feature,
    linkedModifiers: [picker],
  })
}

/** Wire isChoice pickers, Grand Hex menus, and named feature presets on import content. */
export function enrichImportChoiceFeatures(content: ImportContent): ImportContent {
  const next: ImportContent = { ...content }

  if (content.classes?.length) {
    next.classes = content.classes.map((cls) => {
      const features = (cls.features ?? []).map((feature) =>
        enrichSpellcastingFeature(
          enrichFeatureChoices(feature as Feature, content, cls.name),
          {
            primary_ability: cls.primary_ability,
            spellcasting: cls.spellcasting as ClassSpellcastingContext["spellcasting"],
          },
        ),
      )
      const skill_choices = resolveClassSkillChoices(cls.skill_choices, [
        cls.description,
        features.map((feature) => feature.description ?? "").join("\n"),
      ])
      return {
        ...cls,
        ...(skill_choices ? { skill_choices } : {}),
        features,
      }
    }) as unknown as ImportContent["classes"]
  }

  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((subclass) => ({
      ...subclass,
      features: (subclass.features ?? []).map((feature) =>
        enrichFeatureChoices(feature as Feature, content),
      ),
    })) as unknown as ImportContent["subclasses"]
  }

  return next as unknown as ImportContent
}
