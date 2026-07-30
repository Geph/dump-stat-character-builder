export type IllusionTokenKind = "projected_self" | "imaginary_ally"

export type IllusionTokenState = {
  id: string
  kind: IllusionTokenKind
  label: string
  ac: number | null
  currentHp: number
  maxHp: 1
  notes: string
}

export function createIllusionToken(params: {
  kind: IllusionTokenKind
  label?: string
  ac?: number | null
  notes?: string
}): IllusionTokenState {
  const kind = params.kind
  const defaults =
    kind === "projected_self"
      ? {
          label: "Projected Self",
          notes:
            "Concentration. Move up to your speed as a bonus action. Cast from the illusion's space. Reaction: swap places with it (dismisses).",
        }
      : {
          label: "Imaginary Ally",
          notes:
            "Illusory double. Bonus Action: command it to make a melee/ranged spell attack (1d8+INT psychic). Destroyed at 0 HP or when you dismiss it.",
        }
  return {
    id: `illusion_${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    kind,
    label: params.label?.trim() || defaults.label,
    ac: params.ac ?? null,
    currentHp: 1,
    maxHp: 1,
    notes: params.notes?.trim() || defaults.notes,
  }
}

export function normalizeIllusionTokens(raw: unknown): IllusionTokenState[] {
  if (!Array.isArray(raw)) return []
  const out: IllusionTokenState[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const row = entry as Partial<IllusionTokenState>
    if (row.kind !== "projected_self" && row.kind !== "imaginary_ally") continue
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : null
    if (!id) continue
    out.push({
      id,
      kind: row.kind,
      label:
        typeof row.label === "string" && row.label.trim()
          ? row.label.trim()
          : row.kind === "projected_self"
            ? "Projected Self"
            : "Imaginary Ally",
      ac: typeof row.ac === "number" ? row.ac : null,
      currentHp: typeof row.currentHp === "number" && row.currentHp > 0 ? 1 : 0,
      maxHp: 1,
      notes: typeof row.notes === "string" ? row.notes : "",
    })
  }
  return out
}

export function damageIllusionToken(
  tokens: IllusionTokenState[],
  tokenId: string,
): IllusionTokenState[] {
  return tokens
    .map((token) =>
      token.id === tokenId ? { ...token, currentHp: Math.max(0, token.currentHp - 1) } : token,
    )
    .filter((token) => token.currentHp > 0)
}

export function dismissIllusionToken(
  tokens: IllusionTokenState[],
  tokenId: string,
): IllusionTokenState[] {
  return tokens.filter((token) => token.id !== tokenId)
}
