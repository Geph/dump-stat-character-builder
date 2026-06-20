import type { FeatureDurationKey } from "@/lib/types"

export const FEATURE_DURATION_OPTIONS: { value: FeatureDurationKey; label: string }[] = [
  { value: "1_round", label: "1 round" },
  { value: "until_ended", label: "Until ended with an action/bonus action" },
  { value: "until_end_next_turn", label: "Until the end of your next turn" },
  { value: "until_next_day", label: "Until next day" },
  { value: "1_minute", label: "1 minute" },
  { value: "10_minutes", label: "10 minutes" },
]

export function formatFeatureDuration(key: FeatureDurationKey | null | undefined): string {
  if (!key) return ""
  return FEATURE_DURATION_OPTIONS.find((opt) => opt.value === key)?.label ?? key
}
