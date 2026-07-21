import type { ImportContent } from "@/lib/import/content-schema"

/** Rename a class by index and cascade `class_name` / spell-list references. */
export function renameImportClassAtIndex(
  content: ImportContent,
  index: number,
  nextName: string,
): ImportContent {
  const classes = content.classes
  if (!classes?.[index]) return content
  const trimmed = nextName.trim()
  if (!trimmed) return content
  const oldName = classes[index].name
  if (oldName === trimmed) return content

  const next: ImportContent = {
    ...content,
    classes: classes.map((row, i) => (i === index ? { ...row, name: trimmed } : row)),
  }

  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((row) =>
      row.class_name === oldName ? { ...row, class_name: trimmed } : row,
    )
  }

  if (content.class_resources?.length) {
    next.class_resources = content.class_resources.map((row) =>
      row.class_name === oldName ? { ...row, class_name: trimmed } : row,
    )
  }

  if (content.spells?.length) {
    next.spells = content.spells.map((row) => ({
      ...row,
      classes: row.classes?.map((name) => (name === oldName ? trimmed : name)) ?? row.classes,
    }))
  }

  if (content.abilities?.length) {
    next.abilities = content.abilities.map((row) =>
      row.source_name === oldName ? { ...row, source_name: trimmed } : row,
    )
  }

  if (content.import_proposals?.class_resources?.length) {
    next.import_proposals = {
      ...content.import_proposals,
      class_resources: content.import_proposals.class_resources.map((row) =>
        row.class_name === oldName ? { ...row, class_name: trimmed } : row,
      ),
    }
  }

  return next
}

/** Rename a subclass by index (parent class_name is unchanged). */
export function renameImportSubclassAtIndex(
  content: ImportContent,
  index: number,
  nextName: string,
): ImportContent {
  const subclasses = content.subclasses
  if (!subclasses?.[index]) return content
  const trimmed = nextName.trim()
  if (!trimmed) return content
  if (subclasses[index].name === trimmed) return content

  return {
    ...content,
    subclasses: subclasses.map((row, i) => (i === index ? { ...row, name: trimmed } : row)),
  }
}
