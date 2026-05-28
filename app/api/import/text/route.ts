import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"

// Schema for AI extraction - same as PDF
const ContentSchema = z.object({
  species: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    speed: z.number().nullable(),
    size: z.string().nullable(),
    traits: z.array(z.object({
      name: z.string(),
      description: z.string()
    }))
  })).optional(),
  classes: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    hit_die: z.number(),
    primary_ability: z.array(z.string()).nullable(),
    saving_throws: z.array(z.string()).nullable(),
    armor_proficiencies: z.array(z.string()).nullable(),
    weapon_proficiencies: z.array(z.string()).nullable(),
    skill_choices: z.object({
      count: z.number(),
      options: z.array(z.string())
    }).nullable(),
    spellcasting: z.object({
      ability: z.string(),
      cantrips: z.number().optional(),
      spells_known: z.number().optional(),
      prepared: z.boolean().optional()
    }).nullable(),
    features: z.array(z.object({
      level: z.number(),
      name: z.string(),
      description: z.string()
    }))
  })).optional(),
  subclasses: z.array(z.object({
    name: z.string(),
    class_name: z.string(),
    description: z.string().nullable(),
    features: z.array(z.object({
      level: z.number(),
      name: z.string(),
      description: z.string()
    }))
  })).optional(),
  backgrounds: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    skill_proficiencies: z.array(z.string()).nullable(),
    feat_granted: z.string().nullable(),
    ability_bonuses: z.record(z.string(), z.number()).nullable()
  })).optional(),
  spells: z.array(z.object({
    name: z.string(),
    level: z.number(),
    school: z.string(),
    casting_time: z.string().nullable(),
    range: z.string().nullable(),
    components: z.array(z.string()).nullable(),
    duration: z.string().nullable(),
    concentration: z.boolean(),
    description: z.string().nullable(),
    classes: z.array(z.string()).nullable()
  })).optional(),
  feats: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    prerequisite: z.string().nullable()
  })).optional(),
  equipment: z.array(z.object({
    name: z.string(),
    category: z.string(),
    subcategory: z.string().nullable(),
    description: z.string().nullable()
  })).optional(),
  abilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    source_type: z.enum(["class", "subclass", "species", "background", "feat", "item"]).nullable(),
    source_name: z.string().nullable(),
    level_requirement: z.number().nullable()
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, contentType } = body
    
    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: "Please provide more text content to parse" }, { status: 400 })
    }

    // Truncate text if too long (AI context limits)
    const maxLength = 50000
    const truncatedText = text.length > maxLength 
      ? text.slice(0, maxLength) + "\n...[truncated]" 
      : text

    // Build prompt based on content type filter
    let systemPrompt = `You are a D&D 2024 content parser. Extract game content from the provided text.
      
Important D&D 2024 rules:
- "Species" is the new term (not "Race")
- Backgrounds grant ability score bonuses (+2 to one, +1 to another, or +1/+1/+1)
- Backgrounds grant a 1st-level feat
- Species no longer grant ability score bonuses
- Class features are tied to specific levels
- Subclass features typically come at levels 3, 7, 10, 15, and 18

Extract ONLY the content types you find in the text. Return empty arrays for types not present.
Be thorough and extract all instances of each content type found.
For class features, include the level they are gained at.
For subclasses, include the parent class name in class_name field.`

    if (contentType && contentType !== "all") {
      systemPrompt += `\n\nFocus primarily on extracting: ${contentType}. You may still extract other content types if clearly present.`
    }

    // Use AI to extract structured content
    const result = await generateText({
      model: "openai/gpt-4o",
      system: systemPrompt,
      prompt: `Extract D&D content from this text:\n\n${truncatedText}`,
      output: Output.object({ schema: ContentSchema })
    })

    const content = result.output
    const supabase = await createClient()
    let totalImported = 0
    const breakdown: Record<string, number> = {}

    // Insert species
    if (content.species && content.species.length > 0) {
      const { error } = await supabase
        .from("species")
        .upsert(content.species.map(s => ({ ...s, source: "Text Import" })), { onConflict: "name" })
      if (!error) {
        totalImported += content.species.length
        breakdown.species = content.species.length
      }
    }

    // Insert classes
    if (content.classes && content.classes.length > 0) {
      const { error } = await supabase
        .from("classes")
        .upsert(content.classes.map(c => ({ ...c, source: "Text Import" })), { onConflict: "name" })
      if (!error) {
        totalImported += content.classes.length
        breakdown.classes = content.classes.length
      }
    }

    // Insert subclasses - need to look up class_id first
    if (content.subclasses && content.subclasses.length > 0) {
      // Get class IDs
      const classNames = [...new Set(content.subclasses.map(sc => sc.class_name))]
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name")
        .in("name", classNames)
      
      const classIdMap = new Map(classData?.map(c => [c.name, c.id]) || [])
      
      const subclassesWithIds = content.subclasses.map(sc => ({
        name: sc.name,
        description: sc.description,
        features: sc.features,
        source: "Text Import",
        class_id: classIdMap.get(sc.class_name) || null,
      })).filter(sc => sc.class_id !== null)

      if (subclassesWithIds.length > 0) {
        // Delete existing text import subclasses with same names, then insert
        for (const sc of subclassesWithIds) {
          await supabase.from("subclasses").delete().eq("name", sc.name).eq("source", "Text Import")
        }
        const { error } = await supabase.from("subclasses").insert(subclassesWithIds)
        if (!error) {
          totalImported += subclassesWithIds.length
          breakdown.subclasses = subclassesWithIds.length
        }
      }
    }

    // Insert backgrounds
    if (content.backgrounds && content.backgrounds.length > 0) {
      const { error } = await supabase
        .from("backgrounds")
        .upsert(content.backgrounds.map(b => ({ ...b, source: "Text Import" })), { onConflict: "name" })
      if (!error) {
        totalImported += content.backgrounds.length
        breakdown.backgrounds = content.backgrounds.length
      }
    }

    // Insert spells
    if (content.spells && content.spells.length > 0) {
      const { error } = await supabase
        .from("spells")
        .upsert(content.spells.map(s => ({ ...s, source: "Text Import" })), { onConflict: "name" })
      if (!error) {
        totalImported += content.spells.length
        breakdown.spells = content.spells.length
      }
    }

    // Insert feats
    if (content.feats && content.feats.length > 0) {
      const { error } = await supabase
        .from("feats")
        .upsert(content.feats.map(f => ({ ...f, source: "Text Import" })), { onConflict: "name" })
      if (!error) {
        totalImported += content.feats.length
        breakdown.feats = content.feats.length
      }
    }

    // Insert equipment
    if (content.equipment && content.equipment.length > 0) {
      const { error } = await supabase
        .from("equipment")
        .upsert(content.equipment.map(e => ({ ...e, source: "Text Import" })), { onConflict: "name" })
      if (!error) {
        totalImported += content.equipment.length
        breakdown.equipment = content.equipment.length
      }
    }

    // Insert abilities
    if (content.abilities && content.abilities.length > 0) {
      const { error } = await supabase
        .from("abilities")
        .upsert(content.abilities.map(a => ({ ...a, source: "Text Import" })), { onConflict: "name" })
      if (!error) {
        totalImported += content.abilities.length
        breakdown.abilities = content.abilities.length
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: totalImported,
      breakdown
    })
  } catch (error) {
    console.error("Text import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import text" },
      { status: 500 }
    )
  }
}
