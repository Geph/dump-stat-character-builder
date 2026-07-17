import type { CreatureAbilityEntry, CreatureImportV2 } from "@/lib/import/creature-import-v2-schema"
import { cleanFoundryHtml } from "@/lib/import/foundry-html"

type FoundryDoc = Record<string, unknown>

const SIZE_NAMES: Record<string, string> = {
  tiny: "Tiny",
  sm: "Small",
  med: "Medium",
  lg: "Large",
  huge: "Huge",
  grg: "Gargantuan",
}

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const

const SKILL_NAMES: Record<string, string> = {
  acr: "Acrobatics",
  ani: "Animal Handling",
  arc: "Arcana",
  ath: "Athletics",
  dec: "Deception",
  his: "History",
  ins: "Insight",
  itm: "Intimidation",
  inv: "Investigation",
  med: "Medicine",
  nat: "Nature",
  prc: "Perception",
  prf: "Performance",
  per: "Persuasion",
  rel: "Religion",
  slt: "Sleight of Hand",
  ste: "Stealth",
  sur: "Survival",
}

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  acid: "Acid",
  bludgeoning: "Bludgeoning",
  cold: "Cold",
  fire: "Fire",
  force: "Force",
  lightning: "Lightning",
  necrotic: "Necrotic",
  piercing: "Piercing",
  poison: "Poison",
  psychic: "Psychic",
  radiant: "Radiant",
  slashing: "Slashing",
  thunder: "Thunder",
}

const CONDITION_LABELS: Record<string, string> = {
  blinded: "Blinded",
  charmed: "Charmed",
  deafened: "Deafened",
  exhaustion: "Exhaustion",
  frightened: "Frightened",
  grappled: "Grappled",
  incapacitated: "Incapacitated",
  invisible: "Invisible",
  paralyzed: "Paralyzed",
  petrified: "Petrified",
  poisoned: "Poisoned",
  prone: "Prone",
  restrained: "Restrained",
  stunned: "Stunned",
  unconscious: "Unconscious",
}

const LANGUAGE_LABELS: Record<string, string> = {
  common: "Common",
  dwarvish: "Dwarvish",
  elvish: "Elvish",
  giant: "Giant",
  gnomish: "Gnomish",
  goblin: "Goblin",
  halfling: "Halfling",
  orc: "Orc",
  abyssal: "Abyssal",
  celestial: "Celestial",
  draconic: "Draconic",
  deep: "Deep Speech",
  infernal: "Infernal",
  primordial: "Primordial",
  sylvan: "Sylvan",
  undercommon: "Undercommon",
  aquan: "Aquan",
  auran: "Auran",
  ignan: "Ignan",
  terran: "Terran",
  druidic: "Druidic",
  thieves: "Thieves' Cant",
}

/** Official CR → XP table (5e). */
const CR_XP: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
}

function asRecord(value: unknown): FoundryDoc {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as FoundryDoc)
    : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }
  // Foundry sometimes serializes Sets as { "0": "fire", ... }
  const record = asRecord(value)
  const keys = Object.keys(record)
  if (keys.length && keys.every((key) => /^\d+$/.test(key))) {
    return keys
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => asString(record[key]))
      .filter(Boolean)
  }
  return []
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

function formatCr(cr: number | string | null | undefined): string | null {
  if (cr == null || cr === "") return null
  if (typeof cr === "string") {
    const trimmed = cr.trim()
    if (!trimmed || /^none$/i.test(trimmed)) return null
    const asNum = Number(trimmed)
    if (Number.isFinite(asNum)) return formatCr(asNum)
    return trimmed
  }
  if (cr === 0) return "0"
  if (cr === 0.125) return "1/8"
  if (cr === 0.25) return "1/4"
  if (cr === 0.5) return "1/2"
  if (Number.isInteger(cr)) return String(cr)
  return String(cr)
}

