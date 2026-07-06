import type { DndClass } from "@/lib/types"

export type ClassComplexity = "easy" | "medium" | "hard"

export const CLASS_COMPLEXITY_OPTIONS: { value: ClassComplexity; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
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

export function isClassComplexity(value: unknown): value is ClassComplexity {
  return value === "easy" || value === "medium" || value === "hard"
}

export function resolveClassComplexity(
  cls: Pick<DndClass, "name" | "complexity">,
): ClassComplexity | null {
  if (isClassComplexity(cls.complexity)) return cls.complexity
  return SRD_CLASS_COMPLEXITY_BY_NAME[cls.name] ?? null
}

export function formatClassComplexityLabel(complexity: ClassComplexity): string {
  return CLASS_COMPLEXITY_OPTIONS.find((option) => option.value === complexity)?.label ?? complexity
}

export function defaultClassComplexityForName(name: string): ClassComplexity | null {
  return SRD_CLASS_COMPLEXITY_BY_NAME[name] ?? null
}
