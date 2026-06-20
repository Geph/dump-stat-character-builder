import type { FeatureActivationRequirement } from "@/lib/types"

export const ACTIVATION_REQUIREMENT_OPTIONS: {
  value: FeatureActivationRequirement["kind"]
  label: string
  needsAbility?: boolean
  needsCondition?: boolean
  needsText?: boolean
}[] = [
  { value: "drop_to_zero_hp", label: "If you drop to 0 Hit Points" },
  { value: "while_raging", label: "While raging" },
  { value: "while_condition", label: "While subject to a condition", needsCondition: true },
  { value: "make_saving_throw", label: "When you make a saving throw", needsAbility: true },
  { value: "fail_saving_throw", label: "When you fail a saving throw", needsAbility: true },
  { value: "on_attack", label: "When making an attack" },
  { value: "on_hit", label: "When you hit with an attack" },
  { value: "on_cast_spell", label: "When casting a spell" },
  { value: "on_crit", label: "When you score a critical hit" },
  { value: "custom", label: "Custom requirement", needsText: true },
]

export function formatActivationRequirement(req: FeatureActivationRequirement): string {
  const meta = ACTIVATION_REQUIREMENT_OPTIONS.find((opt) => opt.value === req.kind)
  if (req.kind === "make_saving_throw" || req.kind === "fail_saving_throw") {
    const verb = req.kind === "make_saving_throw" ? "make" : "fail"
    return req.ability
      ? `When you ${verb} a ${req.ability} saving throw`
      : `When you ${verb} a saving throw`
  }
  if (req.kind === "while_condition" && req.condition) {
    return `While ${req.condition}`
  }
  if (req.kind === "custom" && req.text?.trim()) {
    return req.text.trim()
  }
  return meta?.label ?? req.kind
}
