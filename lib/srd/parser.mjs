/**
 * Parses D&D 5.2.1 SRD markdown (from downfallx/dnd-5e-srd-markdown, CC-BY).
 * Source: official SRD PDF converted to structured markdown.
 */

import { formatFeatDescription } from "../compendium/feat-description.mjs"

const SOURCE = "D&D 5.5e SRD"

export function splitSections(md, level = 2) {
  const prefix = "#".repeat(level) + " "
  const parts = md.split(new RegExp(`^${prefix}`, "m"))
  const sections = []
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i]
    const nl = chunk.indexOf("\n")
    const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim()
    const body = (nl === -1 ? "" : chunk.slice(nl + 1)).trim()
    if (title) sections.push({ title, body })
  }
  return sections
}

function cap(str, max) {
  if (!str) return str
  return str.length <= max ? str : `${str.slice(0, max - 1).trim()}…`
}

function field(body, label) {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i")
  const m = body.match(re)
  return m ? m[1].trim() : null
}

function stripHtml(text) {
  return String(text)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .trim()
}

function parseHtmlTableRows(tableHtml) {
  const rows = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch
  while ((trMatch = trRe.exec(tableHtml))) {
    const cells = []
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch
    while ((cellMatch = cellRe.exec(trMatch[1]))) {
      cells.push(stripHtml(cellMatch[1]))
    }
    if (cells.length) rows.push(cells)
  }
  return rows
}

function traitTableFromBody(body) {
  const map = new Map()
  const tableMatch = body.match(/<table>[\s\S]*?<\/table>/i)
  if (tableMatch) {
    for (const row of parseHtmlTableRows(tableMatch[0])) {
      if (row.length >= 2) map.set(row[0].trim(), row[1].trim())
    }
  }
  const fallbackLabels = [
    "Primary Ability",
    "Hit Point Die",
    "Saving Throw Proficiencies",
    "Skill Proficiencies",
    "Armor Training",
    "Armor Proficiencies",
    "Weapon Proficiencies",
  ]
  for (const label of fallbackLabels) {
    const v = tableCell(body, label)
    if (v && !map.has(label)) map.set(label, v)
  }
  return map
}

function getTrait(map, ...labels) {
  for (const label of labels) {
    for (const [k, v] of map) {
      if (k.toLowerCase() === label.toLowerCase()) return v
    }
  }
  return null
}

function parseHitDie(raw) {
  if (!raw) return 8
  const m = raw.match(/D(\d+)/i) || raw.match(/\bd(\d+)\b/i)
  return m ? parseInt(m[1], 10) : 8
}

