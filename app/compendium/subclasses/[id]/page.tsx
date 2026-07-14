import { redirect } from "next/navigation"
import { compendiumEditHref } from "@/lib/compendium/edit-href"

/** Legacy route — redirects to the unified compendium editor. */
export default async function LegacySubclassEditorRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(compendiumEditHref("subclasses", id))
}
