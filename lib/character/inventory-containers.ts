import type {
  InventoryContainerCharacteristic,
  InventoryContainerContentKind,
} from "@/lib/compendium/characteristic-modifiers"
import { readMagicEffects } from "@/lib/compendium/equipment-magic"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Equipment, Feature } from "@/lib/types"

export type ContainerInventoryEntryKind = InventoryContainerContentKind

export type ContainerInventoryEntry = {
  id: string
  kind: ContainerInventoryEntryKind
  label: string
  equipmentId?: string | null
  companionKey?: string | null
  quantity?: number
  notes?: string | null
}

export type ContainerInventoryState = {
  entries: ContainerInventoryEntry[]
}

export type ResolvedInventoryContainer = {
  key: string
  label: string
  characteristic: InventoryContainerCharacteristic
  /** Feature / action name that granted a linked-host container. */
  sourceFeatureName?: string | null
  sourceFeatureId?: string | null
  /** When the container is authored on a catalog equipment row. */
  equipmentId?: string | null
  /** Player-chosen linked host name (Dead Space bag/cloak/…). */
  linkedHostName?: string | null
  /** Catalog equipment id when the linked host matches an owned item. */
  linkedHostEquipmentId?: string | null
  /** Synthetic gear row when the host is custom or not yet owned. */
  syntheticHost?: Equipment | null
}

const CONTAINER_HOST_PREFIX = "container-host:"

export function isContainerHostEquipmentId(id: string): boolean {
  return id.startsWith(CONTAINER_HOST_PREFIX)
}

export function containerKeyFromHostEquipmentId(id: string): string | null {
  if (!isContainerHostEquipmentId(id)) return null
  return id.slice(CONTAINER_HOST_PREFIX.length)
}

export function hostEquipmentIdForContainerKey(key: string): string {
  return `${CONTAINER_HOST_PREFIX}${key}`
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function featureContainers(
  feature: Feature,
): { feature: Feature; characteristic: InventoryContainerCharacteristic }[] {
  const rows: { feature: Feature; characteristic: InventoryContainerCharacteristic }[] = []
  for (const instance of feature.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "inventory_container") continue
      rows.push({
        feature,
        characteristic: characteristic as InventoryContainerCharacteristic,
      })
    }
  }
  return rows
}

function equipmentChoiceLinkedName(
  feature: Feature,
  characteristic: InventoryContainerCharacteristic,
  featureChoicePicks: Record<string, string[]>,
  actionId?: string | null,
): string | null {
  if (!characteristic.linkHostItem) return null
  for (const instance of feature.linkedModifiers ?? []) {
    for (const choice of instance.characteristics ?? []) {
      if (choice.type !== "equipment_and_magic_items" || choice.mode !== "create_mundane") {
        continue
      }
      const pickKeys = [
        actionId ? `player-equipment:${actionId}:${choice.id}` : null,
        choice.id,
      ].filter((entry): entry is string => Boolean(entry))
      for (const key of pickKeys) {
        const picked = featureChoicePicks[key]?.[0]?.trim()
        if (picked) return picked
      }
    }
  }
  return null
}

function buildSyntheticHost(params: {
  key: string
  name: string
  container: InventoryContainerCharacteristic
  sourceFeatureName?: string | null
}): Equipment {
  const now = new Date(0).toISOString()
  const capacity =
    params.container.capacityLabel?.trim() ||
    (params.container.capacityMode === "slot_count" && params.container.capacityAmount != null
      ? `${params.container.capacityAmount} slots`
      : params.container.capacityMode === "cubic_feet" && params.container.capacityAmount != null
        ? `${params.container.capacityAmount} cubic feet`
        : params.container.capacityMode === "weight_lb" && params.container.capacityAmount != null
          ? `${params.container.capacityAmount} lb`
          : "Extradimensional storage")
  const featureBit = params.sourceFeatureName?.trim()
    ? ` Linked to ${params.sourceFeatureName.trim()}.`
    : ""
  return {
    id: hostEquipmentIdForContainerKey(params.key),
    name: params.name,
    category: "Adventuring Gear",
    subcategory: "Container",
    cost: null,
    weight: null,
    properties: ["Container"],
    description: `${capacity}.${featureBit} Open this item to view and edit stored contents.`,
    icon: "backpack",
    source: "feature",
    creator_url: null,
    created_at: now,
    magic_effects: [
      {
        instanceId: `container-host-fx:${params.key}`,
        catalogRefId: "cat_char_inventory_container",
        characteristics: [params.container],
      },
    ],
  }
}

function findOwnedByName(
  name: string,
  owned: Equipment[],
): Equipment | undefined {
  const needle = normalizeName(name)
  return owned.find((item) => normalizeName(item.name) === needle)
}

/**
 * Resolve feature- and equipment-authored inventory containers for the sheet Gear tab.
 */