function parsePrimaryAbilities(raw) {
  if (!raw) return []
  return raw
    .split(/\s+or\s+|\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseSavingThrows(raw) {
  if (!raw) return []
  return raw.split(/\s+and\s+/).map((s) => s.trim()).filter(Boolean)
}

function mapArmorProficiencies(raw) {
  if (!raw) return []
  const lower = raw.toLowerCase()
  const out = []
  if (/\blight\b/.test(lower)) out.push("Light armor")
  if (/\bmedium\b/.test(lower)) out.push("Medium armor")
  if (/\bheavy\b/.test(lower)) out.push("Heavy armor")
  if (/shield/.test(lower)) out.push("Shields")
  return out
}

function mapWeaponProficiencies(raw) {
  if (!raw) return []
  const lower = raw.toLowerCase()
  const out = []
  if (/simple/.test(lower)) out.push("Simple weapons")
  if (/martial/.test(lower)) out.push("Martial weapons")
  return out
}

function normalizeSpeciesSize(raw) {
  const base = raw?.replace(/\s*\(.*$/, "").trim() || "Medium"
  const allowed = ["Small", "Medium", "Large", "Huge"]
  const found = allowed.find((a) => a.toLowerCase() === base.toLowerCase())
  if (found) return found
  if (/tiny/i.test(base)) return "Small"
  if (/gargantuan/i.test(base)) return "Huge"
  return "Medium"
}

function parseCreatureType(body) {
  const raw = field(body, "Creature Type")?.replace(/\*+/g, "").trim()
  if (!raw) return "Humanoid"
  const word = raw.match(/^([A-Za-z]+)/)?.[1]
  return word || "Humanoid"
}

function normalizeCastingTime(raw) {
  if (!raw) return null
  const m = raw.match(
    /^(Action|Bonus Action|Reaction|1 action|1 bonus action|1 reaction|\d+\s*(?:minute|hour)s?(?:\s+or\s+Ritual)?)/i,
  )
  return cap(m ? m[0] : raw, 128)
}

function italicTraits(body) {
  const traits = []
  const re = /_([^_]+)\._\s*([\s\S]*?)(?=\n_[^_]|$)/g
  let m
  while ((m = re.exec(body))) {
    const name = m[1].trim()
    const description = m[2].trim().replace(/\n+/g, " ")
    if (name && description && !name.startsWith("Using ")) {
      traits.push({ name, description })
    }
  }
  return traits
}

export function parseOrigins(md) {
  const species = []
  const backgrounds = []

  const speciesBlock = md.split("### Species Descriptions")[1]?.split(/^## /m)[0] ?? ""
  for (const { title, body } of splitSections(speciesBlock, 4)) {
    if (!body || title === "Parts of a Species") continue
    const speedMatch = body.match(/\*\*Speed:\*\*\s*(\d+)\s*feet/i)
    species.push({
      name: title,
      description: body.split("As a ")[0].trim().slice(0, 500) || null,
      size: normalizeSpeciesSize(field(body, "Size")),
      creature_type: parseCreatureType(body),
      speed: speedMatch ? parseInt(speedMatch[1], 10) : 30,
      traits: italicTraits(body),
      source: SOURCE,
    })
  }

  const bgBlock = md.split("### Background Descriptions")[1]?.split("## Character Species")[0] ?? ""
  for (const { title, body } of splitSections(bgBlock, 4)) {
    const skills = field(body, "Skill Proficiencies")
    const abilityScores = field(body, "Ability Scores")
    backgrounds.push({
      name: title,
      description: null,
      ability_bonuses: abilityScores
        ? Object.fromEntries(
            abilityScores.split(/,\s*/).map((s) => [s.trim(), 0]),
          )
        : null,
      skill_proficiencies: skills
        ? skills.replace(/^Choose \d+:\s*/i, "").split(/\s+and\s+|,\s*/)
        : [],
      tool_proficiencies: field(body, "Tool Proficiency")
        ? [field(body, "Tool Proficiency")]
        : [],
      feat_granted: field(body, "Feat")?.replace(/\s*\(see.*$/i, "").trim() ?? null,
      equipment: field(body, "Equipment"),
      source: SOURCE,
    })
  }

  return { species, backgrounds }
}

export function parseFeats(md) {
  const feats = []
  const block = md.split("## Feat Descriptions")[1] ?? md
  for (const { title, body } of splitSections(block, 4)) {
    if (!body || title === "Parts of a Feat") continue
    const categoryMatch = body.match(/_([^_]+)\s+Feat/)
    const prereqMatch = body.match(/\(Prerequisite:([^)]+)\)/i)
    feats.push({
      name: title,
      description: formatFeatDescription(body),
      category: categoryMatch?.[1] ?? "General",
      prerequisite: prereqMatch?.[1]?.trim() ?? null,
      source: SOURCE,
    })
  }
  return feats
}

function tableCell(body, label) {
  const re = new RegExp(`${label}\\s*\\n\\s*([^\\n]+)`, "i")
  const m = body.match(re)
  return m ? m[1].trim() : null
}

export function parseClasses(md) {
  const classes = []
  const subclasses = []

  for (const { title: className, body } of splitSections(md, 2)) {
    if (className === "Classes" || !body.includes("Core ")) continue

    const traits = traitTableFromBody(body)
    const hitDieRaw = getTrait(traits, "Hit Point Die")
    const primaryRaw = getTrait(traits, "Primary Ability")
    const savesRaw = getTrait(traits, "Saving Throw Proficiencies")
    const skillsRaw = getTrait(traits, "Skill Proficiencies")
    const armorRaw =
      getTrait(traits, "Armor Training") ?? getTrait(traits, "Armor Proficiencies")
    const weaponsRaw = getTrait(traits, "Weapon Proficiencies")

    const primaryAbilities = parsePrimaryAbilities(primaryRaw)
    const savingThrows = parseSavingThrows(savesRaw)

    let skillChoices = null
    if (skillsRaw) {
      const choose = skillsRaw.match(/Choose (\d+)(?::| from)\s*(.+)/i)
      if (choose) {
        skillChoices = {
          count: parseInt(choose[1], 10),
          options: choose[2]
            .replace(/\s+and\s+/gi, ", ")
            .split(/,\s*|\s+or\s+/i)
            .map((s) => s.replace(/^or\s+/i, "").replace(/\.$/, "").trim())
            .filter(Boolean),
        }
      }
    }

    const features = []
    const featRe = /#### Level (\d+): ([^\n]+)\n\n([\s\S]*?)(?=\n#### |\n### [^#]|\n## |$)/g
    let fm
    while ((fm = featRe.exec(body))) {
      if (fm[2].includes("Subclass")) continue
      features.push({
        level: parseInt(fm[1], 10),
        name: fm[2].trim(),
        description: fm[3].trim().replace(/\n+/g, "\n").slice(0, 8000),
      })
    }

    const hasSpellcasting =
      /Spellcasting/i.test(body) &&
      (className === "Bard" ||
        className === "Cleric" ||
        className === "Druid" ||
        className === "Paladin" ||
        className === "Ranger" ||
        className === "Sorcerer" ||
        className === "Warlock" ||
        className === "Wizard")

    classes.push({
      name: className,
      description: body.match(/\*\*Core[^*]+Traits\*\*[\s\S]*?(?=### )/)?.[0]?.slice(0, 200) ?? null,
      hit_die: parseHitDie(hitDieRaw),
      primary_ability: primaryAbilities,
      saving_throws: savingThrows,
      armor_proficiencies: mapArmorProficiencies(armorRaw),
      weapon_proficiencies: mapWeaponProficiencies(weaponsRaw),
      skill_choices: skillChoices,
      features,
      spellcasting: hasSpellcasting
        ? { ability: primaryAbilities[0] ?? "Intelligence" }
        : null,
      source: SOURCE,
    })

    const subRe = /### \w+ Subclass: ([^\n]+)\n\n([\s\S]*?)(?=\n### \w+ Subclass:|\n## |\n### \w+ Spell List|$)/g
    let sm
    while ((sm = subRe.exec(body))) {
      const subFeatures = []
      const sfeatRe = /#### Level (\d+): ([^\n]+)\n\n([\s\S]*?)(?=\n#### |\n### |\n## |$)/g
      let sfm
      while ((sfm = sfeatRe.exec(sm[2]))) {
        subFeatures.push({
          level: parseInt(sfm[1], 10),
          name: sfm[2].trim(),
          description: sfm[3].trim().replace(/\n+/g, "\n").slice(0, 8000),
        })
      }
      subclasses.push({
        class_name: className,
        name: sm[1].trim(),
        description: sm[2].split("\n\n")[1]?.trim().slice(0, 2000) ?? null,
        features: subFeatures,
        source: SOURCE,
      })
    }
  }

  return { classes, subclasses }
}

export function parseSpells(md) {
  const spells = []
  const block = md.split("## Spell Descriptions")[1] ?? ""
  const re = /#### ([^\n]+)\n\n_([^_]+)_\n\n([\s\S]*?)(?=\n#### |\n## |$)/g
  let m
  while ((m = re.exec(block))) {
    const meta = m[2].trim()
    const body = m[3]
    let level = 0
    let school = "Evocation"
    let classList = []

    const levelMatch = meta.match(/^Level (\d+) (\w+)/i)
    const cantripMatch = meta.match(/^(\w+) Cantrip/i)
    if (levelMatch) {
      level = parseInt(levelMatch[1], 10)
      school = levelMatch[2]
    } else if (cantripMatch) {
      school = cantripMatch[1]
    }

    const classMatch = meta.match(/\(([^)]+)\)\s*$/)
    if (classMatch) {
      classList = classMatch[1].split(/,\s*/)
    }

    const castingTime = normalizeCastingTime(field(body, "Casting Time"))
    const range = cap(field(body, "Range"), 128)
    const componentsRaw = field(body, "Components")
    const duration = cap(field(body, "Duration"), 128)
    const descParts = body.split(/\*\*Duration:\*\*/)[1]?.split("\n\n") ?? []
    const description = descParts[1]?.trim() ?? body.split("\n\n").slice(1).join("\n\n").trim()

    let material = null
    const components = []
    if (componentsRaw) {
      const compMatch = componentsRaw.match(/^([VSM,\s]+)(?:\(([^)]+)\))?/i)
      if (compMatch) {
        components.push(...compMatch[1].split(/,\s*/).map((c) => c.trim()).filter(Boolean))
        material = compMatch[2] ?? null
      }
    }

    const higher = body.match(/_Using a Higher-Level Spell Slot\._\s*([\s\S]*?)(?=\n_|$)/i)

    spells.push({
      name: m[1].trim(),
      level,
      school,
      casting_time: castingTime,
      range,
      components,
      material,
      duration,
      concentration: /concentration/i.test(duration ?? ""),
      ritual: /ritual/i.test(castingTime ?? ""),
      description: description?.slice(0, 8000) ?? null,
      higher_levels: higher?.[1]?.trim().slice(0, 2000) ?? null,
      classes: classList,
      source: SOURCE,
    })
  }
  return spells
}

function parseCost(costStr) {
  if (!costStr) return null
  const cleaned = stripHtml(String(costStr)).trim()
  if (!cleaned || /^—$|^-$|^varies$/i.test(cleaned)) return null
  const m = cleaned.match(/^([\d.]+)\s*(GP|SP|CP|PP|EP)$/i)
  if (!m) return null
  return { amount: parseFloat(m[1]), unit: m[2].toUpperCase() }
}

function parseWeight(s) {
  if (!s) return null
  const cleaned = stripHtml(s)
  if (!cleaned || /^—$|^-$|^varies$/i.test(cleaned)) return null
  const m = cleaned.match(/([\d.]+)\s*lb\.?/i)
  return m ? parseFloat(m[1]) : null
}

function extractTableHtml(md, afterMarker) {
  const idx = md.indexOf(afterMarker)
  if (idx === -1) return null
  const slice = md.slice(idx)
  const match = slice.match(/<table>[\s\S]*?<\/table>/i)
  return match ? match[0] : null
}

function parseGearDescriptions(md) {
  const descriptions = new Map()
  const block = md.split("## Adventuring Gear")[1]?.split("## Mounts")[0] ?? ""
  const re = /#### ([^\n]+)\n\n([\s\S]*?)(?=\n#### |\n## |$)/g
  let m
  while ((m = re.exec(block))) {
    const header = m[1].trim()
    const paren = header.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    const name = stripHtml(paren ? paren[1] : header)
    const costFromHeader = paren ? parseCost(paren[2]) : null
    const description = stripHtml(m[2]).replace(/\s+/g, " ").slice(0, 4000)
    if (name) {
      descriptions.set(name.toLowerCase(), { description, costFromHeader })
    }
  }
  return descriptions
}

function parseWeaponTable(md) {
  const html = extractTableHtml(md, "**Weapons**")
  if (!html) return []
  const rows = parseHtmlTableRows(html)
  const items = []
  let subcategory = "General"

  for (const cells of rows) {
    if (cells.length === 1 && /weapon/i.test(cells[0])) {
      subcategory = cells[0]
      continue
    }
    if (cells.length < 6 || /^(name|damage)$/i.test(cells[0])) continue

    const [name, damage, properties, mastery, weight, cost] = cells
    if (!name || /weapons?$/i.test(name)) continue

    items.push({
      name,
      category: "Weapon",
      subcategory,
      cost: parseCost(cost),
      weight: parseWeight(weight),
      properties: {
        damage,
        properties:
          properties && properties !== "—"
            ? properties.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        mastery: mastery && mastery !== "—" ? mastery : null,
      },
      source: SOURCE,
    })
  }
  return items
}

function parseArmorTable(md) {
  const html = extractTableHtml(md, "**Armor**")
  if (!html) return []
  const rows = parseHtmlTableRows(html)
  const items = []
  let subcategory = "General"

  for (const cells of rows) {
    if (cells.length === 1 && /armor/i.test(cells[0])) {
      subcategory = cells[0]
      continue
    }
    if (cells.length < 6 || /^armor$/i.test(cells[0])) continue

    const [name, ac, strength, stealth, weight, cost] = cells
    if (!name || /armor$/i.test(name)) continue

    items.push({
      name,
      category: "Armor",
      subcategory,
      cost: parseCost(cost),
      weight: parseWeight(weight),
      properties: {
        ac,
        strength_requirement: strength && strength !== "—" ? strength : null,
        disadvantage: stealth === "Disadvantage" ? "Stealth" : null,
      },
      source: SOURCE,
    })
  }
  return items
}

function parseGearTable(md) {
  const html = extractTableHtml(md, "**Adventuring Gear**")
  if (!html) return []
  const rows = parseHtmlTableRows(html)
  const descriptions = parseGearDescriptions(md)
  const items = []

  for (const cells of rows) {
    if (cells.length < 3 || /^(item|weight|cost)$/i.test(cells[0])) continue
    const [name, weight, cost] = cells
    if (!name) continue

    const extra = descriptions.get(name.toLowerCase())
    items.push({
      name,
      category: "Adventuring Gear",
      subcategory: "Gear",
      cost: parseCost(cost) ?? extra?.costFromHeader ?? null,
      weight: parseWeight(weight),
      description: extra?.description ?? null,
      properties: {},
      source: SOURCE,
    })
  }
  return items
}

function parseToolsTable(md) {
  const toolsSection = md.split("## Tools")[1]?.split("## Adventuring Gear")[0] ?? ""
  const html = toolsSection.match(/<table>[\s\S]*?<\/table>/i)?.[0]
  if (!html) return []
  const rows = parseHtmlTableRows(html)
  const items = []
  let subcategory = "Tools"

  for (const cells of rows) {
    if (cells.length === 1) {
      subcategory = cells[0]
      continue
    }
    if (cells.length < 3 || /^(tool|cost|weight)$/i.test(cells[0])) continue
    const name = cells[0]
    const cost = parseCost(cells[cells.length - 1])
    const weight = parseWeight(cells[cells.length - 2])
    if (!name) continue
    items.push({
      name,
      category: "Tool",
      subcategory,
      cost,
      weight,
      properties: {},
      source: SOURCE,
    })
  }
  return items
}

export function parseEquipment(md) {
  const equipment = [
    ...parseWeaponTable(md),
    ...parseArmorTable(md),
    ...parseToolsTable(md),
    ...parseGearTable(md),
  ]

  const seen = new Set()
  return equipment.filter((e) => {
    const key = e.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return e.name.length > 0 && e.name.length < 120 && !e.name.startsWith("#")
  })
}

export function parseAll({ origins, classes, spells, feats, equipment }) {
  const o = parseOrigins(origins)
  const c = parseClasses(classes)
  const s = parseSpells(spells)
  const f = parseFeats(feats)
  const e = parseEquipment(equipment)
  return {
    species: o.species,
    backgrounds: o.backgrounds,
    classes: c.classes,
    subclasses: c.subclasses,
    spells: s,
    feats: f,
    equipment: e,
  }
}
