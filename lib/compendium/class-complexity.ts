import type { DndClass } from "@/lib/types"

export type ClassComplexity = "easy" | "medium" | "hard"

export const CLASS_COMPLEXITY_OPTIONS: { value: ClassComplexity; label: string }[] = [
  { value: "easy", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "High" },
]

/** Default SRD 2024 class complexity tiers. */
export const SRD_CLASS_COMPLEXITY_BY_NAME: Record<string, ClassComplexity> = {
  Barbarian: "easy",
  Fighter: "easy",
  Rogue: "easy",
  Cleric: "medium",
  Monk: "medium",
  Paladin: "medium",
  Ranger: "medium",
  Warlock: "medium",
  Bard: "hard",
  Druid: "hard",
  Sorcerer: "hard",
  Wizard: "hard",
}

/** Default Mage Hand Press class complexity tiers (Low/Medium/High → easy/medium/hard). */
export const MHP_CLASS_COMPLEXITY_BY_NAME: Record<string, ClassComplexity> = {
  Alchemist: "medium",
  Captain: "medium",
  Craftsman: "hard",
  Dancer: "hard",
  Gunslinger: "medium",
  Investigator: "hard",
  Martyr: "medium",
  Necromancer: "hard",
  Vagabond: "hard",
  Warden: "medium",
  Warmage: "easy",
  Witch: "easy",
}

const MHP_UNIQUE_CLASS_NAMES = new Set(
  Object.keys(MHP_CLASS_COMPLEXITY_BY_NAME).filter((name) => name !== "Warden"),
)

function classNameBase(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || name
}

function isMageHandPressClass(name: string, source?: string | null): boolean {
  if (source && /mage\s*hand\s*press/i.test(source)) return true
  if (/\(\s*mage\s*hand\s*press\s*\)/i.test(name)) return true
  return MHP_UNIQUE_CLASS_NAMES.has(classNameBase(name))
}

export function isClassComplexity(value: unknown): value is ClassComplexity {
  return value === "easy" || value === "medium" || value === "hard"
}

export function resolveClassComplexity(
  cls: Pick<DndClass, "name" | "complexity"> & { source?: string | null },
): ClassComplexity | null {
  if (isClassComplexity(cls.complexity)) return cls.complexity
  return defaultClassComplexityForName(cls.name, cls.source)
}

export function formatClassComplexityLabel(complexity: ClassComplexity): string {
  return CLASS_COMPLEXITY_OPTIONS.find((option) => option.value === complexity)?.label ?? complexity
}

export function formatClassComplexityPhrase(complexity: ClassComplexity): string {
  return `${formatClassComplexityLabel(complexity)} Complexity`
}

export function defaultClassComplexityForName(
  name: string,
  source?: string | null,
): ClassComplexity | null {
  if (SRD_CLASS_COMPLEXITY_BY_NAME[name]) return SRD_CLASS_COMPLEXITY_BY_NAME[name]
  const base = classNameBase(name)
  const mhp = MHP_CLASS_COMPLEXITY_BY_NAME[base]
  if (mhp && isMageHandPressClass(name, source)) return mhp
  return null
}
