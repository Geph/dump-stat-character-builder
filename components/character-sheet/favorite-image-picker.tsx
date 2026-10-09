"use client"

import { CardImageField } from "@/components/compendium/card-image-field"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export function FavoriteImagePicker({ value, gallery, error, onChange, onClose }: {
  value: string | null; gallery: { name: string; image: string }[]; error: string | null;
  onChange: (image: string | null) => void; onClose: () => void;
}) {
  const unique = [...new Map(gallery.map(item => [item.image, item])).values()]
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent className="max-h-[85vh] overflow-y-auto">
    <DialogTitle>Favorite image</DialogTitle>
    <CardImageField value={value} onChange={onChange} imageAspect="3/4" label="Upload or paste an image URL" hint="Used only for this character’s favorite. Portrait artwork works best." collapsible={false} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <button type="button" onClick={() => onChange(null)} className="min-h-11 rounded-lg border p-2 text-sm">Use default artwork</button>
    <div className="grid grid-cols-3 gap-2">{unique.map(item => <button key={item.image} type="button" onClick={() => onChange(item.image)} className="overflow-hidden rounded-lg border text-xs">
      {/* User and compendium images may be local data URLs or arbitrary hosted URLs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image} alt="" className="aspect-[2/3] w-full object-cover" />
      <span className="block p-2">{item.name}</span>
    </button>)}</div>
  </DialogContent></Dialog>
}