export function resolveInventoryContainers(input: {
  classDetails?: CharacterClassDetail[] | null
  features?: Feature[] | null
  ownedEquipment: Equipment[]
  featureChoicePicks?: Record<string, string[]> | null
  /** Optional map from feature name → sheet action id (for player-equipment pick keys). */
  actionIdByFeatureName?: Record<string, string> | null
}): ResolvedInventoryContainer[] {
  const picks = input.featureChoicePicks ?? {}
  const actionIds = input.actionIdByFeatureName ?? {}
  const features: Feature[] = [...(input.features ?? [])]
  for (const detail of input.classDetails ?? []) {
    for (const feature of detail.class?.features ?? []) {
      if ((feature.level ?? 0) <= (detail.row.level ?? 0)) features.push(feature)
    }
    for (const feature of detail.subclass?.features ?? []) {
      if ((feature.level ?? 0) <= (detail.row.level ?? 0)) features.push(feature)
    }
  }

  const resolved: ResolvedInventoryContainer[] = []
  const seenKeys = new Set<string>()

  for (const feature of features) {
    for (const { characteristic } of featureContainers(feature)) {
      const key = `feature:${normalizeName(feature.name)}:${characteristic.id}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)
      const linkedHostName = equipmentChoiceLinkedName(
        feature,
        characteristic,
        picks,
        actionIds[feature.name] ?? null,
      )
      const linkedHost = linkedHostName
        ? findOwnedByName(linkedHostName, input.ownedEquipment)
        : undefined
      const needsSynthetic =
        Boolean(characteristic.linkHostItem) &&
        Boolean(linkedHostName) &&
        !linkedHost
      const label =
        characteristic.containerName?.trim() ||
        linkedHostName ||
        feature.name ||
        "Container"
      resolved.push({
        key,
        label,
        characteristic,
        sourceFeatureName: feature.name,
        sourceFeatureId: null,
        linkedHostName: linkedHostName ?? null,
        linkedHostEquipmentId: linkedHost?.id ?? null,
        syntheticHost: needsSynthetic
          ? buildSyntheticHost({
              key,
              name: linkedHostName!,
              container: characteristic,
              sourceFeatureName: feature.name,
            })
          : null,
      })
    }
  }

  for (const item of input.ownedEquipment) {
    if (isContainerHostEquipmentId(item.id)) continue
    for (const instance of readMagicEffects(item)) {
      for (const characteristic of instance.characteristics ?? []) {
        if (characteristic.type !== "inventory_container") continue
        const container = characteristic as InventoryContainerCharacteristic
        const attachNames = (container.attachToEquipmentNames ?? [])
          .map((name) => normalizeName(name))
          .filter(Boolean)
        if (attachNames.length && !attachNames.includes(normalizeName(item.name))) {
          continue
        }
        const key = `equipment:${item.id}:${container.id}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)
        resolved.push({
          key,
          label: container.containerName?.trim() || item.name,
          characteristic: container,
          equipmentId: item.id,
          linkedHostName: item.name,
          linkedHostEquipmentId: item.id,
          syntheticHost: null,
        })
      }
    }
  }

  return resolved
}

/** Gear rows to merge into the equipment list (linked hosts not yet in catalog inventory). */
export function syntheticContainerHostEquipment(
  containers: ResolvedInventoryContainer[],
): Equipment[] {
  return containers
    .map((row) => row.syntheticHost)
    .filter((item): item is Equipment => Boolean(item))
}

/** Map owned / synthetic equipment id → container key for the Open Contents control. */
export function containerKeyByEquipmentId(
  containers: ResolvedInventoryContainer[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of containers) {
    if (row.linkedHostEquipmentId) map.set(row.linkedHostEquipmentId, row.key)
    if (row.equipmentId) map.set(row.equipmentId, row.key)
    if (row.syntheticHost) map.set(row.syntheticHost.id, row.key)
  }
  return map
}

export function normalizeContainerInventories(
  raw: Record<string, ContainerInventoryState> | null | undefined,
): Record<string, ContainerInventoryState> {
  if (!raw || typeof raw !== "object") return {}
  const next: Record<string, ContainerInventoryState> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!key.trim() || !value || typeof value !== "object") continue
    const entries = Array.isArray(value.entries)
      ? value.entries
          .filter((entry) => entry && typeof entry === "object")
          .map((entry) => normalizeContainerEntry(entry as ContainerInventoryEntry))
          .filter((entry): entry is ContainerInventoryEntry => entry != null)
      : []
    next[key] = { entries }
  }
  return next
}

function normalizeContainerEntry(
  raw: Partial<ContainerInventoryEntry>,
): ContainerInventoryEntry | null {
  const label = typeof raw.label === "string" ? raw.label.trim() : ""
  if (!label) return null
  const kind: ContainerInventoryEntryKind =
    raw.kind === "equipment" ||
    raw.kind === "corpse" ||
    raw.kind === "companion" ||
    raw.kind === "freeform"
      ? raw.kind
      : "freeform"
  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `entry_${Math.random().toString(36).slice(2, 10)}`,
    kind,
    label: label.slice(0, 120),
    equipmentId: typeof raw.equipmentId === "string" ? raw.equipmentId : null,
    companionKey: typeof raw.companionKey === "string" ? raw.companionKey : null,
    quantity:
      typeof raw.quantity === "number" && Number.isFinite(raw.quantity)
        ? Math.max(1, Math.floor(raw.quantity))
        : 1,
    notes: typeof raw.notes === "string" ? raw.notes.trim().slice(0, 500) : null,
  }
}

export function containerOccupancy(entries: ContainerInventoryEntry[]): number {
  return entries.reduce((sum, entry) => sum + Math.max(1, entry.quantity ?? 1), 0)
}

export function containerCapacityRemaining(
  container: InventoryContainerCharacteristic,
  entries: ContainerInventoryEntry[],
): number | null {
  if (container.capacityMode !== "slot_count" || container.capacityAmount == null) {
    return null
  }
  return Math.max(0, container.capacityAmount - containerOccupancy(entries))
}