function proficiencyFromCr(crLabel: string | null): number {
  if (!crLabel) return 2
  const n = crLabel.includes("/")
    ? Number(crLabel.split("/")[0]) / Number(crLabel.split("/")[1])
    : Number(crLabel)
  if (!Number.isFinite(n) || n <= 0) return 2
  if (n <= 4) return 2
  if (n <= 8) return 3
  if (n <= 12) return 4
  if (n <= 16) return 5
  if (n <= 20) return 6
  if (n <= 24) return 7
  if (n <= 28) return 8
  return 9
}

function formatTraitList(
  trait: FoundryDoc,
  labels: Record<string, string>,
): string | null {
  const values = asStringArray(trait.value).map((code) => {
    const key = code.toLowerCase()
    return labels[key] ?? titleCase(code)
  })
  const custom = asString(trait.custom).trim()
  const parts = [...values]
  if (custom) {
    parts.push(
      ...custom
        .split(/[;]/)
        .map((part) => part.trim())
        .filter(Boolean),
    )
  }
  return parts.length ? parts.join(", ") : null
}

function formatCreatureType(details: FoundryDoc): string {
  const type = asRecord(details.type)
  const value = asString(type.value)
  const subtype = asString(type.subtype)
  const custom = asString(type.custom)
  const swarm = asString(type.swarm)
  const base = custom || (value ? titleCase(value) : "Unknown")
  if (swarm) return `Swarm of ${titleCase(swarm)} ${base}`
  if (subtype) return `${base} (${titleCase(subtype)})`
  return base || "Unknown"
}

function formatSize(traits: FoundryDoc): string {
  const size = asString(traits.size).toLowerCase()
  return SIZE_NAMES[size] ?? (size ? titleCase(size) : "Medium")
}

function senseDistance(value: unknown): number | null {
  const n = asNumber(value)
  return n != null && n > 0 ? n : null
}

function firstActivityActivation(system: FoundryDoc): string {
  const activation = asRecord(system.activation)
  let type = asString(activation.type)
  if (type) return type.toLowerCase()

  const activities = asRecord(system.activities)
  for (const key of Object.keys(activities)) {
    const activity = asRecord(activities[key])
    const actActivation = asRecord(activity.activation)
    type = asString(actActivation.type)
    if (type) return type.toLowerCase()
  }
  return ""
}

function formatUsesTag(system: FoundryDoc): string | null {
  const uses = asRecord(system.uses)
  const max = asString(uses.max) || (asNumber(uses.max) != null ? String(uses.max) : "")
  const per = asString(uses.per).toLowerCase()
  if (!max || !per) return null
  const perLabel: Record<string, string> = {
    day: "Day",
    sr: "Short Rest",
    lr: "Long Rest",
    charges: "Charges",
    encounter: "Encounter",
  }
  return `${max}/${perLabel[per] ?? titleCase(per)}`
}

function itemDescription(item: FoundryDoc): string {
  const system = asRecord(item.system)
  const description = asRecord(system.description)
  const cleaned = cleanFoundryHtml(description.value || description.chat)
  if (cleaned) {
    return cleaned.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  }

  // Fallback for weapons: build a short attack line from damage parts when present.
  const damage = asRecord(system.damage)
  const parts = asArray(damage.parts)
  if (parts.length) {
    const rendered = parts
      .map((part) => {
        if (!Array.isArray(part)) return null
        const formula = asString(part[0])
        const dtype = asString(part[1])
        if (!formula) return null
        const label = DAMAGE_TYPE_LABELS[dtype.toLowerCase()] ?? (dtype ? titleCase(dtype) : "damage")
        return `${formula} ${label}`
      })
      .filter(Boolean)
    if (rendered.length) return `Hit: ${rendered.join(" plus ")}.`
  }

  const base = asRecord(damage.base)
  const number = asNumber(base.number)
  const denomination = asNumber(base.denomination)
  const types = asStringArray(base.types)
  if (number != null && denomination != null) {
    const label = types[0]
      ? DAMAGE_TYPE_LABELS[types[0].toLowerCase()] ?? titleCase(types[0])
      : "damage"
    return `Hit: ${number}d${denomination} ${label} damage.`
  }

  return ""
}

