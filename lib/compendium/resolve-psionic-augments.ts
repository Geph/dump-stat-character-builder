import {
  parsePsionicAugmentsFromDescription,
  type PsionicAugmentsConfig,
} from "@/lib/compendium/parse-psionic-augments"

export type PsionicAugmentSource = {
  name: string
  description?: string | null
  psionic_augments?: PsionicAugmentsConfig | null
}

/** Resolve persisted or description-parsed psi-point augments for spells and custom abilities. */
export function resolvePsionicAugments(source: PsionicAugmentSource): PsionicAugmentsConfig | null {
  if (source.psionic_augments?.augments?.length) return source.psionic_augments
  return parsePsionicAugmentsFromDescription(source.description, { powerName: source.name })
}
