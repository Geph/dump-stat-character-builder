type AttachmentMaps = {
  classIdByName: Map<string, string>
  subclassIdByName: Map<string, string>
  speciesIdByName: Map<string, string>
  backgroundIdByName: Map<string, string>
  featIdByName: Map<string, string>
}

function normalizeAttachType(sourceType: string): string | null {
  if (sourceType === "class_feature") return "class"
  if (sourceType === "subclass_feature") return "subclass"
  const allowed = ["class", "subclass", "species", "background", "feat", "item", "spell", "ability"]
  return allowed.includes(sourceType) ? sourceType : null
}

function resolveAttachId(
  attachType: string,
  sourceName: string,
  maps: AttachmentMaps,
): string {
  switch (attachType) {
    case "class":
      return maps.classIdByName.get(sourceName) ?? sourceName
    case "subclass":
      return maps.subclassIdByName.get(sourceName) ?? sourceName
    case "species":
      return maps.speciesIdByName.get(sourceName) ?? sourceName
    case "background":
      return maps.backgroundIdByName.get(sourceName) ?? sourceName
    case "feat":
      return maps.featIdByName.get(sourceName) ?? sourceName
    default:
      return sourceName
  }
}

/** Map import source_type/source_name onto attached_to_type/attached_to_id for persist. */
export function resolveAbilityAttachmentRow(
  row: Record<string, unknown>,
  maps: AttachmentMaps,
): Record<string, unknown> {
  const existingType = typeof row.attached_to_type === "string" ? row.attached_to_type.trim() : ""
  const existingId = typeof row.attached_to_id === "string" ? row.attached_to_id.trim() : ""
  if (existingType && existingId) {
    const { source_type: _st, source_name: _sn, ...rest } = row
    return rest
  }

  const sourceType =
    (typeof row.source_type === "string" ? row.source_type : null) ??
    (typeof row.attached_to_type === "string" ? row.attached_to_type : null)
  const sourceName =
    (typeof row.source_name === "string" ? row.source_name : null) ??
    (typeof row.attached_to_id === "string" ? row.attached_to_id : null)

  if (!sourceType || !sourceName) {
    const { source_type: _st, source_name: _sn, ...rest } = row
    return rest
  }

  const attachType = normalizeAttachType(sourceType.trim())
  if (!attachType) {
    const { source_type: _st, source_name: _sn, ...rest } = row
    return rest
  }
  const { source_type: _st, source_name: _sn, ...rest } = row
  return {
    ...rest,
    attached_to_type: attachType,
    attached_to_id: resolveAttachId(attachType, sourceName.trim(), maps),
  }
}