function mapEmbeddedAbility(item: FoundryDoc): {
  bucket: "traits" | "actions" | "bonus_actions" | "reactions" | "legendary_actions"
  entry: CreatureAbilityEntry
} {
  const system = asRecord(item.system)
  const activation = firstActivityActivation(system)
  const entry: CreatureAbilityEntry = {
    unlock_level_label: null,
    unlock_level_number: null,
    name: asString(item.name) || "Unnamed",
    tag: formatUsesTag(system),
    text: itemDescription(item),
  }

  if (activation === "bonus") return { bucket: "bonus_actions", entry }
  if (activation === "reaction") return { bucket: "reactions", entry }
  if (activation === "legendary") return { bucket: "legendary_actions", entry }
  if (activation === "action" || asString(item.type) === "weapon") {
    return { bucket: "actions", entry }
  }
  // Passive feats / features / spells without an action cost → traits.
  if (!activation || activation === "none" || activation === "special" || activation === "passive") {
    return { bucket: "traits", entry }
  }
  return { bucket: "actions", entry }
}

function actorTextBlob(actor: FoundryDoc): string {
  return JSON.stringify(actor).toLowerCase()
}

/**
 * Detect owner-scaled companion sheets vs fixed-CR creatures.
 * Foundry has no dedicated "companion" actor type — we infer from naming,
 * missing CR, and owner-level / caregiver formula references.
 */
export function isFoundryCompanionActor(actor: FoundryDoc): boolean {
  const name = asString(actor.name)
  if (/\b(companion|familiar|steed|mount|pet|retainer)\b/i.test(name)) return true

  const system = asRecord(actor.system)
  const details = asRecord(system.details)
  const cr = details.cr
  const crMissing = cr == null || cr === "" || (typeof cr === "string" && /^none$/i.test(cr))

  const blob = actorTextBlob(actor)
  const hasOwnerScale =
    /@classes\.[a-z0-9_-]+\.levels/i.test(blob) ||
    /@details\.level\b/i.test(blob) ||
    /caregiver|summoner|owner'?s level|your (?:level|proficiency)|scales with/i.test(blob)

  if (crMissing && hasOwnerScale) return true
  if (hasOwnerScale && /\b(companion|familiar|summon)\b/i.test(blob)) return true
  return false
}

function buildSkillsLine(
  skills: FoundryDoc,
  abilities: FoundryDoc,
  proficiencyBonus: number,
): string | null {
  const parts: string[] = []
  for (const [code, skill] of Object.entries(skills)) {
    const row = asRecord(skill)
    const value = asNumber(row.value) ?? 0
    if (value <= 0) continue
    const abilityCode = asString(row.ability) || "dex"
    const ability = asRecord(abilities[abilityCode])
    const score = asNumber(ability.value) ?? 10
    const mod = abilityMod(score)
    const bonus = mod + Math.floor(proficiencyBonus * value)
    const label = SKILL_NAMES[code.toLowerCase()] ?? titleCase(code)
    parts.push(`${label} ${formatSigned(bonus)}`)
  }
  return parts.length ? parts.join(", ") : null
}

function buildGear(items: FoundryDoc[]): string | null {
  const gear = items
    .filter((item) => {
      const type = asString(item.type).toLowerCase()
      return type === "equipment" || type === "consumable" || type === "tool" || type === "loot" || type === "container" || type === "backpack"
    })
    .map((item) => asString(item.name))
    .filter(Boolean)
  return gear.length ? gear.join(", ") : null
}

function buildProseDescription(creature: Omit<CreatureImportV2, "description">): string {
  const lines = [
    creature.name,
    `${creature.size} ${creature.creature_type}, ${creature.alignment}`,
    `AC ${creature.ac}${creature.ac_note ? ` (${creature.ac_note})` : ""}`,
    `HP ${creature.hp}${creature.hit_dice ? ` (${creature.hit_dice})` : ""}`,
  ]
  const speedParts: string[] = []
  if (creature.speed.walk != null) speedParts.push(`${creature.speed.walk} ft.`)
  if (creature.speed.fly != null) speedParts.push(`Fly ${creature.speed.fly} ft.`)
  if (creature.speed.swim != null) speedParts.push(`Swim ${creature.speed.swim} ft.`)
  if (creature.speed.climb != null) speedParts.push(`Climb ${creature.speed.climb} ft.`)
  if (creature.speed.burrow != null) speedParts.push(`Burrow ${creature.speed.burrow} ft.`)
  if (speedParts.length) lines.push(`Speed ${speedParts.join(", ")}`)
  if (creature.category === "companion" && creature.scaling) {
    lines.push(`Scales with ${creature.scaling.scales_with}. ${creature.scaling.notes}`.trim())
  } else if (creature.cr) {
    lines.push(`CR ${creature.cr}${creature.xp != null ? ` (${creature.xp} XP)` : ""}`)
  }
  return lines.join("\n")
}

