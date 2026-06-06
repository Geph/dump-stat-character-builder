import { getDatabaseConfigError } from "@/lib/db/config"
import { listRows, upsertByName } from "@/lib/db/repository"
import type { CompendiumTable } from "@/lib/db/tables"
import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { formatFeatDescription } from "@/lib/compendium/feat-description"
import { IMPORT_CONTENT_TYPE_HINTS } from "@/lib/import/content-type-hints"
import {
  extractFollowingBlocks,
  extractMainContentHtml,
  extractPlainSummary,
  getMainContentRoot,
} from "@/lib/import/extract-html-content"
import {
  parseBackgroundAbilityFromImportText,
  parseBackgroundFeatureFromText,
  parseBackgroundGrantedSpellNames,
  finalizeBackgroundImportRow,
} from "@/lib/import/background-parse"
import { parseBackgroundAbilityScoresLine } from "@/lib/compendium/background-utils"

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DnDCharacterBuilder/1.0)"
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  
  return response.text()
}

function parseSpecies(html: string, url: string) {
  const $ = cheerio.load(html)
  const name = $("#page-title").text().trim() || $("h1").first().text().trim()
  
  const mainContent = getMainContentRoot($)
  const description = extractMainContentHtml($)
  const fullText = mainContent.text()
  
  // Extract traits
  const traits: { name: string; description: string }[] = []
  mainContent.find("h3, h4, strong").each((_, el) => {
    const traitName = $(el).text().trim()
    const traitDesc = extractFollowingBlocks($, el) || $(el).next("p").text().trim()
    if (traitName && traitDesc && !traitName.includes("Ability") && !traitName.includes("Size")) {
      traits.push({ name: traitName, description: traitDesc })
    }
  })
  const sizeMatch = fullText.match(/Size[:\s]*(Small|Medium|Large)/i)
  const speedMatch = fullText.match(/Speed[:\s]*(\d+)/i)

  return {
    name: name.replace(/^Lineage:\s*/i, "").replace(/^Species:\s*/i, ""),
    description,
    size: sizeMatch ? sizeMatch[1] : "Medium",
    speed: speedMatch ? parseInt(speedMatch[1]) : 30,
    traits,
    source: new URL(url).hostname,
    creator_url: url
  }
}

