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

  // --- Occultist (KibblesTasty) ---
  if (/occultist/i.test(name)) {
    const cls = asRecord(Array.isArray(root.classes) ? root.classes[0] : null)
    const nested = Array.isArray(cls?.subclasses) ? cls!.subclasses : []
    const topSubs = Array.isArray(root.subclasses) ? root.subclasses : []
    if (nested.length && !topSubs.length) {
      findings.push({
        id: "occultist.nested_subclasses",
        severity: "error",
        message:
          "Traditions must be top-level subclasses[] — hoist out of classes[0].subclasses (Witch, Hedge Mage, Oracle, Shaman, Spiritualist, Voidwatcher)",
        path: "classes[0].subclasses",
      })
    }
    const spellcasting = asRecord(cls?.spellcasting)
    if (!spellcasting?.ability || spellcasting.caster_progression !== "full") {
      findings.push({
        id: "occultist.spellcasting_field",
        severity: "error",
        message:
          'Set classes[].spellcasting { ability: "Wisdom", caster_progression: "full", prepared: false } (Spells Known — not Investigator Occultist pact magic)',
        path: "classes[0].spellcasting",
      })
    } else if (spellcasting.prepared === true) {
      findings.push({
        id: "occultist.not_prepared",
        severity: "warn",
        message: "Occultist uses Spells Known — set prepared: false (not a prepared caster)",
        path: "classes[0].spellcasting",
      })
    }
    if (!res.some((r) => r.resource_key === "occult_rites_known")) {
      findings.push({
        id: "occultist.rites_known",
        severity: "error",
        message: "Missing class_resources.occult_rites_known (special choice count from Occult Rites column)",
        path: "class_resources",
      })
    }
    const rites = featureNamed(features, /^occult rites$/i)
    const riteChoices = asRecord(rites?.choices)
    if (rites && riteChoices?.optionsSource !== "class_knacks") {
      findings.push({
        id: "occultist.rites_knacks",
        severity: "error",
        message: 'Occult Rites must use choices.optionsSource "class_knacks"',
        path: "classes[0].features[Occult Rites].choices",
      })
    }
    if (rites && riteChoices?.swappableOnRest === true) {
      findings.push({
        id: "occultist.rites_no_rest_swap",
        severity: "warn",
        message:
          "Occult Rites swap on level-up only — set swappableOnRest: false (do not treat as rest-swappable)",
        path: "classes[0].features[Occult Rites].choices",
      })
    }
    if (!topSubs.length && !nested.length) {
      findings.push({
        id: "occultist.missing_traditions",
        severity: "error",
        message:
          "Missing Occult Traditions in subclasses[] (Witch, Hedge Mage, Oracle, Shaman, Spiritualist, Voidwatcher)",
        path: "subclasses",
      })
    }
  }

  // --- Beastheart (MCDM) ---
  if (/beastheart/i.test(name)) {
    if (!res.some((r) => r.resource_key === "ferocity")) {
      findings.push({
        id: "beastheart.ferocity",
        severity: "error",
        message:
          "Missing class_resources.ferocity (companion-owned special tracker — no class level table)",
        path: "class_resources",
      })
    } else {
      const ferocity = res.find((r) => r.resource_key === "ferocity")
      const uses = asRecord(ferocity?.uses)
      if (uses && uses.type !== "special") {
        findings.push({
          id: "beastheart.ferocity_special",
          severity: "warn",
          message: 'ferocity should use uses.type "special" (companion tracker, not a long-rest pool)',
          path: "class_resources[ferocity].uses",
        })
      }
    }
    const primal = featureNamed(features, /^primal exploits$/i)
    const primalChoices = asRecord(primal?.choices)
    if (primal && primalChoices?.optionsSource !== "class_knacks") {
      findings.push({
        id: "beastheart.primal_knacks",
        severity: "error",
        message: 'Primal Exploits must use choices.optionsSource "class_knacks"',
        path: "classes[0].features[Primal Exploits].choices",
      })
    }
    const companion = featureNamed(features, /^companion$/i)
    const companionMechs = Array.isArray(companion?.mechanics) ? companion!.mechanics : []
    const hasGrant = companionMechs.some((m) => asRecord(m)?.kind === "grant_creature")
    if (companion && !hasGrant) {
      findings.push({
        id: "beastheart.companion_grant",
        severity: "error",
        message: "Companion feature needs grant_creature + creatureChoiceOptions for companion creatures[]",
        path: "classes[0].features[Companion].mechanics",
      })
    }
    const creatures = Array.isArray(root.creatures) ? root.creatures : []
    if (creatures.length < 1) {
      findings.push({
        id: "beastheart.creatures",
        severity: "warn",
        message: "Beastheart should import companion creatures[] (Basilisk Companion, Owlbear Companion, …)",
        path: "creatures",
      })
    }
    const proposals = asRecord(root.import_proposals)
    const customs = Array.isArray(proposals?.custom_abilities) ? proposals!.custom_abilities : []
    for (const row of customs) {
      const a = asRecord(row)
      if (!a || a.ability_role !== "knack") continue
      if (
        a.source_type === "subclass" &&
        (/infernal bond/i.test(String(a.source_name ?? "")) ||
          /primordial bond/i.test(String(a.source_name ?? "")))
      ) {
        findings.push({
          id: "beastheart.subclass_exploit_knack",
          severity: "error",
          message: `Subclass exploit "${String(a.name)}" should not be ability_role knack (pollutes Primal Exploits) — use Infernal/Nature Exploits choices.options instead`,
          path: "import_proposals.custom_abilities",
        })
      }
    }
  }

  // --- KibblesTasty Warden (Endurance Dice) — not Mage Hand Press Warden ---
  if (/^warden$/i.test(name)) {
    const isKibbles =
      features.some(
        (f) =>
          /^endurance dice$/i.test(String(f.name ?? "")) ||
          /^mystic bulwark$/i.test(String(f.name ?? "")) ||
          /^primal manifestations$/i.test(String(f.name ?? "")),
      ) ||
      res.some(
        (r) =>
          r.resource_key === "endurance_dice" ||
          r.resource_key === "primal_manifestations" ||
          r.resource_key === "primal_manifestations_known",
      )
    const isMhp = features.some(
      (f) => /^interrupt$/i.test(String(f.name ?? "")) || /^survive$/i.test(String(f.name ?? "")),
    )
    if (isKibbles && !isMhp) {
      if (!res.some((r) => r.resource_key === "endurance_dice")) {
        findings.push({
          id: "kibbles_warden.endurance_dice",
          severity: "error",
          message: "Missing class_resources.endurance_dice (at_level pool from Endurance Dice column)",
          path: "class_resources",
        })
      }
      if (!res.some((r) => r.resource_key === "endurance_die_size")) {
        findings.push({
          id: "kibbles_warden.endurance_die_size",
          severity: "error",
          message:
            "Missing class_resources.endurance_die_size (special die-size companion to endurance_dice)",
          path: "class_resources",
        })
      }
      if (
        res.some((r) => r.resource_key === "primal_manifestations_known") &&
        !res.some((r) => r.resource_key === "primal_manifestations")
      ) {
        findings.push({
          id: "kibbles_warden.manifestations_key",
          severity: "error",
          message:
            'Use resource_key "primal_manifestations" (not primal_manifestations_known) for the Manifestations Known column',
          path: "class_resources",
        })
      }
      if (!res.some((r) => r.resource_key === "primal_manifestations")) {
        findings.push({
          id: "kibbles_warden.primal_manifestations",
          severity: "error",
          message:
            "Missing class_resources.primal_manifestations (special choice count from Primal Manifestation column)",
          path: "class_resources",
        })
      }
      const manifestations = featureNamed(features, /^primal manifestations$/i)
      const manChoices = asRecord(manifestations?.choices)
      if (manifestations && manChoices?.optionsSource !== "class_knacks") {
        findings.push({
          id: "kibbles_warden.manifestations_knacks",
          severity: "error",
          message: 'Primal Manifestations must use choices.optionsSource "class_knacks"',
          path: "classes[0].features[Primal Manifestations].choices",
        })
      }
      if (manifestations && manChoices?.resourceKey === "primal_manifestations_known") {
        findings.push({
          id: "kibbles_warden.manifestations_resource_key",
          severity: "error",
          message: 'Primal Manifestations choices.resourceKey must be "primal_manifestations"',
          path: "classes[0].features[Primal Manifestations].choices.resourceKey",
        })
      }
      if (manifestations && manChoices?.swappableOnRest === true) {
        findings.push({
          id: "kibbles_warden.manifestations_no_rest_swap",
          severity: "warn",
          message:
            "Primal Manifestations swap on level-up only — set swappableOnRest: false",
          path: "classes[0].features[Primal Manifestations].choices",
        })
      }
      const bond = featureNamed(features, /^warden bond$/i)
      if (bond && (bond.isChoice === true || asRecord(bond.choices))) {
        findings.push({
          id: "kibbles_warden.bond_not_picker",
          severity: "warn",
          message:
            "Warden Bond should be a short unlock blurb — bonds live in subclasses[], not isChoice stub options",
          path: "classes[0].features[Warden Bond]",
        })
      }
      const clsRow = asRecord(Array.isArray(root.classes) ? root.classes[0] : null)
      const nestedBonds = Array.isArray(clsRow?.subclasses) ? clsRow!.subclasses : []
      const topBonds = Array.isArray(root.subclasses) ? root.subclasses : []
      if (!topBonds.length && !nestedBonds.length) {
        findings.push({
          id: "kibbles_warden.missing_bonds",
          severity: "warn",
          message:
            "Missing Warden Bonds in subclasses[] (Elemental Soul, Beasthide, Elderheart, …) — usually in a separate subclasses paste",
          path: "subclasses",
        })
      }
      const proposals = asRecord(root.import_proposals)
      const customs = Array.isArray(proposals?.custom_abilities) ? proposals!.custom_abilities : []
      const knacks = customs.filter((row) => asRecord(row)?.ability_role === "knack")
      if (knacks.length < 1) {
        findings.push({
          id: "kibbles_warden.missing_manifestation_knacks",
          severity: "warn",
          message:
            "Primal Manifestations library missing — emit import_proposals.custom_abilities with ability_role knack (usually from subclasses / manifestations paste)",
          path: "import_proposals.custom_abilities",
        })
      }
    }
  }

  // --- KibblesTasty Inventor ---
  if (/inventor/i.test(name)) {
    if (!res.some((r) => r.resource_key === "upgrades")) {
      findings.push({
        id: "inventor.upgrades",
        severity: "error",
        message: "Missing class_resources.upgrades (special choice count from Upgrades column)",
        path: "class_resources",
      })
    } else {
      const upgrades = res.find((r) => r.resource_key === "upgrades")
      const uses = asRecord(upgrades?.uses)
      if (uses && uses.type !== "special") {
        findings.push({
          id: "inventor.upgrades_special",
          severity: "error",
          message: 'upgrades must use uses.type "special" (choice count, not a spendable pool)',
          path: "class_resources[upgrades].uses",
        })
      }
    }
    const upgradeFeat = featureNamed(features, /^specialization upgrade$/i)
    const upgradeChoices = asRecord(upgradeFeat?.choices)
    if (upgradeFeat && upgradeChoices?.optionsSource !== "class_upgrades") {
      findings.push({
        id: "inventor.upgrades_picker",
        severity: "error",
        message: 'Specialization Upgrade must use choices.optionsSource "class_upgrades"',
        path: "classes[0].features[Specialization Upgrade].choices",
      })
    }
    if (upgradeFeat && upgradeChoices?.swappableOnRest === true) {
      findings.push({
        id: "inventor.upgrades_no_rest_swap",
        severity: "warn",
        message: "Specialization Upgrades swap on level-up only — set swappableOnRest: false",
        path: "classes[0].features[Specialization Upgrade].choices",
      })
    }
    const clsRow = asRecord(Array.isArray(root.classes) ? root.classes[0] : null)
    const spellcasting = asRecord(clsRow?.spellcasting)
    if (spellcasting && spellcasting.prepared === true) {
      findings.push({
        id: "inventor.not_prepared",
        severity: "warn",
        message: "Inventor uses Spells Known — set prepared: false (not Artificer-style prepared)",
        path: "classes[0].spellcasting",
      })
    }
    if (spellcasting && spellcasting.caster_progression && spellcasting.caster_progression !== "half") {
      findings.push({
        id: "inventor.half_caster",
        severity: "warn",
        message: 'Inventor should use caster_progression "half"',
        path: "classes[0].spellcasting",
      })
    }
    const nestedSpecs = Array.isArray(clsRow?.subclasses) ? clsRow!.subclasses : []
    const topSpecs = Array.isArray(root.subclasses) ? root.subclasses : []
    if (!topSpecs.length && !nestedSpecs.length) {
      findings.push({
        id: "inventor.missing_specializations",
        severity: "error",
        message:
          "Missing Inventor specializations in subclasses[] (Gadgetsmith, Golemsmith, Infusionsmith, …)",
        path: "subclasses",
      })
    }
    const proposals = asRecord(root.import_proposals)
    const customs = Array.isArray(proposals?.custom_abilities) ? proposals!.custom_abilities : []
    const upgradeRows = customs.filter((row) => asRecord(row)?.ability_role === "upgrade")
    if (upgradeRows.length < 1) {
      findings.push({
        id: "inventor.missing_upgrade_leaves",
        severity: "warn",
        message:
          "Upgrade library missing — emit import_proposals.custom_abilities with ability_role upgrade (one row per upgrade, not section headers)",
        path: "import_proposals.custom_abilities",
      })
    }
    const allSpecs = [
      ...(Array.isArray(topSpecs) ? topSpecs : []),
      ...(Array.isArray(nestedSpecs) ? nestedSpecs : []),
    ]
    const hasRunesmith = allSpecs.some((sc) => /^runesmith$/i.test(String(asRecord(sc)?.name ?? "")))
    if (hasRunesmith) {
      const runes = res.find((r) => r.resource_key === "runes_marked")
      if (!runes) {
        findings.push({
          id: "inventor.runes_marked",
          severity: "error",
          message:
            "Runesmith present but missing class_resources.runes_marked (special subclass-scoped cap from Runic Marks)",
          path: "class_resources",
        })
      } else {
        const uses = asRecord(runes.uses)
        if (uses && uses.type !== "special") {
          findings.push({
            id: "inventor.runes_marked_special",
            severity: "error",
            message: 'runes_marked must use uses.type "special" (static cap, not a spendable pool)',
            path: "class_resources[runes_marked].uses",
          })
        }
        if (!/^runesmith$/i.test(String(runes.subclass_name ?? ""))) {
          findings.push({
            id: "inventor.runes_marked_subclass",
            severity: "warn",
            message: 'runes_marked should set subclass_name "Runesmith"',
            path: "class_resources[runes_marked].subclass_name",
          })
        }
      }
    }
    const hasRelicsmith = allSpecs.some((sc) => /^relicsmith$/i.test(String(asRecord(sc)?.name ?? "")))
    if (hasRelicsmith) {
      const justicar = allSpecs
        .flatMap((sc) => {
          const row = asRecord(sc)
          return Array.isArray(row?.features) ? (row!.features as JsonRecord[]) : []
        })
        .find((f) => /^justicar savant$/i.test(String(f.name ?? "")))
      const choices = asRecord(justicar?.choices)
      if (justicar && (!Array.isArray(choices?.options) || choices!.options.length < 1)) {
        findings.push({
          id: "inventor.justicar_second_path",
          severity: "warn",
          message:
            "Justicar Savant should be isChoice with Ordained Path options (additional path at 14th)",
          path: "subclasses[Relicsmith].features[Justicar Savant].choices",
        })
      }
    }
  }

  // --- LaserLlama Alternate Ranger ---
  if (/alternate\s+ranger/i.test(name) || ( /^ranger$/i.test(name) && res.some((r) => r.resource_key === "quarry_die"))) {
    if (!res.some((r) => r.resource_key === "quarry")) {
      findings.push({
        id: "altranger.quarry",
        severity: "error",
        message: "Missing class_resources.quarry (WIS-mod spendable pool with restoreBySpellSlot)",
        path: "class_resources",
      })
    }
    if (!res.some((r) => r.resource_key === "quarry_die")) {
      findings.push({
        id: "altranger.quarry_die",
        severity: "error",
        message: "Missing class_resources.quarry_die (special die size with dieSidesByLevel)",
        path: "class_resources",
      })
    } else {
      const die = res.find((r) => r.resource_key === "quarry_die")
      const uses = asRecord(die?.uses)
      if (!Array.isArray(uses?.dieSidesByLevel) || (uses!.dieSidesByLevel as unknown[]).length < 1) {
        findings.push({
          id: "altranger.quarry_die_sides",
          severity: "error",
          message: "quarry_die must use uses.dieSidesByLevel (not atLevelTable counts as die sides)",
          path: "class_resources[quarry_die].uses",
        })
      }
    }
    if (!res.some((r) => r.resource_key === "knacks_known")) {
      findings.push({
        id: "altranger.knacks_known",
        severity: "error",
        message: "Missing class_resources.knacks_known (special choice count)",
        path: "class_resources",
      })
    }
    const knacks = featureNamed(features, /^knacks$/i)
    const knackChoices = asRecord(knacks?.choices)
    if (knacks && knackChoices?.optionsSource !== "class_knacks") {
      findings.push({
        id: "altranger.knacks_picker",
        severity: "error",
        message: 'Knacks must use choices.optionsSource "class_knacks" + resourceKey knacks_known',
        path: "classes[0].features[Knacks].choices",
      })
    }
    const bounty = (Array.isArray(root.subclasses) ? root.subclasses : [])
      .map(asRecord)
      .find((sc) => /^bounty hunter$/i.test(String(sc?.name ?? "")))
    if (bounty) {
      const martial = Array.isArray(bounty.features)
        ? bounty.features.map(asRecord).find((f) => /^martial exploits$/i.test(String(f?.name ?? "")))
        : null
      const martialChoices = asRecord(martial?.choices)
      if (martial && martialChoices?.optionsSource === "class_knacks") {
        findings.push({
          id: "altranger.bounty_exploits_knacks",
          severity: "error",
          message:
            'Bounty Hunter Martial Exploits must NOT use optionsSource class_knacks (pollutes Ranger Knacks) — use inline choices.options like Beastheart Infernal/Nature',
          path: "subclasses[Bounty Hunter].features[Martial Exploits].choices",
        })
      }
      if (martial && (!Array.isArray(martialChoices?.options) || martialChoices!.options.length < 1)) {
        findings.push({
          id: "altranger.bounty_exploits_options",
          severity: "error",
          message: "Bounty Hunter Martial Exploits needs inline choices.options (Fighter exploit list)",
          path: "subclasses[Bounty Hunter].features[Martial Exploits].choices.options",
        })
      }
      if (!res.some((r) => r.resource_key === "exploit_degree")) {
        findings.push({
          id: "altranger.high_degree",
          severity: "warn",
          message:
            "Bounty Hunter High Degree column should be class_resources.exploit_degree (special cap 1/2/3)",
          path: "class_resources",
        })
      }
    }
    if (/^ranger$/i.test(name)) {
      findings.push({
        id: "altranger.rename",
        severity: "error",
        message: 'Class name must be "Alternate Ranger" (not bare "Ranger") to avoid PHB collision',
        path: "classes[0].name",
      })
    }
  }

  // --- LaserLlama Alternate Barbarian ---
  if (/alternate\s+barbarian/i.test(name)) {
    if (!res.some((r) => r.resource_key === "rage" || r.resource_key === "rages")) {
      findings.push({
        id: "altbarbarian.rage",
        severity: "error",
        message: 'Missing class_resources.rage (use resource_key "rage", not "rages")',
        path: "class_resources",
      })
    } else if (res.some((r) => r.resource_key === "rages")) {
      findings.push({
        id: "altbarbarian.rage_key",
        severity: "error",
        message: 'Rage pool must use resource_key "rage" (SRD/spend patterns), not "rages"',
        path: "class_resources[rages]",
      })
    } else {
      const rage = res.find((r) => r.resource_key === "rage")
      const uses = asRecord(rage?.uses)
      const table = Array.isArray(uses?.atLevelTable) ? (uses!.atLevelTable as JsonRecord[]) : []
      if (table.some((t) => Number(t.level) === 20 && Number(t.count) >= 50)) {
        findings.push({
          id: "altbarbarian.rage_unlimited",
          severity: "error",
          message:
            "Rage at 20th is Unlimited — use uses.freeUseAfterLevel: 20 (not a placeholder count of 100)",
          path: "class_resources[rage].uses",
        })
      }
    }
    if (!res.some((r) => r.resource_key === "exploit_dice")) {
      findings.push({
        id: "altbarbarian.exploit_dice",
        severity: "error",
        message: "Missing class_resources.exploit_dice (with dieSidesByLevel)",
        path: "class_resources",
      })
    }
    if (!res.some((r) => r.resource_key === "exploits_known")) {
      findings.push({
        id: "altbarbarian.exploits_known",
        severity: "error",
        message: "Missing class_resources.exploits_known (special choice count)",
        path: "class_resources",
      })
    }
    const savage = featureNamed(features, /^savage exploits$/i)
    const savageChoices = asRecord(savage?.choices)
    if (savage && savageChoices?.optionsSource !== "class_knacks") {
      findings.push({
        id: "altbarbarian.savage_exploits",
        severity: "error",
        message:
          'Savage Exploits must use choices.optionsSource "class_knacks" + resourceKey exploits_known',
        path: "classes[0].features[Savage Exploits].choices",
      })
    }
  }

  // --- LaserLlama Alternate Sorcerer ---
  if (/alternate\s+sorcerer/i.test(name)) {
    if (!res.some((r) => r.resource_key === "sorcery_points")) {
      findings.push({
        id: "altsorcerer.sorcery_points",
        severity: "error",
        message: "Missing class_resources.sorcery_points (point-pool caster)",
        path: "class_resources",
      })
    }
    if (!res.some((r) => r.resource_key === "spell_limit")) {
      findings.push({
        id: "altsorcerer.spell_limit",
        severity: "error",
        message: "Missing class_resources.spell_limit (base cast cost cap)",
        path: "class_resources",
      })
    }
    if (!res.some((r) => r.resource_key === "metamagics_known")) {
      findings.push({
        id: "altsorcerer.metamagics_known",
        severity: "error",
        message: "Missing class_resources.metamagics_known (special choice count)",
        path: "class_resources",
      })
    } else {
      const known = res.find((r) => r.resource_key === "metamagics_known")
      const uses = asRecord(known?.uses)
      if (uses && uses.type !== "special") {
        findings.push({
          id: "altsorcerer.metamagics_special",
          severity: "error",
          message: 'metamagics_known must use uses.type "special"',
          path: "class_resources[metamagics_known].uses",
        })
      }
    }
    const metamagic = featureNamed(features, /^metamagic$/i)
    const mmChoices = asRecord(metamagic?.choices)
    if (metamagic && mmChoices?.optionsSource !== "class_knacks") {
      findings.push({
        id: "altsorcerer.metamagic_picker",
        severity: "error",
        message:
          'Metamagic must use choices.optionsSource "class_knacks" + resourceKey metamagics_known (not grant_feat / PHB catalog)',
        path: "classes[0].features[Metamagic].choices",
      })
    }
    if (features.some((f) => /^subclass feature$/i.test(String(f.name ?? "")))) {
      findings.push({
        id: "altsorcerer.subclass_placeholders",
        severity: "error",
        message: 'Remove "Subclass Feature" placeholders — real Origin features live on subclasses[]',
        path: "classes[0].features",
      })
    }
    const draconic = (Array.isArray(root.subclasses) ? root.subclasses : [])
      .map(asRecord)
      .find((sc) => /^draconic sorcery$/i.test(String(sc?.name ?? "")))
    if (draconic) {
      const dFeats = Array.isArray(draconic.features) ? draconic.features : []
      const hasGap = dFeats.some((f) =>
        /level 3 content missing|open gap/i.test(String(asRecord(f)?.name ?? asRecord(f)?.description ?? "")),
      )
      const hasAncestor = dFeats.some((f) =>
        /^dragon ancestor$/i.test(String(asRecord(f)?.name ?? "")),
      )
      if (hasGap || !hasAncestor) {
        findings.push({
          id: "altsorcerer.draconic_gap",
          severity: "error",
          message:
            "Draconic Sorcery needs Dragon Ancestor / Draconic Resilience / Draconic Sorcery Spells at 3rd (fill from source — do not leave gap placeholders)",
          path: "subclasses[Draconic Sorcery].features",
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