/**
 * Map a Foundry dnd5e `npc` actor export into a CreatureImportV2 record.
 * Returns null when the document is not a usable NPC (missing name / system).
 */
export function mapFoundryNpcActorToCreature(actor: FoundryDoc): CreatureImportV2 | null {
  const name = asString(actor.name).trim()
  const system = asRecord(actor.system)
  if (!name || Object.keys(system).length === 0) return null

  const details = asRecord(system.details)
  const attributes = asRecord(system.attributes)
  const traits = asRecord(system.traits)
  const abilities = asRecord(system.abilities)
  const skills = asRecord(system.skills)
  const senses = asRecord(attributes.senses)
  const movement = asRecord(attributes.movement)
  const hp = asRecord(attributes.hp)
  const ac = asRecord(attributes.ac)
  const items = asArray(actor.items).map((entry) => asRecord(entry))

  const companion = isFoundryCompanionActor(actor)
  const crLabel = companion ? null : formatCr(details.cr as number | string | null | undefined)
  const xpFromDetails = asNumber(asRecord(details.xp).value)
  const proficiency =
    asNumber(attributes.prof) ?? (crLabel ? proficiencyFromCr(crLabel) : 2)

  const abilityScores = {
    str: { score: 10, mod: "+0", save: "+0" },
    dex: { score: 10, mod: "+0", save: "+0" },
    con: { score: 10, mod: "+0", save: "+0" },
    int: { score: 10, mod: "+0", save: "+0" },
    wis: { score: 10, mod: "+0", save: "+0" },
    cha: { score: 10, mod: "+0", save: "+0" },
  } as CreatureImportV2["ability_scores"]

  for (const key of ABILITY_KEYS) {
    const row = asRecord(abilities[key])
    const score = asNumber(row.value) ?? 10
    const mod = abilityMod(score)
    const saveBonus = asString(asRecord(row.bonuses).save).trim()
    const proficient = asNumber(row.proficient) ?? 0
    let save = formatSigned(mod + (proficient > 0 ? proficiency : 0))
    if (saveBonus) {
      // Keep Foundry formula text for companion-style saves (e.g. "+2 + @prof").
      if (saveBonus.includes("@") || /plus\s*pb/i.test(saveBonus) || /pb\b/i.test(saveBonus)) {
        save = `${formatSigned(mod)} ${saveBonus}`.replace(/\s+/g, " ").trim()
      }
    }
    abilityScores[key] = {
      score,
      mod: formatSigned(mod),
      save,
    }
  }

  const acFlat = asNumber(ac.flat)
  const acFormula = asString(ac.formula).trim()
  const acValue = asNumber(ac.value)
  let acText = ""
  if (acFormula && (companion || acFormula.includes("@"))) {
    acText = acFormula.replace(/@prof/gi, "PB")
  } else if (acFlat != null) {
    acText = String(acFlat)
  } else if (acValue != null) {
    acText = String(acValue)
  } else {
    acText = "10"
  }

  const hpMax = asNumber(hp.max) ?? asNumber(hp.value)
  const hpFormula = asString(hp.formula).trim()
  let hpText = hpMax != null ? String(hpMax) : "1"
  if (companion && hpFormula) {
    hpText = hpFormula
      .replace(/@details\.level/gi, "owner's level")
      .replace(/@classes\.[a-z0-9_-]+\.levels/gi, "owner's level")
      .replace(/@prof/gi, "PB")
  } else if (companion && /level|pb|proficiency/i.test(asString(hp.formula))) {
    hpText = hpFormula || hpText
  }

  const buckets: Record<
    "traits" | "actions" | "bonus_actions" | "reactions" | "legendary_actions",
    CreatureAbilityEntry[]
  > = {
    traits: [],
    actions: [],
    bonus_actions: [],
    reactions: [],
    legendary_actions: [],
  }

  for (const item of items) {
    const type = asString(item.type).toLowerCase()
    if (!type || type === "class" || type === "subclass" || type === "race" || type === "background") {
      continue
    }
    if (type === "equipment" || type === "consumable" || type === "tool" || type === "loot" || type === "container" || type === "backpack") {
      continue
    }
    const mapped = mapEmbeddedAbility(item)
    buckets[mapped.bucket].push(mapped.entry)
  }

  const dexMod = abilityMod(abilityScores.dex.score)
  const initBonus = asNumber(asRecord(attributes.init).bonus) ?? 0
  const initiativeMod = formatSigned(dexMod + initBonus)
  const initiativePassive = 10 + dexMod + initBonus

  const source = asRecord(details.source)
  const sourceLabel =
    asString(source.custom).trim() ||
    asString(source.book).trim() ||
    asString(source.value).trim() ||
    null

  const base: Omit<CreatureImportV2, "description"> = {
    name,
    creature_type: formatCreatureType(details),
    size: formatSize(traits),
    alignment: asString(details.alignment).trim() || "Unaligned",
    category: companion ? "companion" : "creature",
    cr: companion ? null : crLabel ?? "0",
    xp: companion ? null : xpFromDetails ?? (crLabel ? (CR_XP[crLabel] ?? null) : null),
    proficiency_bonus: companion ? null : formatSigned(proficiency),
    scaling: companion
      ? {
          scales_with: "owner's level",
          notes:
            "Imported from Foundry NPC. Proficiency Bonus and leveled stats may scale with the owning character.",
        }
      : null,
    ac: acText,
    ac_note: null,
    initiative_modifier: initiativeMod,
    initiative_passive: initiativePassive,
    hp: hpText,
    hit_dice: hpFormula || null,
    speed: {
      walk: asNumber(movement.walk),
      fly: asNumber(movement.fly),
      swim: asNumber(movement.swim),
      climb: asNumber(movement.climb),
      burrow: asNumber(movement.burrow),
      notes: asString(movement.hover) === "true" || movement.hover === true ? "hover" : null,
    },
    ability_scores: abilityScores,
    skills: buildSkillsLine(skills, abilities, proficiency),
    proficiencies: null,
    gear: buildGear(items),
    resistances: formatTraitList(asRecord(traits.dr), DAMAGE_TYPE_LABELS),
    damage_immunities: formatTraitList(asRecord(traits.di), DAMAGE_TYPE_LABELS),
    condition_immunities: formatTraitList(asRecord(traits.ci), CONDITION_LABELS),
    vulnerabilities: formatTraitList(asRecord(traits.dv), DAMAGE_TYPE_LABELS),
    senses: {
      darkvision: senseDistance(senses.darkvision),
      blindsight: senseDistance(senses.blindsight),
      tremorsense: senseDistance(senses.tremorsense),
      truesight: senseDistance(senses.truesight),
      passive_perception: (() => {
        const skill = asRecord(skills.prc)
        const value = asNumber(skill.value) ?? 0
        const wis = abilityScores.wis.score
        const bonus = abilityMod(wis) + Math.floor(proficiency * value)
        return 10 + bonus
      })(),
    },
    languages: formatTraitList(asRecord(traits.languages), LANGUAGE_LABELS),
    traits: buckets.traits.length ? buckets.traits : null,
    actions: buckets.actions.length ? buckets.actions : null,
    bonus_actions: buckets.bonus_actions.length ? buckets.bonus_actions : null,
    reactions: buckets.reactions.length ? buckets.reactions : null,
    legendary_actions: buckets.legendary_actions.length ? buckets.legendary_actions : null,
    source: sourceLabel,
  }

  return {
    ...base,
    description: buildProseDescription(base),
  }
}