function parseClass(html: string, url: string) {
  const $ = cheerio.load(html)
  
  // Try multiple selectors for class name - wikidot uses page-title with page-header class
  let name = $(".page-title.page-header").text().trim()
  if (!name) name = $("#page-title").text().trim()
  if (!name) name = $("h1").first().text().trim()
  name = name.replace(/^Class:\s*/i, "")
  
  const mainContent = getMainContentRoot($)
  const description = extractMainContentHtml($)
  const fullText = mainContent.text()
  
  // Try to extract hit die
  const hitDieMatch = fullText.match(/Hit\s*Die[:\s]*d(\d+)/i) || fullText.match(/Hit\s*Points.*?d(\d+)/i)
  
  // Extract features
  const features: { level: number; name: string; description: string }[] = []
  mainContent.find("h3, h4, h2").each((_, el) => {
    const featureName = $(el).text().trim()
    const featureDesc = extractFollowingBlocks($, el)
    // Try to extract level from feature name
    const levelMatch = featureName.match(/(\d+)(?:st|nd|rd|th)?[- ]*level/i)
    if (featureName && featureDesc && !featureName.match(/^(Table|Level|Features)/i)) {
      features.push({
        level: levelMatch ? parseInt(levelMatch[1]) : 1,
        name: featureName.replace(/^\d+(?:st|nd|rd|th)?[- ]*level[:\s]*/i, ""),
        description: featureDesc
      })
    }
  })
  
  // Check if the class has spellcasting by looking for spellcasting features
  const hasSpellcasting = fullText.toLowerCase().includes("spellcasting") || 
                          fullText.toLowerCase().includes("spell slot") ||
                          fullText.toLowerCase().includes("cantrip") ||
                          features.some(f => f.name.toLowerCase().includes("spellcasting"))
  
  // Try to extract proficiencies from traits table or text
  const armorProfs: string[] = []
  const weaponProfs: string[] = []
  const skillOptions: string[] = []
  const savingThrows: string[] = []
  
  // Look for proficiencies in tables and text
  const profText = fullText.toLowerCase()
  
  // Armor proficiencies
  if (profText.includes("light armor")) armorProfs.push("Light armor")
  if (profText.includes("medium armor")) armorProfs.push("Medium armor")
  if (profText.includes("heavy armor")) armorProfs.push("Heavy armor")
  if (profText.includes("all armor")) armorProfs.push("All armor")
  if (profText.includes("shields")) armorProfs.push("Shields")
  
  // Weapon proficiencies
  if (profText.includes("simple weapons")) weaponProfs.push("Simple weapons")
  if (profText.includes("martial weapons")) weaponProfs.push("Martial weapons")
  if (profText.includes("firearm")) weaponProfs.push("Firearms")
  
  // Saving throws - common patterns
  const savesMatch = fullText.match(/Saving\s*Throws[:\s]*([^\n]+)/i)
  if (savesMatch) {
    const saveText = savesMatch[1].toLowerCase()
    const abilities = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]
    abilities.forEach(ab => {
      if (saveText.includes(ab.toLowerCase())) savingThrows.push(ab)
    })
  }
  
  // Skills
  const skillsMatch = fullText.match(/Skills[:\s]*(?:Choose\s*\d+\s*from\s*)?([^\n]+)/i)
  if (skillsMatch) {
    const allSkills = ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", 
                       "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", 
                       "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"]
    const skillText = skillsMatch[1].toLowerCase()
    allSkills.forEach(skill => {
      if (skillText.includes(skill.toLowerCase())) skillOptions.push(skill)
    })
  }
  
  // Determine spellcasting ability
  let spellcastingAbility: string | null = null
  if (hasSpellcasting) {
    if (profText.includes("intelligence is your spellcasting")) spellcastingAbility = "Intelligence"
    else if (profText.includes("wisdom is your spellcasting")) spellcastingAbility = "Wisdom"
    else if (profText.includes("charisma is your spellcasting")) spellcastingAbility = "Charisma"
    else if (name.toLowerCase().includes("artificer") || name.toLowerCase().includes("wizard")) spellcastingAbility = "Intelligence"
    else if (name.toLowerCase().includes("cleric") || name.toLowerCase().includes("druid")) spellcastingAbility = "Wisdom"
    else spellcastingAbility = "Intelligence" // Default for imports
  }

  return {
    name,
    description,
    hit_die: hitDieMatch ? parseInt(hitDieMatch[1]) : 8,
    features: features.slice(0, 20), // Limit to first 20 features
    source: new URL(url).hostname,
    creator_url: url,
    armor_proficiencies: armorProfs.length > 0 ? armorProfs : null,
    weapon_proficiencies: weaponProfs.length > 0 ? weaponProfs : null,
    saving_throws: savingThrows.length > 0 ? savingThrows : null,
    skill_choices: skillOptions.length > 0 ? { count: 2, options: skillOptions } : null,
    spellcasting: hasSpellcasting ? { ability: spellcastingAbility || "Intelligence", prepared: true } : null,
  }
}

