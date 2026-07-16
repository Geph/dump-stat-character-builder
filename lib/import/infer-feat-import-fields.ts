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

  // Prefer explicit Dark Gift / Planar Pact headers over a wrong LLM category (e.g. Dark Gift → Planar Pact).
  const header = description.slice(0, 240)
  const nameAndPrereq = `${feat.name}\n${prerequisite ?? ""}\n${header}`
  const explicitPlanarPact =
    /planar\s+pact\s+feat/i.test(header) || /can'?t have another planar pact feat/i.test(nameAndPrereq)
  const explicitDarkGift = /dark\s+gift\s+feat/i.test(nameAndPrereq) || /\bdark\s+gift\b/i.test(feat.name)

  if (explicitDarkGift) {
    category = "Dark Gift"
  } else if (explicitPlanarPact) {
    category = "Planar Pact"
  } else if (category === "Planar Pact") {
    // LLM often mis-tags Ravenloft Dark Gifts or Planescape Scion feats as Planar Pact.
    // Planar Pact is opt-in only via explicit pact language above.
    if (/ravenloft/i.test(prerequisite ?? "")) {
      category = "Dark Gift"
    } else {
      category = "General"
    }
  } else if (!category || category === "General") {
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
