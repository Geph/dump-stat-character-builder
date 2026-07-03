type FeatImportLike = {
  name: string
  description?: string | null
  prerequisite?: string | null
  category?: string | null
}

/** Infer feat category and prerequisite from description when the LLM omits structured fields. */
export function inferFeatImportFields<T extends FeatImportLike>(feat: T): T {
  const description = feat.description?.trim() ?? ""
  let category = feat.category?.trim() || null
  let prerequisite = feat.prerequisite?.trim() || null

  if (!prerequisite) {
    const inline = description.match(/\(Prerequisite:\s*([^)]+)\)/i)
    if (inline?.[1]) prerequisite = inline[1].trim()
  }

  if (!category || category === "General") {
    const header = description.slice(0, 200)
    if (/planar\s+pact\s+feat/i.test(header) || /can'?t have another planar pact feat/i.test(header)) {
      category = "Planar Pact"
    }
    if (/\bmystic\s+technique\b/i.test(header)) {
      category = "Mystic Technique"
    }
  }

  return {
    ...feat,
    category: category ?? feat.category ?? null,
    prerequisite: prerequisite ?? feat.prerequisite ?? null,
  }
}
