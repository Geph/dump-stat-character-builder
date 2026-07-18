import type { StatContributionSourceType } from "@/lib/character/stat-contributions"
import type { AppThemeId } from "@/lib/themes/app-themes"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

/** Row backgrounds for proficient saves, skills, and similar sheet tiles. */
export const SHEET_STATUS_ROW = {
  saveProficient: "bg-sky/15 text-foreground font-medium border border-sky/25",
  skillProficient:
    "bg-lime/12 text-foreground font-medium border border-lime/20",
  skillCustom:
    "bg-violet/12 text-foreground font-medium border border-violet/20",
  muted: "bg-muted/50 text-muted-foreground",
} as const

export const SHEET_STATUS_BADGE = {
  expertise:
    "text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-orange/15 text-orange border border-orange/25",
  customSkill:
    "text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-violet/15 text-violet border border-violet/25",
} as const

/** Character sheet header chips (species, background, etc.). */
export const SHEET_BANNER_BADGE = {
  species:
    "px-2 py-0.5 rounded-full text-xs font-medium bg-lime/12 text-foreground border border-lime/22",
  size: "px-2 py-0.5 rounded-full text-xs font-medium bg-muted/40 text-foreground border border-border/40",
  background:
    "px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/18 text-foreground border border-secondary/30",
} as const

/** Status chips in the banner lower row (bloodied, conditions, etc.). */
export const SHEET_BANNER_CHIP = {
  bloodied:
    "inline-flex items-center gap-0.5 rounded-md border border-amber-500/28 bg-amber-500/10 px-1.5 py-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300",
  exhaustion:
    "inline-flex items-center gap-0.5 rounded-md border border-amber-500/28 bg-amber-500/10 px-1.5 py-1 text-[10px] font-semibold text-amber-900 dark:text-amber-200",
  condition:
    "inline-flex items-center gap-0.5 rounded-md border border-destructive/28 bg-destructive/10 px-1.5 py-1 text-[10px] font-semibold text-destructive",
  concentration:
    "inline-flex items-center gap-0.5 rounded-md border border-purple-500/28 bg-purple-500/12 px-1.5 py-1 text-[10px] font-semibold text-purple-800 dark:text-purple-300",
} as const

/** Banner toolbar buttons — lighter fills over portrait/banner art. */
export const SHEET_BANNER_BUTTON = {
  icon: "border-border/50 bg-card/45 hover:border-primary hover:text-foreground",
  conditionsDefault:
    "border-destructive/70 bg-destructive/90 text-destructive-foreground hover:border-destructive/80 hover:bg-destructive/95",
  conditionsActive:
    "border-destructive/80 bg-destructive/95 text-destructive-foreground hover:bg-destructive",
  inspirationActive: "border-amber-500/45 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  inspirationIdle:
    "border-border/50 bg-card/45 text-muted-foreground hover:border-amber-500/30 hover:text-amber-600",
  manualRoll:
    "border-cyan/45 bg-cyan/12 text-cyan hover:border-cyan/65 hover:bg-cyan/18",
  toggleActive: "border-destructive/35 bg-destructive/10 text-destructive",
  toggleIdle: "border-border/50 bg-card/45 text-muted-foreground hover:bg-muted/35",
  rest: "border-border/50 bg-background/45 hover:bg-muted/35 hover:text-foreground",
  select: "border-border/50 bg-card/45",
} as const

/** Panel fill — opacity = 100% minus transparency percentage. */
export const SHEET_PANEL = {
  /** 35% transparent */
  faint: "bg-card/65",
  /** 20% transparent */
  medium: "bg-card/80",
  /** 10% transparent */
  solid: "bg-card/90",
} as const

/** Abilities tab panel backgrounds. */
export const SHEET_ABILITIES_PANEL = {
  skills: "bg-card/75",
  proficiencies: "bg-card/85",
  abilityScores: SHEET_PANEL.medium,
  actions: SHEET_PANEL.solid,
} as const

