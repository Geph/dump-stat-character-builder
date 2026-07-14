import { redirect } from "next/navigation"
import { compendiumEditHref } from "@/lib/compendium/edit-href"

/** Legacy route — redirects to the unified compendium editor. */
export default async function LegacyClassEditorRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(compendiumEditHref("classes", id))
}
