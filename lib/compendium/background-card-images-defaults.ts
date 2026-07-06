import { withBasePath } from "@/lib/config/deploy-mode"

const backgroundCardImage = (slug: string) => withBasePath(`/images/compendium/backgrounds/${slug}.png`)

/** Default card art for SRD backgrounds — files live under public/images/compendium/backgrounds/. */
export const SRD_BACKGROUND_CARD_IMAGES_BY_NAME: Record<string, string> = {
  Acolyte: backgroundCardImage("acolyte"),
  Criminal: backgroundCardImage("criminal"),
  Sage: backgroundCardImage("sage"),
  Soldier: backgroundCardImage("soldier"),
}

export function defaultBackgroundCardImageUrl(backgroundName: string): string | null {
  return SRD_BACKGROUND_CARD_IMAGES_BY_NAME[backgroundName] ?? null
}
