import { auditCustomAbilities } from "@/lib/import/homebrew-import-ops/merge-abilities"

/**
 * Structural wiring checklist for homebrew class import JSON.
 * Findings are advisory for the auditor; sanitizers apply auto-fixes where safe.
 */

export type WiringSeverity = "error" | "warn" | "info"

export type WiringFinding = {
  id: string
  severity: WiringSeverity
  message: string
  path?: string
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function className(content: JsonRecord): string {
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return ""
  const first = asRecord(classes[0])
  return typeof first?.name === "string" ? first.name : ""
}

function resources(content: JsonRecord): JsonRecord[] {
  const rows = content.class_resources
  return Array.isArray(rows) ? rows.map(asRecord).filter(Boolean) as JsonRecord[] : []
}

function classFeatures(content: JsonRecord): JsonRecord[] {
  const classes = content.classes
  if (!Array.isArray(classes) || !classes.length) return []
  const first = asRecord(classes[0])
  const features = first?.features
  return Array.isArray(features) ? features.map(asRecord).filter(Boolean) as JsonRecord[] : []
}

function featureNamed(features: JsonRecord[], name: RegExp): JsonRecord | undefined {
  return features.find((f) => typeof f.name === "string" && name.test(f.name))
}

export function auditImportWiring(content: unknown): WiringFinding[] {
  const root = asRecord(content)
  if (!root) return [{ id: "invalid_json", severity: "error", message: "Root must be a JSON object" }]

  const findings: WiringFinding[] = []
  const name = className(root)
  const res = resources(root)
  const features = classFeatures(root)

  // --- Investigator ---
  if (/investigator/i.test(name)) {
    const finisher = res.find((r) => String(r.resource_key ?? "").includes("finisher"))
    if (finisher && finisher.resource_key !== "finisher") {
      findings.push({
        id: "investigator.finisher_key",
        severity: "error",
        message: `Finisher resource_key must be "finisher" (got "${String(finisher.resource_key)}")`,
        path: "class_resources",
      })
    }
    const trinkets = featureNamed(features, /^trinkets$/i)
    if (trinkets?.isChoice || asRecord(trinkets?.choices)?.optionsSource === "class_upgrades") {
      findings.push({
        id: "investigator.trinkets_picker",
        severity: "error",
        message:
          "Class Trinkets must not be a class_upgrades picker (pool is spendable uses; subclass trinkets auto-grant)",
        path: "classes[0].features[Trinkets]",
      })
    }
    const equipment = Array.isArray(root.equipment) ? root.equipment : []
    const eqNames = new Set(
      equipment.map((e) => String(asRecord(e)?.name ?? "").toLowerCase()).filter(Boolean),
    )
    for (const holy of ["amulet of warding", "restorative ankh", "rune of banishment"]) {
      if (!eqNames.has(holy)) {
        findings.push({
          id: "investigator.holy_equipment",
          severity: "warn",
          message: `Holy Trinkets item missing from equipment[]: ${holy}`,
          path: "equipment",
        })
      }
    }
  }

  // --- Necromancer ---
  if (/necromancer/i.test(name)) {
    const charnel = res.find((r) => r.resource_key === "charnel_touch")
    const uses = asRecord(charnel?.uses)
    if (uses) {
      if (uses.type === "multiply_level" || (uses.multiplier != null && uses.atLevelMode !== "multiply_level")) {
        findings.push({
          id: "necromancer.charnel_uses_shape",
          severity: "error",
          message:
            'charnel_touch must use type "at_level" + atLevelMode "multiply_level" + atLevelTable [{level:1,count:5}] (never uses.type "multiply_level")',
          path: "class_resources[charnel_touch].uses",
        })
      }
    }
    const thralls = featureNamed(features, /^thralls$/i)
    if (thralls?.isChoice || asRecord(thralls?.choices)?.optionsSource === "class_upgrades") {
      findings.push({
        id: "necromancer.thralls_picker",
        severity: "error",
        message:
          "Thralls must not be a class_upgrades picker — use grant_creature + special caps thralls / thrall_cr_total",
        path: "classes[0].features[Thralls]",
      })
    }
    const cls = asRecord(Array.isArray(root.classes) ? root.classes[0] : null)
    const spellcasting = asRecord(cls?.spellcasting)
    if (!spellcasting?.ability || !spellcasting?.caster_progression) {
      findings.push({
        id: "necromancer.spellcasting_field",
        severity: "warn",
        message: 'Set classes[].spellcasting { ability: "Intelligence", caster_progression: "full" }',
        path: "classes[0].spellcasting",
      })
    }
    const lichdom = featureNamed(features, /^lichdom$/i)
    const mechanics = Array.isArray(lichdom?.mechanics) ? lichdom!.mechanics : []
    for (const mech of mechanics) {
      const m = asRecord(mech)
      if (!m) continue
      if (m.kind === "damage_resistance") {
        const types = Array.isArray(m.damageTypes) ? m.damageTypes.map(String) : []
        if (types.includes("Necrotic") && types.includes("Poison")) {
          findings.push({
            id: "necromancer.lichdom_immunity_kind",
            severity: "warn",
            message: "Lichdom Necrotic/Poison should use mechanics kind damage_immunity (not damage_resistance)",
            path: "classes[0].features[Lichdom].mechanics",
          })
        }
      }
    }
  }

  // --- Martyr ---
  if (/martyr/i.test(name)) {
    const spellUses = res.find((r) => r.resource_key === "spell_uses")
    const maxLevel = res.find((r) => r.resource_key === "max_spell_level")
    if (!spellUses) {
      findings.push({
        id: "martyr.spell_uses",
        severity: "error",
        message: "Missing class_resources.spell_uses (long-rest pool)",
        path: "class_resources",
      })
    }
    if (!maxLevel) {
      findings.push({
        id: "martyr.max_spell_level",
        severity: "warn",
        message: "Missing class_resources.max_spell_level (special cap)",
        path: "class_resources",
      })
    }
    const cls = asRecord(Array.isArray(root.classes) ? root.classes[0] : null)
    const spellcasting = asRecord(cls?.spellcasting)
    if (spellcasting?.caster_progression) {
      findings.push({
        id: "martyr.no_slot_progression",
        severity: "warn",
        message:
          "Martyr should not use normal caster_progression slots — Hit Point Spellcasting is narrative; keep spell_uses + max_spell_level",
        path: "classes[0].spellcasting",
      })
    }
  }

  // --- Vagabond ---
  if (/vagabond/i.test(name)) {
    const battle = res.find((r) => r.resource_key === "battle_dice")
    const battleUses = asRecord(battle?.uses)
    if (!battle) {
      findings.push({
        id: "vagabond.battle_dice",
        severity: "error",
        message: "Missing class_resources.battle_dice",
        path: "class_resources",
      })
    } else if (battleUses && battleUses.rechargeOnInitiative !== true && battleUses.rechargeOnInitiative !== 1) {
      findings.push({
        id: "vagabond.battle_dice_initiative",
        severity: "warn",
        message: "battle_dice should set uses.rechargeOnInitiative: true (full refill on Initiative)",
        path: "class_resources[battle_dice].uses",
      })
    }
    const tactics = featureNamed(features, /^battle tactics$/i)
    const choices = asRecord(tactics?.choices)
    if (!tactics) {
      findings.push({
        id: "vagabond.battle_tactics",
        severity: "error",
        message: "Missing Battle Tactics feature",
        path: "classes[0].features",
      })
    } else if (choices?.optionsSource !== "class_knacks") {
      findings.push({
        id: "vagabond.battle_tactics_knacks",
        severity: "error",
        message: 'Battle Tactics must use choices.optionsSource "class_knacks" (Maneuvers Known picker)',
        path: "classes[0].features[Battle Tactics].choices",
      })
    } else if (choices.resourceKey === "battle_dice" || choices.resourceKey === "maneuvers_known") {
      findings.push({
        id: "vagabond.battle_tactics_resource_key",
        severity: "warn",
        message:
          "Battle Tactics should not set choices.resourceKey to battle_dice or maneuvers_known — use choiceCountByLevel only",
        path: "classes[0].features[Battle Tactics].choices.resourceKey",
      })
    }
    const proposals = asRecord(root.import_proposals)
    const customs = Array.isArray(proposals?.custom_abilities) ? proposals!.custom_abilities : []
    for (const row of customs) {
      const a = asRecord(row)
      if (!a) continue
      if (a.source_type === "subclass" && a.ability_role === "knack") {
        findings.push({
          id: "vagabond.subclass_maneuver_knack",
          severity: "warn",
          message: `Subclass maneuver "${String(a.name)}" should not be ability_role knack (pollutes Maneuvers Known) — auto-grant via [Maneuver] feature instead`,
          path: `import_proposals.custom_abilities[${String(a.name)}]`,
        })
      }
    }
    const mageBrand = Array.isArray(root.subclasses)
      ? root.subclasses.map(asRecord).find((sc) => /^mage brand$/i.test(String(sc?.name ?? "")))
      : null
    if (mageBrand) {
      const spellbrand = Array.isArray(mageBrand.features)
        ? mageBrand.features.map(asRecord).find((f) => /^spellbranding$/i.test(String(f?.name ?? "")))
        : null
      const clsSpellcasting = asRecord(
        asRecord(Array.isArray(root.classes) ? root.classes[0] : null)?.spellcasting,
      )
      if (clsSpellcasting?.caster_progression) {
        findings.push({
          id: "vagabond.mage_brand_no_slots",
          severity: "warn",
          message:
            "Mage Brand should not put caster_progression on the base Vagabond class — Spellbrand casting spends Battle Dice",
          path: "classes[0].spellcasting",
        })
      }
      if (!spellbrand) {
        findings.push({
          id: "vagabond.spellbranding",
          severity: "warn",
          message: "Mage Brand missing Spellbranding feature",
          path: "subclasses[Mage Brand]",
        })
      }
    }
  }

  // --- Witch ---
  if (/^witch$/i.test(name) || /witch/i.test(name)) {
    const cls = asRecord(Array.isArray(root.classes) ? root.classes[0] : null)
    const spellcasting = asRecord(cls?.spellcasting)
    if (!spellcasting?.ability || spellcasting.caster_progression !== "full") {
      findings.push({
        id: "witch.spellcasting_field",
        severity: "error",
        message: 'Set classes[].spellcasting { ability: "Charisma", caster_progression: "full", prepared: true }',
        path: "classes[0].spellcasting",
      })
    }
    if (res.some((r) => r.resource_key === "grand_hexes_known")) {
      findings.push({
        id: "witch.grand_hexes_key",
        severity: "error",
        message: 'Use resource_key "grand_hexes" (not "grand_hexes_known")',
        path: "class_resources",
      })
    }
    if (!res.some((r) => r.resource_key === "grand_hexes" || r.resource_key === "grand_hexes_known")) {
      findings.push({
        id: "witch.grand_hexes_missing",
        severity: "warn",
        message: "Missing class_resources.grand_hexes (special cap for Grand Hex picks)",
        path: "class_resources",
      })
    }
    if (!res.some((r) => r.resource_key === "hexes_known")) {
      findings.push({
        id: "witch.hexes_known",
        severity: "warn",
        message: "Missing class_resources.hexes_known (special cap)",
        path: "class_resources",
      })
    }
    const grand = featureNamed(features, /^grand hex$/i)
    const grandMechanics = Array.isArray(grand?.mechanics) ? grand!.mechanics : []
    for (const mech of grandMechanics) {
      const m = asRecord(mech)
      if (!m || m.kind !== "grant_creature") continue
      const names = Array.isArray(m.creatureNames) ? m.creatureNames.map(String) : []
      if (names.some((n) => /abominable familiar/i.test(n))) {
        findings.push({
          id: "witch.grand_hex_auto_familiar",
          severity: "error",
          message:
            "Grand Hex must not auto-grant Abominable Familiar — keep it as a choice option only",
          path: "classes[0].features[Grand Hex].mechanics",
        })
      }
    }
    const hexes = featureNamed(features, /^hexes$/i)
    const hexMechanics = Array.isArray(hexes?.mechanics) ? hexes!.mechanics : []
    const hexCounts: number[] = []
    for (const mech of hexMechanics) {
      const m = asRecord(mech)
      if (!m || m.kind !== "spells_known") continue
      for (const g of Array.isArray(m.spellChoiceGrants) ? m.spellChoiceGrants : []) {
        const row = asRecord(g)
        if (row && row.level === 0 && typeof row.count === "number") hexCounts.push(row.count)
      }
    }
    const sorted = [...hexCounts].sort((a, b) => a - b)
    if (sorted.length >= 3 && sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4) {
      findings.push({
        id: "witch.hexes_cumulative_grants",
        severity: "warn",
        message:
          "Hexes spells_known grants look cumulative (2,3,4…) — use incremental counts with unlocksAtClassLevel (2 then +1 at 2/5/9/13/17)",
        path: "classes[0].features[Hexes].mechanics",
      })
    }
  }

  // --- Warmage ---
  if (/warmage/i.test(name)) {
    const cls = asRecord(Array.isArray(root.classes) ? root.classes[0] : null)
    const spellcasting = asRecord(cls?.spellcasting)
    if (!spellcasting?.ability) {
      findings.push({
        id: "warmage.spellcasting_ability",
        severity: "error",
        message: 'Set classes[].spellcasting { ability: "Intelligence" } (cantrips only — no base caster_progression)',
        path: "classes[0].spellcasting",
      })
    } else if (spellcasting.caster_progression) {
      findings.push({
        id: "warmage.no_base_slots",
        severity: "warn",
        message:
          "Base Warmage should not set caster_progression (cantrips only). House of Bishops uses subclass.spellcasting third caster.",
        path: "classes[0].spellcasting",
      })
    }
    if (!res.some((r) => r.resource_key === "arcane_surge")) {
      findings.push({
        id: "warmage.arcane_surge",
        severity: "error",
        message: "Missing class_resources.arcane_surge (2→3 uses; short regain 1 / long all)",
        path: "class_resources",
      })
    }
    if (!res.some((r) => r.resource_key === "tricks_known")) {
      findings.push({
        id: "warmage.tricks_known",
        severity: "warn",
        message: "Missing class_resources.tricks_known",
        path: "class_resources",
      })
    }
    const tricks = featureNamed(features, /^warmage tricks$/i)
    const trickChoices = asRecord(tricks?.choices)
    if (tricks && trickChoices?.optionsSource !== "class_knacks") {
      findings.push({
        id: "warmage.tricks_knacks",
        severity: "error",
        message: 'Warmage Tricks must use choices.optionsSource "class_knacks"',
        path: "classes[0].features[Warmage Tricks].choices",
      })
    }
    const spellFeat = featureNamed(features, /^spellcasting$/i)
    const spellMechanics = Array.isArray(spellFeat?.mechanics) ? spellFeat!.mechanics : []
    const cantripCounts: number[] = []
    for (const mech of spellMechanics) {
      const m = asRecord(mech)
      if (!m || m.kind !== "spells_known") continue
      for (const g of Array.isArray(m.spellChoiceGrants) ? m.spellChoiceGrants : []) {
        const row = asRecord(g)
        if (row && row.level === 0 && typeof row.count === "number") cantripCounts.push(row.count)
      }
    }
    const sorted = [...cantripCounts].sort((a, b) => a - b)
    if (sorted.length >= 3 && sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6) {
      findings.push({
        id: "warmage.cantrips_cumulative_grants",
        severity: "warn",
        message:
          "Spellcasting cantrip grants look cumulative (4,5,6…) — use incremental counts with unlocksAtClassLevel",
        path: "classes[0].features[Spellcasting].mechanics",
      })
    }
    const bishops = Array.isArray(root.subclasses)
      ? root.subclasses.map(asRecord).find((sc) => /^house of bishops$/i.test(String(sc?.name ?? "")))
      : null
    if (bishops) {
      const bishopCast = asRecord(bishops.spellcasting)
      if (bishopCast?.caster_progression !== "third") {
        findings.push({
          id: "warmage.bishops_third_caster",
          severity: "warn",
          message: 'House of Bishops should set spellcasting.caster_progression "third" (prepared INT)',
          path: "subclasses[House of Bishops].spellcasting",
        })
      }
    }
  }

  // --- Generic ---
  for (const row of res) {
    const uses = asRecord(row.uses)
    if (uses?.type === "multiply_level") {
      findings.push({
        id: "generic.multiply_level_type",
        severity: "error",
        message: `resource_key "${String(row.resource_key)}" has uses.type "multiply_level" — use type "at_level" + atLevelMode "multiply_level"`,
        path: `class_resources[${String(row.resource_key)}]`,
      })
    }
  }

  findings.push(...auditCustomAbilities(root))

  return findings
}

export function summarizeFindings(findings: WiringFinding[]): {
  errors: number
  warns: number
  infos: number
  ok: boolean
} {
  const errors = findings.filter((f) => f.severity === "error").length
  const warns = findings.filter((f) => f.severity === "warn").length
  const infos = findings.filter((f) => f.severity === "info").length
  return { errors, warns, infos, ok: errors === 0 }
}
