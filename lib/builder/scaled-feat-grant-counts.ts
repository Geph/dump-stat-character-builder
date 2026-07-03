/** Warlock: total Eldritch Invocations known at each threshold (PHB 2024). */
const ELDRITCH_INVOCATION_THRESHOLDS = [1, 2, 5, 7, 9, 12, 15, 18] as const

/** Sorcerer: total Metamagic options known at each threshold (PHB 2024). */
const METAMAGIC_OPTION_THRESHOLDS = [2, 4, 10, 16] as const

/** Alternate Monk: +1 Mystic Technique known at each listed class level. */
const MYSTIC_TECHNIQUE_THRESHOLDS = [3, 5, 7, 9, 11, 13, 15, 17, 19] as const

export function scaledClassFeatGrantCount(
  className: string,
  featureName: string,
  classLevel: number,
  baseCount: number,
): number {
  if (className === "Warlock" && featureName === "Eldritch Invocations") {
    return ELDRITCH_INVOCATION_THRESHOLDS.filter((level) => level <= classLevel).length
  }
  if (
    (className === "Sorcerer" || /alternate sorcerer/i.test(className)) &&
    featureName === "Metamagic"
  ) {
    return METAMAGIC_OPTION_THRESHOLDS.filter((level) => level <= classLevel).length
  }
  if (
    /alternate monk/i.test(className) &&
    /mystic techniques?/i.test(featureName)
  ) {
    return MYSTIC_TECHNIQUE_THRESHOLDS.filter((level) => level <= classLevel).length
  }
  return baseCount
}
