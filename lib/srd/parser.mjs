/**
 * Parses D&D 5.2.1 SRD markdown (from downfallx/dnd-5e-srd-markdown, CC-BY).
 * Source: official SRD PDF converted to structured markdown.
 */

import { formatFeatDescription } from "../compendium/feat-description.mjs"

const SOURCE = "D&D 5.5e SRD"

const DND_SKILLS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
]

function parseSkillChoices(skillsRaw) {
  if (!skillsRaw) return null

  const anyMatch = skillsRaw.match(/Choose\s+any\s+(\d+)\s+skills?/i)
  if (anyMatch) {
    return {
      count: parseInt(anyMatch[1], 10),
      options: [...DND_SKILLS],
    }
  }

  const choose = skillsRaw.match(/Choose\s+(\d+)\s*(?::|from)\s*(.+)/i)
  if (!choose) return null

  const options = choose[2]
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+and\s+/gi, ", ")
    .split(/,\s*|\s+or\s+/i)
    .map((s) => s.replace(/^or\s+/i, "").replace(/\.$/, "").trim())
    .filter((s) => s && !/^see\s/i.test(s) && s.length > 2)

  if (!options.length) return null

  return {
    count: parseInt(choose[1], 10),
    options,
  }
}

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

const BACKGROUND_ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]

function normalizeBackgroundAbilityKey(raw) {
  const key = String(raw).trim().toLowerCase().replace(/[^a-z]/g, "")
  const aliases = {
    str: "strength",
    dex: "dexterity",
    con: "constitution",
    int: "intelligence",
    wis: "wisdom",
    cha: "charisma",
  }
  if (aliases[key]) return aliases[key]
  for (const ability of BACKGROUND_ABILITIES) {
    if (key === ability || key.startsWith(ability.slice(0, 3))) return ability
  }
  return null
}

function parseToolProficiencyField(text) {
  if (!text?.trim()) return []
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^[_\s]*choose one kind of[_\s]*/i, "")
  cleaned = cleaned.replace(/^a\s+/i, "")
  cleaned = cleaned.replace(/\s*\(see\s+.*$/i, "").trim()
  if (/artisan'?s?\s+tools/i.test(cleaned)) {
    return ["Artisan's tools"]
  }
  return [cleaned]
}

function parseBackgroundAbilityScoresLine(text) {
  if (!text?.trim()) return null
  const cleaned = text.replace(/^choose\s*\d+:\s*/i, "").trim()
  const parts = cleaned.split(/\s*,\s*|\s+and\s+/)
  const bonuses = {}
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const withBonus = trimmed.match(/^([A-Za-z]+)\s*\+?\s*(\d+)\s*$/i)
    if (withBonus) {
      const key = normalizeBackgroundAbilityKey(withBonus[1])
      if (key) bonuses[key] = parseInt(withBonus[2], 10)
      continue
    }
    const key = normalizeBackgroundAbilityKey(trimmed)
    if (key) bonuses[key] = 0
  }
  return Object.keys(bonuses).length > 0 ? bonuses : null
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

function italicTraitBlocks(body) {
  const blocks = []
  const re = /_([^_]+)\._\s*([\s\S]*?)(?=\n_[^_]|$)/g
  let m
  while ((m = re.exec(body))) {
    const name = m[1].trim()
    const rawBlock = m[2].trim()
    if (name && rawBlock && !name.startsWith("Using ")) {
      blocks.push({ name, rawBlock })
    }
  }
  return blocks
}

function cleanTraitDescription(text) {
  return stripHtml(text)
    .replace(/\*\*[^*]+\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800)
}

function isChoiceTraitText(text) {
  return (
    /\bchoose\b/i.test(text) ||
    /following options/i.test(text) ||
    /following benefits/i.test(text) ||
    /from the .+ table/i.test(text)
  )
}

