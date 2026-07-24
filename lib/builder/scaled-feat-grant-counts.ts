/** Warlock: total Eldritch Invocations known at each threshold (PHB 2024). */
const ELDRITCH_INVOCATION_THRESHOLDS = [1, 2, 5, 7, 9, 12, 15, 18] as const

/** Sorcerer: total Metamagic options known at each threshold (PHB 2024). */
const METAMAGIC_OPTION_THRESHOLDS = [2, 4, 10, 16] as const

/** LaserLlama Alternate Sorcerer: Metamagics Known column (starts at 2 options). */
const ALTERNATE_SORCERER_METAMAGIC_THRESHOLDS = [
  { level: 2, count: 2 },
  { level: 5, count: 3 },
  { level: 9, count: 4 },
  { level: 14, count: 5 },
  { level: 19, count: 6 },
] as const

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
  if (/alternate sorcerer/i.test(className) && featureName === "Metamagic") {
    let count = baseCount
    for (const tier of ALTERNATE_SORCERER_METAMAGIC_THRESHOLDS) {
      if (tier.level <= classLevel) count = tier.count
    }
    return count
  }
  if (className === "Sorcerer" && featureName === "Metamagic") {
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
