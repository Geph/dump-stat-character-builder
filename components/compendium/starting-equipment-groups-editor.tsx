"use client"

import { Plus, X } from "lucide-react"
import type { StartingEquipmentGroup } from "@/lib/types"

type StartingEquipmentGroupsEditorProps = {
  groups: StartingEquipmentGroup[]
  startingGold: number
  onGroupsChange: (groups: StartingEquipmentGroup[]) => void
  onStartingGoldChange: (gold: number) => void
}

export function StartingEquipmentGroupsEditor({
  groups,
  startingGold,
  onGroupsChange,
  onStartingGoldChange,
}: StartingEquipmentGroupsEditorProps) {
  const addEquipmentGroup = () => {
    onGroupsChange([
      ...groups,
      {
        description: "Choose one of the following",
        options: [{ label: "A", items: [{ name: "", quantity: 1 }] }],
      },
    ])
  }

  const removeEquipmentGroup = (gi: number) => {
    onGroupsChange(groups.filter((_, i) => i !== gi))
  }

  const addEquipmentOption = (gi: number) => {
    const next = [...groups]
    const label = String.fromCharCode(65 + next[gi].options.length)
    next[gi] = {
      ...next[gi],
      options: [...next[gi].options, { label, items: [{ name: "", quantity: 1 }] }],
    }
    onGroupsChange(next)
  }

  const removeEquipmentOption = (gi: number, oi: number) => {
    const next = [...groups]
    next[gi] = { ...next[gi], options: next[gi].options.filter((_, i) => i !== oi) }
    onGroupsChange(next)
  }

  const addItemToOption = (gi: number, oi: number) => {
    const next = [...groups]
    next[gi].options[oi].items.push({ name: "", quantity: 1 })
    onGroupsChange(next)
  }

  const updateOptionItem = (
    gi: number,
    oi: number,
    ii: number,
    field: "name" | "quantity",
    value: string | number,
  ) => {
    const next = [...groups]
    next[gi].options[oi].items[ii] = { ...next[gi].options[oi].items[ii], [field]: value }
    onGroupsChange(next)
  }

  const removeOptionItem = (gi: number, oi: number, ii: number) => {
    const next = [...groups]
    next[gi].options[oi].items = next[gi].options[oi].items.filter((_, i) => i !== ii)
    onGroupsChange(next)
  }

  return (
    <div className="bg-card border-2 border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <label className="block text-sm font-semibold text-foreground">Starting Equipment Packages</label>
          <p className="text-xs text-muted-foreground">
            Define choice groups (A/B/C). Players pick one package in the builder.
          </p>
        </div>
        <button
          type="button"
          onClick={addEquipmentGroup}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Group
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-foreground shrink-0">Gold alternative (gp):</label>
        <input
          type="number"
          min={0}
          value={startingGold}
          onChange={(e) => onStartingGoldChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="w-28 px-3 py-2 bg-background border-2 border-border rounded-xl text-foreground text-center focus:outline-none focus:border-primary"
        />
        <span className="text-xs text-muted-foreground">
          Add a package with only &quot;Gold Pieces&quot; to offer this amount instead of items.
        </span>
      </div>

      {groups.map((group, gi) => (
        <div key={gi} className="border-2 border-border rounded-xl p-3 space-y-3 bg-background">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={group.description}
              onChange={(e) => {
                const next = [...groups]
                next[gi] = { ...next[gi], description: e.target.value }
                onGroupsChange(next)
              }}
              placeholder="e.g. Choose one background starting equipment package"
              className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary font-medium"
            />
            <button type="button" onClick={() => addEquipmentOption(gi)}
              className="px-2 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-xs font-semibold whitespace-nowrap">
              + Option
            </button>
            <button type="button" onClick={() => removeEquipmentGroup(gi)}
              className="p-2 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>

          {group.options.map((opt, oi) => (
            <div key={oi} className="pl-3 border-l-2 border-primary/20 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...groups]
                    next[gi].options[oi] = { ...next[gi].options[oi], label: e.target.value }
                    onGroupsChange(next)
                  }}
                  placeholder="A"
                  className="flex-1 min-w-0 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <button type="button" onClick={() => addItemToOption(gi, oi)}
                  className="shrink-0 px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80">
                  + Item
                </button>
                <button type="button" onClick={() => removeEquipmentOption(gi, oi)}
                  className="p-1 text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {opt.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-2 ml-2">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateOptionItem(gi, oi, ii, "quantity", parseInt(e.target.value, 10) || 1)
                    }
                    className="w-16 px-2 py-1 bg-card border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateOptionItem(gi, oi, ii, "name", e.target.value)}
                    placeholder="Item name or Gold Pieces"
                    className="flex-1 px-3 py-1 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                  <button type="button" onClick={() => removeOptionItem(gi, oi, ii)}
                    className="p-1 text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No equipment packages yet. Add a group or use the legacy flat list below.
        </p>
      )}
    </div>
  )
}
