import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { HitDicePoolEntry } from "@/lib/character/hit-dice"
import type { DerivedCharacter, WeaponAttackDerived } from "@/lib/character/types"
import type {
  Background,
  Character,
  DndClass,
  Equipment,
  Feat,
  Feature,
  Species,
  Spell,
  Subclass,
} from "@/lib/types"

import type {
  SheetPdfCharacterInput,
  SheetPdfCurrency,
  SheetPdfFeature,
  SheetPdfMagicItem,
  SheetPdfSpell,
  SheetPdfWeapon,
} from "./sheet-field-values"
import type { SheetTemplateTarget } from "./template-matching"

/** The character row as the sheet loads it, with compendium relations attached. */
export type SheetPdfCharacter = Character & {
  classes?: DndClass
  species?: Species
  backgrounds?: Background
  subclasses?: Subclass
}

export type SheetPdfSourceData = {
  character: SheetPdfCharacter
  derived: DerivedCharacter
  classDetails: CharacterClassDetail[]
  weaponCards: { weapon: Equipment; attack: WeaponAttackDerived }[]
  spells: Spell[]
  classFeatures: Feature[]
  equipment: Equipment[]
  equipmentQuantity: (equipmentId: string) => number
  feats: Feat[]
  hp: { current: number; temp: number; max: number }
  hitDicePool: HitDicePoolEntry[]
}

function isMagicItem(item: Equipment): boolean {
  return Boolean(item.rarity || item.magic_item_category || item.requires_attunement)
}

function firstSentence(text: string | null | undefined, maxLength = 120): string | null {
  if (!text) return null
  const stripped = text.replace(/\s+/g, " ").trim()
  if (!stripped) return null
  const sentence = stripped.split(/(?<=[.!?])\s/)[0] ?? stripped
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1)}…` : sentence
}

function spellIsAttackOrSave(spell: Spell): boolean {
  const text = `${spell.description ?? ""}`.toLowerCase()
  return (
    text.includes("spell attack") ||
    text.includes("ranged attack") ||
    text.includes("melee attack") ||
    text.includes("saving throw")
  )
}

function spellSaveLabel(spell: Spell): string | null {
  const match = spell.description?.match(
    /(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving throw/i,
  )
  if (!match) return null
  return `${match[1].slice(0, 3).toUpperCase()} save`
}

/** Hit dice for the sheet's single "d8 / 3 of 5" block: the largest pool wins. */
function summarizeHitDice(pool: HitDicePoolEntry[]): { total: number; used: number; die: string | null } {
  if (pool.length === 0) return { total: 0, used: 0, die: null }
  const total = pool.reduce((sum, entry) => sum + entry.total, 0)
  const used = pool.reduce((sum, entry) => sum + entry.spent, 0)
  const dice = [...new Set(pool.map((entry) => `d${entry.die}`))]
  return { total, used, die: dice.join("/") }
}

export function buildSheetPdfInput(source: SheetPdfSourceData): SheetPdfCharacterInput {
  const { character, derived, classDetails } = source

  const className =
    classDetails.map((entry) => entry.class?.name).filter(Boolean).join(" / ") ||
    character.classes?.name ||
    ""
  const subclassName =
    classDetails.map((entry) => entry.subclass?.name).filter(Boolean).join(" / ") ||
    character.subclasses?.name ||
    null

  const weapons: SheetPdfWeapon[] = source.weaponCards.map((card) => ({
    name: card.weapon.name,
    attackBonus: card.attack.attackBonus,
    damage: card.attack.damageDisplay,
  }))

  const spells: SheetPdfSpell[] = source.spells.map((spell) => ({
    name: spell.name,
    level: spell.level,
    prepared: true,
    ritual: spell.ritual,
    concentration: spell.concentration,
    castingTime: spell.casting_time,
    range: spell.range,
    effect: firstSentence(spell.description, 90),
    isAttack: spellIsAttackOrSave(spell),
    save: spellSaveLabel(spell),
  }))

  const features: SheetPdfFeature[] = source.classFeatures.map((feature) => ({
    name: feature.name,
    level: feature.level ?? null,
    text: firstSentence(feature.description, 160),
  }))

  const attunedIds = new Set(character.attuned_item_ids ?? [])
  const magicItems: SheetPdfMagicItem[] = source.equipment
    .filter(isMagicItem)
    .map((item) => ({
      name: item.name,
      effect: firstSentence(item.description, 80),
      attuned: attunedIds.has(item.id),
    }))

  const equipmentLines = source.equipment.map((item) => {
    const quantity = source.equipmentQuantity(item.id)
    return quantity > 1 ? `${item.name} x${quantity}` : item.name
  })

  const currency: SheetPdfCurrency = {}
  if (typeof character.gold === "number" && character.gold > 0) currency.gp = character.gold

  return {
    name: character.name,
    level: character.level,
    experience: character.experience,
    className,
    subclassName,
    speciesName: character.species?.name ?? null,
    backgroundName: character.backgrounds?.name ?? null,
    alignment: character.alignment,
    size: character.size ?? character.species?.size ?? null,
    appearance: character.appearance,
    personalityTraits: character.personality_traits,
    ideals: character.ideals,
    bonds: character.bonds,
    flaws: character.flaws,
    backstory: character.backstory,
    derived,
    hp: source.hp,
    hitDice: summarizeHitDice(source.hitDicePool),
    weapons,
    spells,
    features,
    equipmentLines,
    magicItems,
    currency,
    featNames: source.feats.map((feat) => feat.name),
    speciesTraitNames: (character.species?.traits ?? []).map((trait) => trait.name),
  }
}

/** Which template family suits this character (class sheet, caster, martial, …). */
export function buildSheetTemplateTarget(
  classDetails: CharacterClassDetail[],
  derived: DerivedCharacter | null,
): SheetTemplateTarget {
  const classNames = classDetails
    .map((entry) => entry.class?.name)
    .filter((name): name is string => Boolean(name))
  const progressions = classDetails
    .map((entry) => entry.class?.spellcasting?.caster_progression)
    .filter(Boolean)
  return {
    classNames,
    isSpellcaster: (derived?.spellcasting?.length ?? 0) > 0 || progressions.length > 0,
    isHalfCaster:
      progressions.length > 0 && progressions.every((p) => p === "half" || p === "third"),
  }
}
