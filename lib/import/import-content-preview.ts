import type { ImportContent, PrerequisiteRule } from "@/lib/import/content-schema"
import { formatEquipmentCost } from "@/lib/compendium/equipment-display"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import type { Equipment } from "@/lib/types"

export type ImportContentPreviewDetail = {
  label: string
  value: string
}

export type ImportContentPreviewItem = {
  id: string
  name: string
  details: ImportContentPreviewDetail[]
  badges: string[]
  descriptionSnippet?: string
}

export type ImportContentPreviewSection = {
  key: string
  label: string
  items: ImportContentPreviewItem[]
}

const PREVIEW_LIMIT = 16

function snippet(text: string | null | undefined, max = 200): string | undefined {
  if (!text?.trim()) return undefined
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return undefined
  return plain.length <= max ? plain : `${plain.slice(0, max - 1)}…`
}

function spellLevelLabel(level: number): string {
  if (level === 0) return "Cantrip"
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"
  return `${level}${suffix}`
}

function formatPrerequisiteRule(rule: PrerequisiteRule): { label: string; value: string } {
  if (rule.category === "armor_training") {
    return { label: "Armor training", value: rule.value }
  }
  if (rule.category === "ability_score") {
    const abilities = rule.abilities
      .map((ability) => ability.charAt(0).toUpperCase() + ability.slice(1))
      .join(" or ")
    return { label: "Ability score", value: `${abilities} ${rule.minimum}+` }
  }
  return { label: "Other prerequisite", value: rule.value }
}

function appendPrerequisiteRules(
  details: ImportContentPreviewDetail[],
  row: { prerequisite_rules?: PrerequisiteRule[] | null },
): void {
  for (const rule of row.prerequisite_rules ?? []) {
    details.push(formatPrerequisiteRule(rule))
  }
}

function previewSpells(content: ImportContent): ImportContentPreviewSection | null {
  const spells = content.spells
  if (!spells?.length) return null

  const items = [...spells]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((spell) => {
      const details: ImportContentPreviewDetail[] = [
        { label: "Level", value: spellLevelLabel(spell.level) },
        { label: "School", value: spell.school },
      ]
      if (spell.casting_time) details.push({ label: "Casting time", value: spell.casting_time })
      if (spell.range) details.push({ label: "Range", value: spell.range })
      if (spell.duration) details.push({ label: "Duration", value: spell.duration })
      if (spell.components?.length) {
        details.push({ label: "Components", value: spell.components.join(", ") })
      }
      if (spell.classes?.length) {
        details.push({ label: "Classes", value: spell.classes.join(", ") })
      }
      appendPrerequisiteRules(details, spell)

      const augments = spell.psionic_augments as { augments?: unknown[] } | null | undefined
      const badges: string[] = []
      if (spell.concentration) badges.push("Concentration")
      if (augments?.augments?.length) {
        badges.push(`${augments.augments.length} psi augment${augments.augments.length === 1 ? "" : "s"}`)
      }

      return {
        id: `spell:${spell.name}`,
        name: spell.name,
        details,
        badges,
        descriptionSnippet: snippet(spell.description),
      }
    })

  return { key: "spells", label: "Spells", items }
}

function previewEquipment(content: ImportContent): ImportContentPreviewSection | null {
  const equipment = content.equipment
  if (!equipment?.length) return null

  const items = [...equipment]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => {
      const item = row as Equipment & {
        magic_effects?: unknown[]
        linkedModifiers?: unknown[]
      }
      const details: ImportContentPreviewDetail[] = []
      if (item.category) details.push({ label: "Category", value: item.category })
      if (item.subcategory) details.push({ label: "Type", value: item.subcategory })
      if (item.magic_item_category) {
        details.push({ label: "Magic type", value: item.magic_item_category })
      }
      if (item.rarity) details.push({ label: "Rarity", value: item.rarity })
      if (item.requires_attunement != null) {
        details.push({
          label: "Attunement",
          value: item.requires_attunement ? "Required" : "Not required",
        })
      }
      const cost = formatEquipmentCost(item.cost)
      if (cost) details.push({ label: "Cost", value: cost })
      else if (isMagicItem(item)) details.push({ label: "Cost", value: "N/A" })
      if (item.weight != null) details.push({ label: "Weight", value: `${item.weight} lb.` })
      appendPrerequisiteRules(details, item)

      const magicEffectCount =
        (Array.isArray(item.magic_effects) ? item.magic_effects.length : 0) +
        (Array.isArray(item.linkedModifiers) ? item.linkedModifiers.length : 0)
      if (magicEffectCount > 0) {
        details.push({
          label: "Magic effects",
          value: `${magicEffectCount} wired`,
        })
      }

      const badges: string[] = []
      if (isMagicItem(item)) badges.push("Magic item")

      return {
        id: `equipment:${item.name}`,
        name: item.name,
        details,
        badges,
        descriptionSnippet: snippet(item.description),
      }
    })

  return { key: "equipment", label: "Equipment & magic items", items }
}

function previewClasses(content: ImportContent): ImportContentPreviewSection | null {
  const classes = content.classes
  if (!classes?.length) return null

  const items = classes.map((row) => {
    const details: ImportContentPreviewDetail[] = [
      { label: "Hit die", value: `d${row.hit_die}` },
    ]
    if (row.primary_ability?.length) {
      details.push({ label: "Primary", value: row.primary_ability.join(", ") })
    }
    if (row.saving_throws?.length) {
      details.push({ label: "Saves", value: row.saving_throws.join(", ") })
    }
    const featureCount = row.features?.length ?? 0
    if (featureCount > 0) {
      details.push({
        label: "Features",
        value: `${featureCount} feature${featureCount === 1 ? "" : "s"}`,
      })
    }
    appendPrerequisiteRules(details, row)
    const badges: string[] = []
    if (row.spellcasting?.ability) badges.push("Spellcasting")
    if (row.complexity) badges.push(row.complexity)

    return {
      id: `class:${row.name}`,
      name: row.name,
      details,
      badges,
      descriptionSnippet: snippet(row.description),
    }
  })

  return { key: "classes", label: "Classes", items }
}

