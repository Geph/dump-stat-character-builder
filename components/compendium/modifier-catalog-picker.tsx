"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  MODIFIER_CATALOG_GROUPS,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
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

type ModifierCatalogPickerProps = {
  value: string[]
  onChange: (value: string[]) => void
  catalog: ModifierCatalogEntry[]
  label?: string
  placeholder?: string
  emptyMessage?: string
}

export function ModifierCatalogPicker({
  value,
  onChange,
  catalog,
  label = "Modifier effects",
  placeholder = "Search common modifiers…",
  emptyMessage = "No modifiers selected.",
}: ModifierCatalogPickerProps) {
  const [open, setOpen] = useState(false)

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

    return [...map.entries()].filter(([, entries]) => entries.length > 0)
  }, [catalog])

  const selectedEntries = value
    .map((id) => catalog.find((entry) => entry.id === id))
    .filter((entry): entry is ModifierCatalogEntry => Boolean(entry))

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((entryId) => entryId !== id) : [...value, id])
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-semibold text-foreground">{label}</label>}

      {selectedEntries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedEntries.map((entry) => (
            <span
              key={entry.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs"
            >
              <span>{entry.name}</span>
              <button
                type="button"
                onClick={() => toggle(entry.id)}
                className="hover:text-destructive"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
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
          <Command>
            <CommandInput placeholder="Search by name or summary…" />
            <CommandList className="max-h-72">
              <CommandEmpty>No matching modifiers.</CommandEmpty>
              {grouped.map(([group, entries]) => (
                <CommandGroup key={group} heading={group}>
                  {entries.map((entry) => (
                    <CommandItem
                      key={entry.id}
                      value={`${entry.name} ${entry.summary ?? ""} ${entry.group}`}
                      onSelect={() => toggle(entry.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(entry.id) ? "opacity-100" : "opacity-0",
                        )}
                      />
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