function parseBackground(html: string, url: string) {
  const $ = cheerio.load(html)
  const name = $("#page-title").text().trim().replace(/^Background:\s*/i, "") || $("h1").first().text().trim()
  
  const mainContent = getMainContentRoot($)
  const description = extractMainContentHtml($) || null
  const fullText = mainContent.text()
  
  const skillsMatch = fullText.match(/Skill\s*Proficiencies?[:\s]*([^.]+)/i)
  const skills = skillsMatch
    ? skillsMatch[1].replace(/^Choose \d+:\s*/i, "").split(/\s+and\s+|[,&]/).map((s) => s.trim()).filter(Boolean)
    : []

  const featMatch = fullText.match(/Feat[:\s]*([^.]+)/i)

  const abilityLine = fullText.match(/Ability\s*Scores?[:\s]*([^\n.]+)/i)?.[1]
  const ability_bonuses =
    parseBackgroundAbilityScoresLine(abilityLine) ?? parseBackgroundAbilityFromImportText(fullText)

  const feature = parseBackgroundFeatureFromText(fullText)
  const { grants_spells, spells_by_level } = parseBackgroundGrantedSpellNames(fullText)

  return {
    name,
    description: description || null,
    skill_proficiencies: skills,
    feat_granted: featMatch ? featMatch[1].replace(/\s*\(see.*$/i, "").trim() : null,
    ability_bonuses,
    feature,
    grants_spells,
    granted_spells: null,
    _granted_spell_names: grants_spells ? spells_by_level : undefined,
    source: new URL(url).hostname,
    creator_url: url,
  }
}

function parseSpell(html: string, url: string) {
  const $ = cheerio.load(html)
  const name = $("#page-title").text().trim().replace(/^Spell:\s*/i, "") || $("h1").first().text().trim()
  
  const mainContent = getMainContentRoot($)
  const fullText = mainContent.text()
  
  // Extract spell level
  const levelMatch = fullText.match(/(\d)(?:st|nd|rd|th)?[- ]level|Cantrip/i)
  const level = fullText.toLowerCase().includes("cantrip") ? 0 : (levelMatch ? parseInt(levelMatch[1]) : 1)
  
  // Extract school
  const schools = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"]
  const school = schools.find(s => fullText.toLowerCase().includes(s.toLowerCase())) || "Evocation"
  
  // Extract other properties
  const castingMatch = fullText.match(/Casting\s*Time[:\s]*([^\n]+)/i)
  const rangeMatch = fullText.match(/Range[:\s]*([^\n]+)/i)
  const durationMatch = fullText.match(/Duration[:\s]*([^\n]+)/i)
  const componentsMatch = fullText.match(/Components?[:\s]*([VSM,\s]+)/i)
  
  const firstPara = mainContent.find("p").first().get(0)
  const description =
    (firstPara ? extractFollowingBlocks($, firstPara) : "") ||
    extractMainContentHtml($) ||
    extractPlainSummary(extractMainContentHtml($))
  
  // Extract classes
  const classesMatch = fullText.match(/Classes?[:\s]*([^\n]+)/i)
  const classNames = classesMatch 
    ? classesMatch[1].split(/[,&]/).map(c => c.trim()).filter(Boolean)
    : []

  return {
    name,
    level,
    school,
    casting_time: castingMatch ? castingMatch[1].trim() : "1 action",
    range: rangeMatch ? rangeMatch[1].trim() : "Self",
    components: componentsMatch ? componentsMatch[1].split(/[,\s]+/).filter(c => ["V", "S", "M"].includes(c.toUpperCase())) : ["V", "S"],
    duration: durationMatch ? durationMatch[1].trim() : "Instantaneous",
    concentration: fullText.toLowerCase().includes("concentration"),
    description,
    classes: classNames,
    source: new URL(url).hostname,
    creator_url: url
  }
}

function parseFeat(html: string, url: string) {
  const $ = cheerio.load(html)
  const name = $("#page-title").text().trim().replace(/^Feat:\s*/i, "") || $("h1").first().text().trim()
  
  const mainContent = getMainContentRoot($)
  const fullText = mainContent.text()
  
  const description = formatFeatDescription(extractMainContentHtml($))
  
  // Extract prerequisite
  const prereqMatch = fullText.match(/Prerequisite[s]?[:\s]*([^\n.]+)/i)
  
  return {
    name,
    description,
    prerequisite: prereqMatch ? prereqMatch[1].trim() : null,
    source: new URL(url).hostname,
    creator_url: url
  }
}

function parseFromContentTypeHint(
  hint: string,
  html: string,
  url: string,
): { result: Record<string, unknown>; tableName: CompendiumTable } | null {
  switch (hint) {
    case "species":
      return { result: parseSpecies(html, url), tableName: "species" }
    case "classes":
      return { result: parseClass(html, url), tableName: "classes" }
    case "backgrounds":
      return { result: parseBackground(html, url), tableName: "backgrounds" }
    case "spells":
      return { result: parseSpell(html, url), tableName: "spells" }
    case "feats":
      return { result: parseFeat(html, url), tableName: "feats" }
    default:
      return null
  }
}

function parseFromUrl(path: string, html: string, url: string): { result: Record<string, unknown>; tableName: CompendiumTable } | null {
  const pathLower = path.toLowerCase()

  const classNames = ["artificer", "barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"]
  const isClassPage = classNames.some((c) => pathLower.includes(`/${c}:`))

  if (pathLower.includes("/lineage:") || pathLower.includes("/species:") || pathLower.includes("/race:")) {
    return { result: parseSpecies(html, url), tableName: "species" }
  }
  if (pathLower.includes("/class:") || isClassPage) {
    return { result: parseClass(html, url), tableName: "classes" }
  }
  if (pathLower.includes("/background:")) {
    return { result: parseBackground(html, url), tableName: "backgrounds" }
  }
  if (pathLower.includes("/spell:")) {
    return { result: parseSpell(html, url), tableName: "spells" }
  }
  if (pathLower.includes("/feat:")) {
    return { result: parseFeat(html, url), tableName: "feats" }
  }

  const $ = cheerio.load(html)
  const pageTitle = $("#page-title").text().toLowerCase()
  const breadcrumb = $(".breadcrumb, .page-tags").text().toLowerCase()

  if (pageTitle.includes("spell") || breadcrumb.includes("spell")) {
    return { result: parseSpell(html, url), tableName: "spells" }
  }
  if (pageTitle.includes("feat") || breadcrumb.includes("feat")) {
    return { result: parseFeat(html, url), tableName: "feats" }
  }
  if (breadcrumb.includes("class") || pageTitle.includes("class")) {
    return { result: parseClass(html, url), tableName: "classes" }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const { url, contentType } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    // Validate URL
    const parsedUrl = new URL(url)
    const allowedHosts = ["dnd2024.wikidot.com", "www.dnd2024.wikidot.com"]
    
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "URL not from a supported source. Supported: dnd2024.wikidot.com" },
        { status: 400 }
      )
    }

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const html = await fetchPage(url)
    const path = parsedUrl.pathname.toLowerCase()

    const contentTypeHint =
      typeof contentType === "string" && contentType !== "all" ? contentType : null

    if (
      contentTypeHint &&
      !IMPORT_CONTENT_TYPE_HINTS.some((hint) => hint.value === contentTypeHint)
    ) {
      return NextResponse.json({ error: "Invalid content type hint." }, { status: 400 })
    }

    let parsed: { result: Record<string, unknown>; tableName: CompendiumTable } | null = null

    if (contentTypeHint) {
      parsed = parseFromContentTypeHint(contentTypeHint, html, url)
      if (!parsed) {
        const label =
          IMPORT_CONTENT_TYPE_HINTS.find((hint) => hint.value === contentTypeHint)?.label ??
          contentTypeHint
        return NextResponse.json(
          {
            error: `Web import does not support the "${label}" content type hint. Use Auto-detect or try text/PDF import.`,
          },
          { status: 400 },
        )
      }
    } else {
      parsed = parseFromUrl(path, html, url)
      if (!parsed) {
        return NextResponse.json(
          {
            error:
              "Could not determine content type from URL. Try URLs like /lineage:elf, /class:fighter, /spell:fireball, /feat:alert, or /background:sage, or set a content type hint.",
          },
          { status: 400 },
        )
      }
    }

    const { result, tableName } = parsed

    let row = result
    if (tableName === "backgrounds") {
      const spells = (await listRows("spells")) as { id: string; name: string }[]
      row = finalizeBackgroundImportRow(row, spells)
    }

    await upsertByName(tableName, [row])

    return NextResponse.json({
      success: true,
      count: 1,
      source: parsedUrl.hostname,
      imported: {
        type: tableName,
        name: result.name
      }
    })
  } catch (error) {
    console.error("Web import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import from web" },
      { status: 500 }
    )
  }
}
