"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Trash2 } from "lucide-react"
import {
  MODIFIER_CATALOG_GROUPS,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
import { filterModifierCatalogEntries } from "@/lib/compendium/modifier-catalog-search"
import { createLinkedModifierFromCatalog, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { CharacteristicModifiersEditor } from "@/components/characteristic-modifiers-editor"
import { FeatureEffectList } from "@/components/compendium/feature-effect-list"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ClassResource, FeatureActivation } from "@/lib/types"

type LinkedModifiersEditorProps = {
  value: LinkedModifierInstance[]
  onChange: (value: LinkedModifierInstance[]) => void
  catalog: ModifierCatalogEntry[]
  label?: string
  placeholder?: string
  emptyMessage?: string
  classResources?: ClassResource[]
  spellOptions?: { id: string; name: string }[]
  otherAbilities?: { id: string; name: string }[]
}

function hasConfigurableCharacteristics(
  instance: LinkedModifierInstance,
  entry: ModifierCatalogEntry | undefined,
): boolean {
  return Boolean(instance.characteristics?.length || entry?.characteristics?.length)
}

function hasConfigurableActivation(
  instance: LinkedModifierInstance,
  entry: ModifierCatalogEntry | undefined,
): boolean {
  const activation = instance.activation !== undefined ? instance.activation : entry?.activation
  if (!activation) return false
  return Boolean(activation.effects?.length || activation.effect)
}

export function LinkedModifiersEditor({
  value,
  onChange,
  catalog,
  label = "Modifier effects",
  placeholder = "Add common modifier…",
  emptyMessage = "No modifiers selected.",
  classResources = [],
  spellOptions = [],
  otherAbilities = [],
}: LinkedModifiersEditorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const grouped = useMemo(() => {
    const map = new Map<string, ModifierCatalogEntry[]>()
    for (const group of MODIFIER_CATALOG_GROUPS) map.set(group, [])
    map.set("Other", [])

    for (const entry of catalog) {
      const key = MODIFIER_CATALOG_GROUPS.includes(entry.group as (typeof MODIFIER_CATALOG_GROUPS)[number])
        ? entry.group
        : "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }

    return [...map.entries()]
      .map(([group, entries]) => {
        const visible = search.trim() ? filterModifierCatalogEntries(entries, search) : entries
        return [group, visible] as const
      })
      .filter(([, entries]) => entries.length > 0)
  }, [catalog, search])

  const emitChange = (next: LinkedModifierInstance[]) => {
    onChange(next)
  }

  const addEntry = (entry: ModifierCatalogEntry) => {
    emitChange([...value, createLinkedModifierFromCatalog(entry)])
    setOpen(false)
  }

  const removeInstance = (instanceId: string) => {
    emitChange(value.filter((instance) => instance.instanceId !== instanceId))
  }

  const updateInstance = (instanceId: string, patch: Partial<LinkedModifierInstance>) => {
    emitChange(value.map((instance) => (instance.instanceId === instanceId ? { ...instance, ...patch } : instance)))
  }

  const updateActivation = (instanceId: string, activation: FeatureActivation | null) => {
    updateInstance(instanceId, { activation })
  }

  return (
    <div className="space-y-3">
      {label && <label className="block text-xs font-semibold text-foreground">{label}</label>}

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {value.map((instance) => {
            const entry = catalog.find((item) => item.id === instance.catalogRefId)
            const showCharacteristics = hasConfigurableCharacteristics(instance, entry)
            const showActivation = hasConfigurableActivation(instance, entry)
            const activation =
              instance.activation !== undefined ? (instance.activation ?? {}) : (entry?.activation ?? {})

            return (
              <div
                key={instance.instanceId}
                className="rounded-xl border-2 border-primary/20 bg-card/50 p-3 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {entry?.name ?? instance.catalogRefId}
                    </p>
                    {entry?.summary && (
                      <p className="text-xs text-muted-foreground truncate">{entry.summary}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInstance(instance.instanceId)}
                    className="p-1.5 text-muted-foreground hover:text-destructive shrink-0"
                    title="Remove modifier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {showCharacteristics && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Configure effect
                    </p>
                    <CharacteristicModifiersEditor
                      value={
                        instance.characteristics?.length
                          ? instance.characteristics
                          : (entry?.characteristics ?? [])
                      }
                      onChange={(characteristics) => updateInstance(instance.instanceId, { characteristics })}
                      otherAbilities={otherAbilities}
                      spellOptions={spellOptions}
                      modifierCatalog={catalog}
                      classResources={classResources}
                      configureOnly
                    />
                  </div>
                )}

                {showActivation && (
                  <div className="pt-2 border-t border-border space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Active effect details
                    </p>
                    <FeatureEffectList
                      activation={activation}
                      classResources={classResources}
                      onChange={(next) => updateActivation(instance.instanceId, next)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,28rem)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or summary…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-72">
              <CommandEmpty>No matching modifiers.</CommandEmpty>
              {grouped.map(([group, entries]) => (
                <CommandGroup key={group} heading={group}>
                  {entries.map((entry) => (
                    <CommandItem
                      key={entry.id}
                      value={`${entry.name} ${entry.summary ?? ""} ${entry.group}`}
                      onSelect={() => addEntry(entry)}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.name}</p>
                        {entry.summary && (
                          <p className="text-xs text-muted-foreground truncate">{entry.summary}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