function parseSkillOrChoiceTrait(name, rawBlock) {
  const plain = stripHtml(rawBlock)
  const m = plain.match(/proficiency in (?:the )?(.+?)\s+skill/i)
  if (!m || !/\bor\b/i.test(m[1])) return null

  const skills = m[1]
    .split(/\s*,\s*|\s+or\s+/i)
    .map((s) => s.replace(/^or\s+/i, "").trim())
    .filter(Boolean)
  if (skills.length < 2) return null

  const intro = plain.replace(m[0], "one skill of your choice.").replace(/\.{2,}/g, ".").trim()
  return {
    name,
    description: intro || plain.slice(0, 200),
    isChoice: true,
    choices: {
      category: name,
      count: 1,
      options: skills.map((skill) => ({
        name: skill,
        description: `Gain proficiency in ${skill}`,
      })),
    },
  }
}

function parseBoldHeadingOptions(rawBlock) {
  const options = []
  const re = /\*\*([^*]+)\.\*\*\s*([\s\S]*?)(?=\n\*\*[^*]+\.\*\*|$)/g
  let m
  while ((m = re.exec(rawBlock))) {
    const optName = m[1].trim()
    const optDesc = stripHtml(m[2]).replace(/\s+/g, " ").trim()
    if (optName) {
      options.push({ name: optName, description: optDesc.slice(0, 500) })
    }
  }
  return options
}

function parseTableContext(rawBlock) {
  const tableMatch = rawBlock.match(/<table>[\s\S]*?<\/table>/i)
  if (!tableMatch) {
    return { tableHtml: null, tableTitle: null, intro: rawBlock }
  }

  const beforeTable = rawBlock.slice(0, rawBlock.indexOf(tableMatch[0]))
  const tableTitle = beforeTable.match(/\*\*([^*]+)\*\*\s*$/m)?.[1]?.trim() ?? null
  const intro = beforeTable.replace(/\*\*[^*]+\*\*\s*$/, "").trim()
  return { tableHtml: tableMatch[0], tableTitle, intro }
}

function parseDraconicAncestorsTable(tableHtml) {
  const rows = parseHtmlTableRows(tableHtml)
  const options = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    for (let c = 0; c < row.length; c += 2) {
      const name = row[c]?.trim()
      const damage = row[c + 1]?.trim()
      if (!name || /^dragon$/i.test(name) || /^damage type$/i.test(name)) continue
      options.push({
        name,
        description: damage ? `${damage} damage resistance` : "",
      })
    }
  }
  return options
}

function parseLineageTable(tableHtml) {
  const rows = parseHtmlTableRows(tableHtml)
  if (rows.length < 2) return []

  const headers = rows[0]
  const options = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const name = row[0]?.trim()
    if (!name) continue

    const descParts = row.slice(1).map((cell, index) => {
      const header = headers[index + 1] || `Benefit ${index + 1}`
      return `${header}: ${stripHtml(cell)}`
    })
    options.push({
      name,
      description: descParts.filter(Boolean).join("; "),
    })
  }
  return options
}

function enrichSpeciesTrait(name, rawBlock) {
  const skillChoice = parseSkillOrChoiceTrait(name, rawBlock)
  if (skillChoice) return skillChoice

  const plain = stripHtml(rawBlock)
  const hasChoiceLanguage = isChoiceTraitText(plain)
  const hasTable = /<table/i.test(rawBlock)
  const hasBoldOptions = /\*\*[^*]+\.\*\*/.test(rawBlock)

  if (!hasChoiceLanguage && !hasTable && !hasBoldOptions) {
    return { name, description: cleanTraitDescription(rawBlock) }
  }

  const { tableHtml, tableTitle, intro } = parseTableContext(rawBlock)
  if (tableHtml) {
    const options = /draconic ancestor/i.test(tableTitle || name)
      ? parseDraconicAncestorsTable(tableHtml)
      : parseLineageTable(tableHtml)
    if (options.length) {
      return {
        name,
        description: cleanTraitDescription(intro || plain.split(/choose/i)[0]),
        isChoice: true,
        choices: {
          category: tableTitle || name,
          count: 1,
          options,
        },
      }
    }
  }

  const boldOptions = parseBoldHeadingOptions(rawBlock)
  if (boldOptions.length >= 2) {
    return {
      name,
      description: cleanTraitDescription(intro || rawBlock.split("**")[0]),
      isChoice: true,
      choices: {
        category: name,
        count: 1,
        options: boldOptions,
      },
    }
  }

  if (hasChoiceLanguage && boldOptions.length === 1) {
    return {
      name,
      description: cleanTraitDescription(intro || rawBlock),
      isChoice: true,
      choices: {
        category: name,
        count: 1,
        options: boldOptions,
      },
    }
  }

  return { name, description: cleanTraitDescription(rawBlock) }
}

