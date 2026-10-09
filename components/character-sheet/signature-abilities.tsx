"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { MoreHorizontal, Pin, Sparkles } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getCompendiumCardImageUrl, normalizeCardImageUrl } from "@/lib/compendium/card-image"
import type { SheetActionEntry } from "@/lib/character/sheet-actions"
import { useAppPresentationMode } from "@/components/settings/use-app-presentation-mode"
import { FavoriteImagePicker } from "@/components/character-sheet/favorite-image-picker"
import type { Equipment, Spell } from "@/lib/types"
import { favoriteImage, defaultSignatureAction, parseSignatureTarget, placeSignature, SIGNATURE_DRAG_TYPE, type SignatureSlots, type SignatureTarget } from "@/lib/character/signature-abilities"

type Item = SignatureTarget & { name: string; icon?: string | null; image: string | null }
type Request = { id: string; scope: "combat" | "utility" | "weapon" }
const Context = createContext<{
  slots: SignatureSlots; items: Item[]; request: Request | null;
  pin: (index: 0 | 1, target: SignatureTarget | null) => void;
  open: (target: SignatureTarget) => void;
  acknowledge: () => void;
  visual: boolean; fallbackImages: [string | null, string | null]; images: Record<string, string>;
  setImage: (target: SignatureTarget, image: string | null) => void; imageError: string | null;
  gallery: { name: string; image: string }[];
} | null>(null)
export const useSignatureAbilities = () => useContext(Context)

