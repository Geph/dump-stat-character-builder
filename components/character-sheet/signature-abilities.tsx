"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { MoreHorizontal, Pin, Sparkles } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getCompendiumCardImageUrl } from "@/lib/compendium/card-image"
import type { SheetActionEntry } from "@/lib/character/sheet-actions"
import type { Spell } from "@/lib/types"
import { defaultSignatureAction, parseSignatureTarget, placeSignature, SIGNATURE_DRAG_TYPE, type SignatureSlots, type SignatureTarget } from "@/lib/character/signature-abilities"

type Item = SignatureTarget & { name: string; icon?: string | null; image: string | null }
type Request = { id: string; scope: "combat" | "utility" }
const Context = createContext<{
  slots: SignatureSlots; items: Item[]; request: Request | null;
  pin: (index: 0 | 1, target: SignatureTarget | null) => void;
  open: (target: SignatureTarget) => void;
  acknowledge: () => void;
} | null>(null)
export const useSignatureAbilities = () => useContext(Context)

export function SignatureAbilitiesProvider({ characterId, combatActions, utilityActions, spells, artwork, onSpell, onActionTab, children }: {
  characterId: string; combatActions: SheetActionEntry[]; utilityActions: SheetActionEntry[]; spells: Spell[];
  artwork: { id: string; name: string; card_image_url?: string | null }[];
  onSpell: (spell: Spell) => void; onActionTab: (tab: "combat" | "abilities") => void; children: ReactNode;
}) {
  const [saved, setSaved] = useState<{ characterId: string; slots: SignatureSlots } | null>(null)
  const [request, setRequest] = useState<Request | null>(null)
  const acknowledge = useCallback(() => setRequest(null), [])
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`dump-stat-signature-abilities:${characterId}`) ?? "null")
      setSaved(Array.isArray(raw) ? { characterId, slots: [parseSignatureTarget(raw[0]), parseSignatureTarget(raw[1])] } : null)
    } catch { setSaved(null) }
  }, [characterId])
  const actions = useMemo(() => [...new Map([...combatActions, ...utilityActions].map(action => [action.id, action])).values()], [combatActions, utilityActions])
  const slots: SignatureSlots = saved?.characterId === characterId ? saved.slots : [defaultSignatureAction(actions), null]
  const items: Item[] = useMemo(() => {
    const artById = new Map(artwork.map(row => [row.id, row]))
    const artByName = new Map(artwork.map(row => [row.name, row]))
    return [
    ...actions.map(action => {
      const art = artById.get(action.customAbilityId ?? "") ?? artByName.get(action.name) ?? artById.get(action.classId ?? "")
      return { kind: "action" as const, id: action.id, name: action.name, icon: action.icon ?? action.sourceIcon, image: art ? getCompendiumCardImageUrl(art) : null }
    }),
    ...spells.map(spell => ({ kind: "spell" as const, id: spell.id, name: spell.name, icon: spell.icon, image: getCompendiumCardImageUrl(spell) })),
    ]
  }, [actions, artwork, spells])
  const pin = (index: 0 | 1, target: SignatureTarget | null) => {
    if (target && !items.some(item => item.kind === target.kind && item.id === target.id)) return
    const next = placeSignature(slots, index, target)
    setSaved({ characterId, slots: next })
    try { localStorage.setItem(`dump-stat-signature-abilities:${characterId}`, JSON.stringify(next)) } catch { /* Storage unavailable. */ }
  }
  const open = (target: SignatureTarget) => {
    if (target.kind === "spell") {
      const spell = spells.find(row => row.id === target.id)
      if (spell) onSpell(spell)
    } else {
      const scope = combatActions.some(row => row.id === target.id) ? "combat" : "utility"
      onActionTab(scope === "combat" ? "combat" : "abilities")
      setRequest({ id: target.id, scope })
    }
  }
  return <Context.Provider value={{ slots, items, pin, open, request, acknowledge }}>{children}</Context.Provider>
}

export function SignaturePinMenu({ target, utilityPinned, onUtilityToggle, spell = false }: {
  target: SignatureTarget; utilityPinned?: boolean; onUtilityToggle?: () => void; spell?: boolean;
}) {
  const context = useSignatureAbilities()
  if (!context && !onUtilityToggle) return null
  return <DropdownMenu><DropdownMenuTrigger asChild>
    <button type="button" aria-label={spell ? "Pin spell" : "Action options"}
      onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground hover:bg-muted">
      {spell ? <Pin className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
    </button>
  </DropdownMenuTrigger><DropdownMenuContent onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    {onUtilityToggle && <DropdownMenuItem onSelect={onUtilityToggle}>{utilityPinned ? "Unpin from" : "Pin to"} Abilities & Skills</DropdownMenuItem>}
    {context && ([0, 1] as const).map(index => <DropdownMenuItem key={index} onSelect={() => context.pin(index, target)}>Pin to Favorite {index + 1}</DropdownMenuItem>)}
  </DropdownMenuContent></DropdownMenu>
}

export function SignatureAbilitiesPanel() {
  const context = useSignatureAbilities()
  if (!context) return null
  return <section id="sheet-signatures" className="scroll-mt-20 rounded-xl border border-border bg-card/80 p-3">
    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4" />Favorite Abilities</h2>
    <div className="grid grid-cols-2 gap-2">{([0, 1] as const).map(index => {
      const target = context.slots[index]
      const item = context.items.find(row => row.id === target?.id && row.kind === target.kind)
      return <div key={index} className="relative aspect-[2/3] min-w-0 overflow-hidden rounded-xl border border-border bg-muted/40"
        onDragOver={event => { if (event.dataTransfer.types.includes(SIGNATURE_DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = "copy" } }}
        onDrop={event => { event.preventDefault(); try { const next = parseSignatureTarget(JSON.parse(event.dataTransfer.getData(SIGNATURE_DRAG_TYPE))); if (next) context.pin(index, next) } catch { /* Not a sheet ability. */ } }}>
        {item ? <button type="button" onClick={() => context.open(item)} aria-label={`Open ${item.name}`} draggable
          onDragStart={event => event.dataTransfer.setData(SIGNATURE_DRAG_TYPE, JSON.stringify(item))}
          className="absolute inset-0 flex w-full flex-col items-center justify-center text-center focus-visible:ring-2 focus-visible:ring-primary">
          {item.image ? <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top" onError={event => { event.currentTarget.style.display = "none" }} /> : null}
          <span className="text-primary">{item.icon ? <GameIcon name={item.icon} className="h-14 w-14" /> : <Sparkles className="h-12 w-12" />}</span>
          <span className={`absolute inset-x-0 bottom-0 p-2 pt-8 text-sm font-bold leading-tight ${item.image ? "bg-gradient-to-t from-black via-black/80 to-transparent text-white" : "text-foreground"}`}>{item.name}</span>
        </button> : <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">{target ? "Ability unavailable. Choose another." : "Drop a spell or action here, or choose one from the menu."}</div>}
        <div className="absolute right-1 top-1"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Favorite ${index + 1} options`} className="rounded-lg border border-border bg-card/90 p-2"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 overflow-y-auto">
            {target && <DropdownMenuItem onSelect={() => context.pin(index, null)}>Clear favorite</DropdownMenuItem>}
            {context.items.map(choice => <DropdownMenuItem key={`${choice.kind}:${choice.id}`} onSelect={() => context.pin(index, choice)}>{choice.name} · {choice.kind === "spell" ? "Spell" : "Action"}</DropdownMenuItem>)}
          </DropdownMenuContent></DropdownMenu></div>
      </div>
    })}</div>
  </section>
}