/** Combat tab panel backgrounds. */
export const SHEET_COMBAT_PANEL = {
  combatStats: SHEET_PANEL.faint,
  initiative: SHEET_PANEL.faint,
  savingThrows: SHEET_PANEL.medium,
  spells: SHEET_PANEL.medium,
  spellcastingResources: SHEET_PANEL.solid,
  actions: SHEET_PANEL.solid,
} as const

export const SHEET_EQUIPMENT_PANEL = SHEET_PANEL.solid
export const SHEET_FEATURES_PANEL = SHEET_PANEL.medium
export const SHEET_DETAILS_PANEL = SHEET_PANEL.faint

/** Sheet section tab buttons — 10% transparent. */
export const SHEET_TAB_BUTTON = {
  active: "bg-primary/90 text-primary-foreground",
  idle: "bg-card/90 text-muted-foreground hover:bg-muted/90",
} as const

/** Character sheet `<main>` — consistent width on md+ across every tab. */
export const SHEET_MAIN_CLASS =
  "w-full min-w-0 max-w-5xl xl:max-w-7xl mx-auto px-4 py-4 overflow-x-clip"

/** Tab panel wrapper — keeps grid/flex children from widening the main column. */
export const SHEET_TAB_CONTENT_CLASS = "w-full min-w-0"

const ARCANE_ABILITY_SCORE_COLORS: Record<AbilityScoreKey, string> = {
  strength: "bg-red-500",
  dexterity: "bg-green-500",
  constitution: "bg-orange-500",
  intelligence: "bg-blue-500",
  wisdom: "bg-purple-500",
  charisma: "bg-pink-500",
}

export function abilityScoreBoxClass(theme: AppThemeId, ability: AbilityScoreKey): string {
  const base = "w-10 h-10 rounded-lg flex items-center justify-center mx-auto"
  if (theme === "arcane") {
    return `${base} ${ARCANE_ABILITY_SCORE_COLORS[ability]}`
  }
  return `${base} bg-secondary`
}

export function abilityScoreValueClass(theme: AppThemeId): string {
  return theme === "arcane"
    ? "text-sm font-black text-white"
    : "text-sm font-black text-secondary-foreground"
}

/** Action cards on the combat / abilities tabs. */
export const SHEET_ACTION_CARD = {
  default: "border-border/70 bg-muted/25",
  classResource: "border-cyan/35 bg-cyan/10",
  classResourceHover: "hover:border-cyan/55 hover:bg-cyan/15",
  defaultHover: "hover:border-primary/50 hover:bg-muted/40",
} as const

export const SHEET_ACTION_USAGE_DOT = {
  default: {
    spent: "border-primary bg-primary",
    available: "border-border bg-background hover:border-primary/50",
  },
  classResource: {
    spent: "border-cyan bg-cyan",
    available: "border-cyan/40 bg-background hover:border-cyan/60",
  },
} as const

export const SHEET_DEATH_SAVE_BOX =
  "rounded-lg border border-border/80 bg-muted/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"

const WEAPON_MODIFIER_BADGE_BY_SOURCE: Record<StatContributionSourceType | "default", string> = {
  class: "border-orange/35 bg-orange/12 text-foreground",
  feat: "border-lemon/35 bg-lemon/12 text-foreground",
  species: "border-lime/35 bg-lime/12 text-foreground",
  feature: "border-violet/35 bg-violet/12 text-foreground",
  background: "border-secondary/40 bg-secondary/10 text-foreground",
  item: "border-cyan/35 bg-cyan/10 text-foreground",
  ability: "border-accent/30 bg-accent/10 text-foreground",
  base: "border-border bg-muted/60 text-foreground",
  default: "border-primary/30 bg-primary/10 text-foreground",
}

export function weaponModifierBadgeClass(
  sourceType: StatContributionSourceType | undefined,
): string {
  const tone = sourceType ?? "default"
  return WEAPON_MODIFIER_BADGE_BY_SOURCE[tone] ?? WEAPON_MODIFIER_BADGE_BY_SOURCE.default
}