export function SignatureAbilitiesProvider({ characterId, combatActions, utilityActions, spells, artwork, fallbackArtwork, weapons, onSpell, onActionTab, children }: {
  characterId: string; combatActions: SheetActionEntry[]; utilityActions: SheetActionEntry[]; spells: Spell[];
  weapons: { weapon: Equipment; hand: "main" | "off" }[];
  fallbackArtwork: [{ card_image_url?: string | null } | undefined, { card_image_url?: string | null } | undefined];
  artwork: { id: string; name: string; card_image_url?: string | null }[];
  onSpell: (spell: Spell) => void; onActionTab: (tab: "combat" | "abilities") => void; children: ReactNode;
}) {
  const { isCompactOnly, hideDefaultMidjourneyGraphics } = useAppPresentationMode()
  const [images, setImages] = useState<Record<string, string>>({})
  const [imageError, setImageError] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ characterId: string; slots: SignatureSlots } | null>(null)
  const [request, setRequest] = useState<Request | null>(null)
  const acknowledge = useCallback(() => setRequest(null), [])
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`dump-stat-signature-abilities:${characterId}`) ?? "null")
      setSaved(Array.isArray(raw) ? { characterId, slots: [parseSignatureTarget(raw[0]), parseSignatureTarget(raw[1])] } : null)
    } catch { setSaved(null) }
  }, [characterId])
  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(`dump-stat-favorite-images:${characterId}`) ?? "{}"); setImages(raw && typeof raw === "object" && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw).flatMap(([key, value]) => { const image = normalizeCardImageUrl(value); return image ? [[key, image]] : [] })) : {}) } catch { setImages({}) }
  }, [characterId])
  const setImage = (target: SignatureTarget, image: string | null) => {
    const next = { ...images }; const key = `${target.kind}:${target.id}`
    const normalized = normalizeCardImageUrl(image)
    if (normalized) next[key] = normalized; else delete next[key]
    try { localStorage.setItem(`dump-stat-favorite-images:${characterId}`, JSON.stringify(next)); setImages(next); setImageError(null) }
    catch { setImageError("This image could not be saved. Try a smaller image or an image URL.") }
  }
  const fallbackImages: [string | null, string | null] = fallbackArtwork.map(row => row ? getCompendiumCardImageUrl(row) : null) as [string | null, string | null]
  const actions = useMemo(() => [...new Map([...combatActions, ...utilityActions].map(action => [action.id, action])).values()], [combatActions, utilityActions])
  const slots: SignatureSlots = saved?.characterId === characterId ? saved.slots : [defaultSignatureAction(actions), null]
  const items: Item[] = useMemo(() => {
    const artById = new Map(artwork.map(row => [row.id, row]))
    const artByName = new Map(artwork.map(row => [row.name, row]))
    return [
    ...actions.map(action => {
      const art = artById.get(action.customAbilityId ?? "") ?? artByName.get(action.name)
      return { kind: "action" as const, id: action.id, name: action.name, icon: action.icon ?? action.sourceIcon, image: art ? getCompendiumCardImageUrl(art) : null }
    }),
    ...weapons.map(({ weapon, hand }) => ({ kind: "weapon" as const, id: `${hand}:${weapon.id}`, name: `${weapon.name}${hand === "off" ? " (Off-hand)" : ""}`, icon: weapon.icon, image: getCompendiumCardImageUrl(weapon) })),
    ...spells.map(spell => ({ kind: "spell" as const, id: spell.id, name: spell.name, icon: spell.icon, image: getCompendiumCardImageUrl(spell) })),
    ]
  }, [actions, artwork, spells, weapons, hideDefaultMidjourneyGraphics])
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
    } else if (target.kind === "weapon") {
      onActionTab("combat"); setRequest({ id: target.id, scope: "weapon" })
    } else {
      const scope = combatActions.some(row => row.id === target.id) ? "combat" : "utility"
      onActionTab(scope === "combat" ? "combat" : "abilities")
      setRequest({ id: target.id, scope })
    }
  }
  const gallery = [...artwork, ...spells].flatMap(row => { const image = getCompendiumCardImageUrl(row); return image ? [{ name: row.name, image }] : [] })
  return <Context.Provider value={{ slots, items, pin, open, request, acknowledge, visual: !isCompactOnly, fallbackImages, images, setImage, imageError, gallery }}>{children}</Context.Provider>
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
  const [editing, setEditing] = useState<SignatureTarget | null>(null)
  if (!context) return null
  return <section id="sheet-signatures" className="scroll-mt-20 rounded-xl border border-border bg-card/80 p-3">
    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4" />Favorite Abilities</h2>
    <div className="grid grid-cols-2 gap-2">{([0, 1] as const).map(index => {
      const target = context.slots[index]
      const item = context.items.find(row => row.id === target?.id && row.kind === target.kind)
      const image = item ? favoriteImage(context.visual, context.images[`${item.kind}:${item.id}`], item.image, context.fallbackImages[index]) : null
      return <div key={index} className="relative aspect-[2/3] min-w-0 overflow-hidden rounded-xl border border-border bg-muted/40"
        onDragOver={event => { if (event.dataTransfer.types.includes(SIGNATURE_DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = "copy" } }}
        onDrop={event => { event.preventDefault(); try { const next = parseSignatureTarget(JSON.parse(event.dataTransfer.getData(SIGNATURE_DRAG_TYPE))); if (next) context.pin(index, next) } catch { /* Not a sheet ability. */ } }}>
        {item ? <button type="button" onClick={() => context.open(item)} aria-label={`Open ${item.name}`} draggable
          onDragStart={event => event.dataTransfer.setData(SIGNATURE_DRAG_TYPE, JSON.stringify(item))}
          className="absolute inset-0 flex w-full flex-col items-center justify-center text-center focus-visible:ring-2 focus-visible:ring-primary">
          {image ? <img key={image} src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-top" onError={event => { event.currentTarget.style.display = "none" }} /> : null}
          <span className="text-primary">{item.icon ? <GameIcon name={item.icon} className="h-14 w-14" /> : <Sparkles className="h-12 w-12" />}</span>
          <span className={`absolute inset-x-0 bottom-0 p-2 pt-8 text-sm font-bold leading-tight ${image ? "bg-gradient-to-t from-black via-black/80 to-transparent text-white" : "text-foreground"}`}>{item.name}</span>
        </button> : <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">{target ? "Ability unavailable. Choose another." : "Drop a spell, weapon, or action here, or choose one from the menu."}</div>}
        <div className="absolute right-1 top-1"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Favorite ${index + 1} options`} className="rounded-lg border border-border bg-card/90 p-2"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 overflow-y-auto">
            {target && context.visual && <DropdownMenuItem onSelect={() => setEditing(target)}>Choose or upload image</DropdownMenuItem>}
            {target && <DropdownMenuItem onSelect={() => context.pin(index, null)}>Clear favorite</DropdownMenuItem>}
            {context.items.map(choice => <DropdownMenuItem key={`${choice.kind}:${choice.id}`} onSelect={() => context.pin(index, choice)}>{choice.name} · {choice.kind === "spell" ? "Spell" : choice.kind === "weapon" ? "Weapon" : "Action"}</DropdownMenuItem>)}
          </DropdownMenuContent></DropdownMenu></div>
      </div>
    })}</div>
    {editing && <FavoriteImagePicker value={context.images[`${editing.kind}:${editing.id}`] ?? null} gallery={context.gallery} error={context.imageError} onChange={image => context.setImage(editing, image)} onClose={() => setEditing(null)} />}
  </section>
}