function parseSpeciesTraits(body) {
  return italicTraitBlocks(body).map(({ name, rawBlock }) => enrichSpeciesTrait(name, rawBlock))
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
      traits: parseSpeciesTraits(body),
      source: SOURCE,
    })
  }

  const bgBlock = md.split("### Background Descriptions")[1]?.split("## Character Species")[0] ?? ""
  for (const { title, body } of splitSections(bgBlock, 4)) {
    const skills = field(body, "Skill Proficiencies")
    const abilityScores = field(body, "Ability Scores")
    const featureName = field(body, "Feature")
    const featureDesc = field(body, "Feature Description")
    const toolRaw = field(body, "Tool Proficiency")
    const toolNames = parseToolProficiencyField(toolRaw)
    const proficiencies = {
      tools: toolNames,
      vehicles: [],
      weapons: [],
      armor: [],
      languages: [],
    }
    const equipmentRaw = field(body, "Equipment")
    const { starting_equipment_groups, starting_gold } = parseStartingEquipment(equipmentRaw)
    backgrounds.push({
      name: title,
      description: field(body, "Description") ?? null,
      ability_bonuses: parseBackgroundAbilityScoresLine(abilityScores),
      skill_proficiencies: skills
        ? skills.replace(/^Choose \d+:\s*/i, "").split(/\s+and\s+|,\s*/).map((s) => s.trim()).filter(Boolean)
        : [],
      proficiencies,
      tool_proficiencies: toolNames,
      feat_granted: field(body, "Feat")?.replace(/\s*\(see.*$/i, "").trim() ?? null,
      starting_equipment_groups,
      starting_gold,
      equipment: equipmentRaw,
      feature:
        featureName || featureDesc
          ? {
              name: featureName || "Background Feature",
              description: featureDesc || "",
            }
          : null,
      grants_spells: false,
      granted_spells: null,
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

    const categoryLine =
      body.match(/_(Origin|General|Fighting Style|Epic Boon)\s+Feat[^_]*_/i)?.[0] ?? ""
    let category = "General"
    if (/Epic Boon/i.test(categoryLine)) category = "Epic Boon"
    else if (/Fighting Style/i.test(categoryLine)) category = "Fighting Style"
    else if (/Origin/i.test(categoryLine)) category = "Origin"
    else if (/General/i.test(categoryLine)) category = "General"

    const prereqMatch = body.match(/\(Prerequisite:([^)]+)\)/i)
    const levelMatch = body.match(/Level\s+(\d+)\+/i)
    let level_requirement = null
    if (category === "Epic Boon") {
      level_requirement = 19
    } else if (levelMatch) {
      level_requirement = parseInt(levelMatch[1], 10)
    } else if (category === "General") {
      level_requirement = 4
    }

    feats.push({
      name: title,
      description: formatFeatDescription(body),
      category,
      level_requirement,
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

function parseEquipmentItemList(text) {
  const items = []
  let cleaned = text.trim()
  const gpMatch = cleaned.match(/,\s*(?:and\s+)?(\d+)\s*GP\s*$/i)
  if (gpMatch) {
    items.push({ name: "Gold Pieces", quantity: parseInt(gpMatch[1], 10) })
    cleaned = cleaned.slice(0, gpMatch.index).trim()
  } else if (/^(\d+)\s*GP$/i.test(cleaned)) {
    const onlyGp = cleaned.match(/^(\d+)\s*GP$/i)
    return [{ name: "Gold Pieces", quantity: parseInt(onlyGp[1], 10) }]
  }

  for (const part of cleaned.split(/,\s+(?![^()]*\))/).map((p) => p.trim()).filter(Boolean)) {
    const sheetsMatch = part.match(/^(.+?)\s*\((\d+)\s+sheets?\)$/i)
    if (sheetsMatch) {
      items.push({ name: sheetsMatch[1].trim(), quantity: parseInt(sheetsMatch[2], 10) })
      continue
    }
    const qtyMatch = part.match(/^(\d+)\s+(.+)$/)
    if (qtyMatch) {
      items.push({ name: qtyMatch[2].trim(), quantity: parseInt(qtyMatch[1], 10) })
    } else {
      items.push({ name: part.trim(), quantity: 1 })
    }
  }
  return items
}

function parseStartingEquipment(raw) {
  if (!raw) return { starting_equipment_groups: [], starting_gold: 0 }

  const text = raw
    .trim()
    .replace(/^_+|_+$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim()

  const prefixMatch = text.match(/^(Choose[^:]*):\s*_?\s*(.+)$/is)
  const description = prefixMatch ? prefixMatch[1].trim() : "Choose starting equipment"
  let optionsText = prefixMatch ? prefixMatch[2].trim() : text
  optionsText = optionsText.replace(/^_+\s*/, "")

  const options = []
  let starting_gold = 0

  for (const chunk of optionsText.split(/;\s*(?:or\s+)?/i)) {
    const m = chunk.trim().match(/^\(([A-Z])\)\s*(.+)$/is)
    if (!m) continue
    const letter = m[1]
    const content = m[2].trim().replace(/^or\s+/i, "")
    const gpOnly = content.match(/^(\d+)\s*GP\s*$/i)
    if (gpOnly) {
      const amount = parseInt(gpOnly[1], 10)
      starting_gold = Math.max(starting_gold, amount)
      options.push({
        label: `(${letter}) ${amount} GP`,
        items: [{ name: "Gold Pieces", quantity: amount }],
      })
    } else {
      options.push({
        label: `(${letter}) ${content}`,
        items: parseEquipmentItemList(content),
      })
    }
  }

  return {
    starting_equipment_groups: options.length ? [{ description, options }] : [],
    starting_gold,
  }
}

function parseNumericCell(value) {
  if (!value || value === "—" || value === "-") return 0
  const n = parseInt(String(value).replace(/[^\d]/g, ""), 10)
  return Number.isFinite(n) ? n : 0
}

function findTableColumn(headerRow, ...labels) {
  for (const label of labels) {
    const idx = headerRow.findIndex((h) =>
      h.trim().toLowerCase().includes(label.toLowerCase()),
    )
    if (idx >= 0) return idx
  }
  return -1
}

function isSpellSlotSubHeader(row) {
  const first = row[0]?.trim()
  if (/^\d+$/.test(first)) return false
  return row.some((cell, i) => i >= 5 && /^[1-9]$/.test(cell?.trim()))
}

function parseClassFeaturesTable(body, className) {
  const marker = `**${className} Features**`
  const start = body.indexOf(marker)
  if (start === -1) return null

  const after = body.slice(start + marker.length)
  const tableMatch = after.match(/<table>[\s\S]*?<\/table>/i)
  if (!tableMatch) return null

  const rows = parseHtmlTableRows(tableMatch[0])
  const headerIdx = rows.findIndex((r) => /^level$/i.test(r[0]?.trim()))
  if (headerIdx === -1) return null

  const headerRow = rows[headerIdx]
  const subHeaderRow =
    headerIdx + 1 < rows.length && isSpellSlotSubHeader(rows[headerIdx + 1])
      ? rows[headerIdx + 1]
      : null

  const levelCol = findTableColumn(headerRow, "level")
  const cantripsCol = findTableColumn(headerRow, "cantrips")
  const preparedCol = findTableColumn(headerRow, "prepared spells")
  const slotLevelCol = findTableColumn(headerRow, "slot level")

  if (cantripsCol === -1 && preparedCol === -1) return null

  const slotLevelColumns = []
  if (subHeaderRow) {
    for (let c = 0; c < subHeaderRow.length; c++) {
      const slotNum = parseInt(subHeaderRow[c], 10)
      if (slotNum >= 1 && slotNum <= 9) slotLevelColumns.push({ col: c, level: slotNum })
    }
  }

  const dataStart = subHeaderRow ? headerIdx + 2 : headerIdx + 1
  const progression = []

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i]
    const classLevel = parseInt(row[levelCol], 10)
    if (!Number.isFinite(classLevel) || classLevel < 1 || classLevel > 20) continue

    const cantrips = cantripsCol >= 0 ? parseNumericCell(row[cantripsCol]) : 0
    const prepared = preparedCol >= 0 ? parseNumericCell(row[preparedCol]) : 0

    let maxSpellLevel = 0
    if (slotLevelCol >= 0) {
      maxSpellLevel = parseNumericCell(row[slotLevelCol])
    } else {
      for (const { col, level: slotNum } of slotLevelColumns) {
        const val = row[col]?.trim()
        if (val && val !== "—" && val !== "-") {
          maxSpellLevel = Math.max(maxSpellLevel, slotNum)
        }
      }
    }

    progression.push({
      level: classLevel,
      cantrips,
      prepared,
      max_spell_level: maxSpellLevel,
    })
  }

  return progression.length ? progression : null
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
    const startingRaw = getTrait(traits, "Starting Equipment")
    const { starting_equipment_groups, starting_gold } = parseStartingEquipment(startingRaw)

    const primaryAbilities = parsePrimaryAbilities(primaryRaw)
    const savingThrows = parseSavingThrows(savesRaw)

    let skillChoices = parseSkillChoices(skillsRaw)

    const coreBody = body.split(/\n### \w+ Subclass:/)[0] ?? body

    const features = []
    const featRe = /#### Level (\d+): ([^\n]+)\n\n([\s\S]*?)(?=\n#### |\n### [^#]|\n## |$)/g
    let fm
    while ((fm = featRe.exec(coreBody))) {
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

    const spellProgression = hasSpellcasting
      ? parseClassFeaturesTable(body, className)
      : null

    classes.push({
      name: className,
      description: body.match(/\*\*Core[^*]+Traits\*\*[\s\S]*?(?=### )/)?.[0]?.slice(0, 200) ?? null,
      hit_die: parseHitDie(hitDieRaw),
      primary_ability: primaryAbilities,
      saving_throws: savingThrows,
      armor_proficiencies: mapArmorProficiencies(armorRaw),
      weapon_proficiencies: mapWeaponProficiencies(weaponsRaw),
      skill_choices: skillChoices,
      starting_equipment_groups,
      starting_gold,
      features,
      spellcasting: hasSpellcasting
        ? {
            ability: primaryAbilities[0] ?? "Intelligence",
            type: className === "Warlock" ? "pact" : "prepared",
            progression: spellProgression ?? [],
          }
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

const SPELL_LIST_CLASS_NAMES = [
  "Bard",
  "Cleric",
  "Druid",
  "Paladin",
  "Ranger",
  "Sorcerer",
  "Warlock",
  "Wizard",
]

/** Spell name (lowercase) → set of class names from ### Class Spell List tables in classes.md */
export function parseClassSpellLists(classesMd) {
  const bySpell = new Map()
  for (const className of SPELL_LIST_CLASS_NAMES) {
    const marker = `### ${className} Spell List`
    const idx = classesMd.indexOf(marker)
    if (idx === -1) continue
    const rest = classesMd.slice(idx + marker.length)
    const nextSection = rest.search(
      /\n### (?:Bard|Cleric|Druid|Paladin|Ranger|Sorcerer|Warlock|Wizard) Spell List|\n## /,
    )
    const block = nextSection === -1 ? rest : rest.slice(0, nextSection)
    const tableRe = /<table>[\s\S]*?<\/table>/gi
    let tm
    while ((tm = tableRe.exec(block))) {
      for (const row of parseHtmlTableRows(tm[0])) {
        if (row.length < 3) continue
        const spellName = row[0]?.trim()
        const schoolCol = row[1]?.trim()
        if (!spellName || /^spell$/i.test(spellName)) continue
        if (!schoolCol || /^(school|special)$/i.test(schoolCol)) continue
        const key = spellName.toLowerCase()
        if (!bySpell.has(key)) bySpell.set(key, new Set())
        bySpell.get(key).add(className)
      }
    }
  }
  return bySpell
}

function mergeSpellClassLists(spells, classSpellLists) {
  return spells.map((spell) => {
    const fromList = classSpellLists.get(spell.name.toLowerCase())
    const merged = new Set(spell.classes || [])
    if (fromList) {
      for (const c of fromList) merged.add(c)
    }
    return {
      ...spell,
      classes: [...merged].sort((a, b) => a.localeCompare(b)),
    }
  })
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
    if (!levelMatch && !cantripMatch) continue
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
  const m = cleaned.match(/^([\d,.]+)\s*(GP|SP|CP|PP|EP)$/i)
  if (!m) return null
  return { amount: parseFloat(m[1].replace(/,/g, "")), unit: m[2].toUpperCase() }
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

function normalizeArmorSubcategory(headerText) {
  const t = headerText.trim()
  if (/^shield\b/i.test(t)) return "Shield"
  if (/light\s+armor/i.test(t)) return "Light Armor"
  if (/medium\s+armor/i.test(t)) return "Medium Armor"
  if (/heavy\s+armor/i.test(t)) return "Heavy Armor"
  return null
}

function parseArmorTable(md) {
  const html = extractTableHtml(md, "**Armor**")
  if (!html) return []
  const rows = parseHtmlTableRows(html)
  const items = []
  let subcategory = "General"

  for (const cells of rows) {
    if (cells.length === 1) {
      const normalized = normalizeArmorSubcategory(cells[0])
      if (normalized) {
        subcategory = normalized
        continue
      }
      if (/armor/i.test(cells[0])) {
        subcategory = cells[0]
        continue
      }
    }
    if (cells.length < 6 || /^armor$/i.test(cells[0])) continue

    const [name, ac, strength, stealth, weight, cost] = cells
    if (!name) continue

    const itemSubcategory = /^shield$/i.test(name.trim()) ? "Shield" : subcategory

    items.push({
      name,
      category: "Armor",
      subcategory: itemSubcategory,
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

function stripMagicDescription(text) {
  return String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const MAGIC_ITEM_CATEGORY_LABELS = {
  weapon: "Weapon",
  armor: "Armor",
  potion: "Potion",
  ring: "Ring",
  rod: "Rod",
  scroll: "Scroll",
  staff: "Staff",
  wand: "Wand",
  "wondrous item": "Wondrous Item",
}

function parseMagicItemRarity(text) {
  const haystack = text.toLowerCase()
  if (/rarity varies/.test(haystack)) return null
  if (/\blegendary\b/.test(haystack)) return "Legendary"
  if (/\bvery rare\b/.test(haystack)) return "Very Rare"
  if (/\brare\b/.test(haystack)) return "Rare"
  if (/\buncommon\b/.test(haystack)) return "Uncommon"
  if (/\bcommon\b/.test(haystack)) return "Common"
  if (/\bartifact\b/.test(haystack)) return "Artifact"
  return null
}

function titleCaseEquipmentName(raw) {
  return raw
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function parseMagicItemBaseHints(hint) {
  if (!hint?.trim()) {
    return { base_equipment_names: [], base_equipment_filter: null }
  }

  const normalized = hint.trim().toLowerCase()
  if (/any simple or martial/i.test(normalized)) {
    return { base_equipment_names: [], base_equipment_filter: "any_weapon" }
  }
  if (/any light, medium, or heavy/i.test(normalized)) {
    return { base_equipment_names: [], base_equipment_filter: null }
  }
  if (/^shield$/i.test(normalized) || /\(shield\)/i.test(normalized)) {
    return { base_equipment_names: ["Shield"], base_equipment_filter: null }
  }

  const names = hint
    .split(/\bor\b|,|\//i)
    .map((part) => part.replace(/\(.*?\)/g, "").trim())
    .filter(Boolean)
    .map(titleCaseEquipmentName)
    .filter((name) => !/^any\b/i.test(name))

  return { base_equipment_names: [...new Set(names)], base_equipment_filter: null }
}

function parseMagicItemMeta(metaLine) {
  const text = metaLine.replace(/^_\s*|\s*_$/g, "").trim()
  const requires_attunement = /requires attunement/i.test(text)
  const attunementMatch = text.match(/requires attunement(?:\s+by\s+([^)]+))?/i)
  const attunement_restriction = attunementMatch?.[1]?.trim() ?? null

  const categoryMatch = text.match(/^([^(,]+)(?:\(([^)]+)\))?/i)
  const rawCategory = categoryMatch?.[1]?.trim().toLowerCase() ?? ""
  const magic_item_category =
    MAGIC_ITEM_CATEGORY_LABELS[rawCategory] ??
    titleCaseEquipmentName(rawCategory || "Wondrous Item")

  const rarity = parseMagicItemRarity(text)
  const base = parseMagicItemBaseHints(categoryMatch?.[2] ?? "")

  let category = "Adventuring Gear"
  let subcategory = null
  if (magic_item_category === "Weapon") {
    category = "Weapon"
  } else if (magic_item_category === "Armor") {
    category = "Armor"
    if (base.base_equipment_names.includes("Shield")) {
      subcategory = "Shield"
    }
  } else if (magic_item_category === "Potion") {
    category = "Adventuring Gear"
    subcategory = "Gear"
  }

  return {
    magic_item_category,
    rarity,
    requires_attunement,
    attunement_restriction,
    category,
    subcategory,
    ...base,
  }
}

function parseHealingPotionsFromTable(body) {
  const rows = []
  const rowRe =
    /<td>\s*Potion of Healing(?:\s*\(([^)]+)\))?\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/gi
  let match
  while ((match = rowRe.exec(body))) {
    const variant = match[1]?.trim().toLowerCase()
    const healing = match[2]?.trim()
    const rarity = match[3]?.trim()
    let name = "Potion of Healing"
    if (variant === "greater") name = "Potion of Healing (Greater)"
    else if (variant === "superior") name = "Potion of Healing (Superior)"
    else if (variant === "supreme") name = "Potion of Healing (Supreme)"
    if (name === "Potion of Healing") continue
    rows.push({
      name,
      category: "Adventuring Gear",
      subcategory: "Gear",
      magic_item_category: "Potion",
      rarity,
      requires_attunement: false,
      description: `You regain ${healing} Hit Points when you drink this potion.`,
      source: SOURCE,
      heal_dice: healing,
    })
  }
  return rows
}

export function parseMagicItems(md) {
  const sections = splitSections(md, 4)
  const items = []
  const skipTitles = new Set([
    "Magic Item Values by Rarity",
    "Command Word",
    "Consumable Items",
    "Arcana Proficiency",
    "Tools",
    "Abilities",
    "Alignment",
    "Communication",
    "Senses",
    "Traits",
    "Actions",
  ])

  for (const { title, body } of sections) {
    if (skipTitles.has(title)) continue

    const metaMatch = body.match(/^_([^_\n]+(?:\([^)]*\)[^_\n]*)?)_/m)
    const meta = parseMagicItemMeta(metaMatch?.[1] ?? "")
    let description = body
    if (metaMatch) {
      description = body.slice(metaMatch.index + metaMatch[0].length).trim()
    }
    description = stripMagicDescription(description)
    description = cap(description, 8000)

    if (title === "Potions of Healing") {
      items.push(...parseHealingPotionsFromTable(body))
      continue
    }

    items.push({
      name: title,
      category: meta.category,
      subcategory: meta.subcategory,
      magic_item_category: meta.magic_item_category,
      rarity: meta.rarity,
      requires_attunement: meta.requires_attunement,
      attunement_restriction: meta.attunement_restriction,
      base_equipment_names: meta.base_equipment_names,
      base_equipment_filter: meta.base_equipment_filter,
      description,
      source: SOURCE,
    })
  }

  const seen = new Set()
  return items.filter((row) => {
    const key = row.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return row.name.length > 0
  })
}

export function parseAll({ origins, classes, spells, feats, equipment, magicItems }) {
  const o = parseOrigins(origins)
  const c = parseClasses(classes)
  const classSpellLists = parseClassSpellLists(classes)
  const s = mergeSpellClassLists(parseSpells(spells), classSpellLists)
  const f = parseFeats(feats)
  const e = parseEquipment(equipment)
  const magic = magicItems ? parseMagicItems(magicItems) : []
  return {
    species: o.species,
    backgrounds: o.backgrounds,
    classes: c.classes,
    subclasses: c.subclasses,
    spells: s,
    feats: f,
    equipment: e,
    magicItems: magic,
  }
}