function previewSubclasses(content: ImportContent): ImportContentPreviewSection | null {
  const subclasses = content.subclasses
  if (!subclasses?.length) return null

  const items = [...subclasses]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => {
      const details: ImportContentPreviewDetail[] = [
        { label: "Class", value: row.class_name },
      ]
      const featureCount = row.features?.length ?? 0
      if (featureCount > 0) {
        details.push({
          label: "Features",
          value: `${featureCount} feature${featureCount === 1 ? "" : "s"}`,
        })
      }
      appendPrerequisiteRules(details, row)

      return {
        id: `subclass:${row.class_name}:${row.name}`,
        name: row.name,
        details,
        badges: [],
        descriptionSnippet: snippet(row.description),
      }
    })

  return { key: "subclasses", label: "Subclasses", items }
}

function previewFeats(content: ImportContent): ImportContentPreviewSection | null {
  const feats = content.feats
  if (!feats?.length) return null

  const items = [...feats]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((feat) => {
      const details: ImportContentPreviewDetail[] = []
      if (feat.category) details.push({ label: "Category", value: feat.category })
      if (feat.prerequisite) details.push({ label: "Prerequisite", value: feat.prerequisite })
      appendPrerequisiteRules(details, feat)
      if ((feat.level_requirement ?? 0) > 1) {
        details.push({ label: "Level", value: `${feat.level_requirement}+` })
      }
      const mechanics = feat.mechanics?.length ?? 0
      const linked = (feat as { linkedModifiers?: unknown[] }).linkedModifiers?.length ?? 0
      if (mechanics > 0 || linked > 0) {
        details.push({
          label: "Modifiers",
          value: `${mechanics + linked} linked`,
        })
      }

      return {
        id: `feat:${feat.name}`,
        name: feat.name,
        details,
        badges: [],
        descriptionSnippet: snippet(feat.description),
      }
    })

  return { key: "feats", label: "Feats", items }
}

function previewCreatures(content: ImportContent): ImportContentPreviewSection | null {
  const creatures = content.creatures
  if (!creatures?.length) return null

  const items = [...creatures]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((creature) => {
      const details: ImportContentPreviewDetail[] = []
      if (creature.creature_type) details.push({ label: "Type", value: creature.creature_type })
      if (creature.size) details.push({ label: "Size", value: creature.size })
      if ("category" in creature && creature.category) {
        details.push({
          label: "Category",
          value: creature.category === "companion" ? "Companion" : "Creature",
        })
      }
      if (creature.cr) details.push({ label: "CR", value: creature.cr })
      if (creature.alignment) details.push({ label: "Alignment", value: creature.alignment })
      appendPrerequisiteRules(details, creature)

      return {
        id: `creature:${creature.name}`,
        name: creature.name,
        details,
        badges: [
          ...("category" in creature && creature.category === "companion" ? ["Companion"] : []),
          ...(creature.cr ? [`CR ${creature.cr}`] : []),
        ],
        descriptionSnippet: snippet(creature.description),
      }
    })

  return { key: "creatures", label: "Creatures & Companions", items }
}

function previewSpecies(content: ImportContent): ImportContentPreviewSection | null {
  const species = content.species
  if (!species?.length) return null

  const items = species.map((row) => ({
    id: `species:${row.name}`,
    name: row.name,
    details: [
      { label: "Size", value: row.size },
      { label: "Speed", value: `${row.speed} ft.` },
      { label: "Traits", value: String(row.traits?.length ?? 0) },
      ...(row.prerequisite_rules ?? []).map((rule) => formatPrerequisiteRule(rule)),
    ],
    badges: [],
    descriptionSnippet: snippet(row.description),
  }))

  return { key: "species", label: "Species", items: items as ImportContentPreviewItem[] }
}

function previewBackgrounds(content: ImportContent): ImportContentPreviewSection | null {
  const backgrounds = content.backgrounds
  if (!backgrounds?.length) return null

  const items = backgrounds.map((row) => {
    const details: ImportContentPreviewDetail[] = []
    if (row.skill_proficiencies?.length) {
      details.push({ label: "Skills", value: row.skill_proficiencies.join(", ") })
    }
    if (row.feat_granted) details.push({ label: "Feat", value: row.feat_granted })
    appendPrerequisiteRules(details, row)
    return {
      id: `background:${row.name}`,
      name: row.name,
      details,
      badges: [],
      descriptionSnippet: snippet(row.description),
    }
  })

  return { key: "backgrounds", label: "Backgrounds", items }
}

/** Structured preview rows in staged-import order. */
export function collectImportContentPreview(
  content: ImportContent,
  options?: { sectionKeys?: readonly string[] },
): ImportContentPreviewSection[] {
  const sections = [
    previewClasses(content),
    previewSpecies(content),
    previewBackgrounds(content),
    previewSubclasses(content),
    previewFeats(content),
    previewCreatures(content),
    previewSpells(content),
    previewEquipment(content),
  ].filter((section): section is ImportContentPreviewSection => section != null)

  if (!options?.sectionKeys) return sections
  const allowed = new Set(options.sectionKeys)
  return sections.filter((section) => allowed.has(section.key))
}

export function importContentPreviewLimit(): number {
  return PREVIEW_LIMIT
}
