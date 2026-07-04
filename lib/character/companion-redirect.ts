/**
 * Astral Guardian (Shaper's Mind): redirect incoming attack damage to a companion.
 * Overflow damage beyond the construct's remaining HP returns to the owner.
 */

export type CompanionRedirectResult = {
  /** HP removed from the companion. */
  damageToCompanion: number
  /** HP that spills back to the owner after the construct is depleted. */
  overflowToOwner: number
  /** Companion HP after redirect. */
  companionHpAfter: number
}

export function applyCompanionAttackRedirect(params: {
  incomingDamage: number
  companionCurrentHp: number
}): CompanionRedirectResult {
  const damage = Math.max(0, params.incomingDamage)
  const hp = Math.max(0, params.companionCurrentHp)
  const damageToCompanion = Math.min(hp, damage)
  const overflowToOwner = Math.max(0, damage - hp)
  return {
    damageToCompanion,
    overflowToOwner,
    companionHpAfter: hp - damageToCompanion,
  }
}

export function formatCompanionRedirectSummary(result: CompanionRedirectResult): string {
  if (result.overflowToOwner > 0) {
    return `${result.damageToCompanion} to construct, ${result.overflowToOwner} overflow to you`
  }
  return `${result.damageToCompanion} absorbed by construct`
}
