import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

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
  
  // Extract description from main content
  const mainContent = $("#page-content, .page-content, article").first()
  const description = mainContent.find("p").first().text().trim()
  
  // Extract traits
  const traits: { name: string; description: string }[] = []
  mainContent.find("h3, h4, strong").each((_, el) => {
    const traitName = $(el).text().trim()
    const traitDesc = $(el).next("p").text().trim()
    if (traitName && traitDesc && !traitName.includes("Ability") && !traitName.includes("Size")) {
      traits.push({ name: traitName, description: traitDesc })
    }
  })

  // Try to extract size and speed
  const fullText = mainContent.text()
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
  const name = $("#page-title").text().trim().replace(/^Class:\s*/i, "") || $("h1").first().text().trim()
  
  const mainContent = $("#page-content, .page-content, article").first()
  const description = mainContent.find("p").first().text().trim()
  
  // Try to extract hit die
  const fullText = mainContent.text()
  const hitDieMatch = fullText.match(/Hit\s*Die[:\s]*d(\d+)/i)
  
  // Extract features
  const features: { level: number; name: string; description: string }[] = []
  mainContent.find("h3, h4").each((_, el) => {
    const featureName = $(el).text().trim()
    const featureDesc = $(el).next("p").text().trim()
    // Try to extract level from feature name
    const levelMatch = featureName.match(/(\d+)(?:st|nd|rd|th)?\s*level/i)
    if (featureName && featureDesc) {
      features.push({
        level: levelMatch ? parseInt(levelMatch[1]) : 1,
        name: featureName.replace(/^\d+(?:st|nd|rd|th)?\s*level[:\s]*/i, ""),
        description: featureDesc
      })
    }
  })

  return {
    name,
    description,
    hit_die: hitDieMatch ? parseInt(hitDieMatch[1]) : 8,
    features: features.slice(0, 10), // Limit to first 10 features
    source: new URL(url).hostname,
    creator_url: url
  }
}

function parseBackground(html: string, url: string) {
  const $ = cheerio.load(html)
  const name = $("#page-title").text().trim().replace(/^Background:\s*/i, "") || $("h1").first().text().trim()
  
  const mainContent = $("#page-content, .page-content, article").first()
  const description = mainContent.find("p").first().text().trim()
  const fullText = mainContent.text()
  
  // Extract skill proficiencies
  const skillsMatch = fullText.match(/Skill\s*Proficiencies?[:\s]*([^.]+)/i)
  const skills = skillsMatch 
    ? skillsMatch[1].split(/[,&]/).map(s => s.trim()).filter(Boolean)
    : []
  
  // Extract feat
  const featMatch = fullText.match(/Feat[:\s]*([^.]+)/i)
  
  // Extract ability bonuses (D&D 2024 format)
  const abilityMatch = fullText.match(/Ability\s*Scores?[:\s]*([^.]+)/i)
  const ability_bonuses: Record<string, number> = {}
  if (abilityMatch) {
    const bonusText = abilityMatch[1].toLowerCase()
    const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
    abilities.forEach(ab => {
      if (bonusText.includes(ab)) {
        const match = bonusText.match(new RegExp(`${ab}[\\s:]*\\+?(\\d)`, "i"))
        if (match) ability_bonuses[ab] = parseInt(match[1])
      }
    })
  }

  return {
    name,
    description,
    skill_proficiencies: skills,
    feat_granted: featMatch ? featMatch[1].trim() : null,
    ability_bonuses: Object.keys(ability_bonuses).length > 0 ? ability_bonuses : null,
    source: new URL(url).hostname,
    creator_url: url
  }
}

function parseSpell(html: string, url: string) {
  const $ = cheerio.load(html)
  const name = $("#page-title").text().trim().replace(/^Spell:\s*/i, "") || $("h1").first().text().trim()
  
  const mainContent = $("#page-content, .page-content, article").first()
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
  
  // Get description (usually after the stat block)
  const description = mainContent.find("p").slice(1).first().text().trim() || mainContent.find("p").first().text().trim()
  
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
  
  const mainContent = $("#page-content, .page-content, article").first()
  const fullText = mainContent.text()
  
  // Get description
  const description = mainContent.find("p").first().text().trim()
  
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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
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

    const html = await fetchPage(url)
    const supabase = await createClient()
    const path = parsedUrl.pathname.toLowerCase()
    
    let result
    let tableName: string
    
    // More flexible path matching for dnd2024.wikidot.com
    // Common patterns: /lineage:elf, /class:fighter, /spell:fireball, /artificer:main (class), /feat:alert
    const pathLower = path.toLowerCase()
    
    // Class names on wikidot often use format like /artificer:main, /barbarian:main
    const classNames = ["artificer", "barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"]
    const isClassPage = classNames.some(c => pathLower.includes(`/${c}:`))
    
    if (pathLower.includes("/lineage:") || pathLower.includes("/species:") || pathLower.includes("/race:")) {
      result = parseSpecies(html, url)
      tableName = "species"
    } else if (pathLower.includes("/class:") || isClassPage) {
      result = parseClass(html, url)
      tableName = "classes"
    } else if (pathLower.includes("/background:")) {
      result = parseBackground(html, url)
      tableName = "backgrounds"
    } else if (pathLower.includes("/spell:")) {
      result = parseSpell(html, url)
      tableName = "spells"
    } else if (pathLower.includes("/feat:")) {
      result = parseFeat(html, url)
      tableName = "feats"
    } else {
      // Try to auto-detect from page content
      const $ = cheerio.load(html)
      const pageTitle = $("#page-title").text().toLowerCase()
      const breadcrumb = $(".breadcrumb, .page-tags").text().toLowerCase()
      
      if (pageTitle.includes("spell") || breadcrumb.includes("spell")) {
        result = parseSpell(html, url)
        tableName = "spells"
      } else if (pageTitle.includes("feat") || breadcrumb.includes("feat")) {
        result = parseFeat(html, url)
        tableName = "feats"
      } else if (breadcrumb.includes("class") || pageTitle.includes("class")) {
        result = parseClass(html, url)
        tableName = "classes"
      } else {
        return NextResponse.json(
          { error: "Could not determine content type from URL. Try URLs like /lineage:elf, /class:fighter, /spell:fireball, /feat:alert, or /background:sage" },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from(tableName)
      .upsert([result], { onConflict: "name" })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

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
