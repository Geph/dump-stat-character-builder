"use client"

import { Suspense, use, useEffect, useState } from "react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { pageFloatingHintClass } from "@/lib/compendium/editor-field-styles"
import { createClient } from "@/lib/db/client"
import {
  normalizeShareSnapshotRow,
  type CharacterShareSnapshot,
} from "@/lib/character/share-snapshot"
import { asCompendiumRows } from "@/lib/data/types"

function ShareSnapshotContent({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<CharacterShareSnapshot | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Missing share token.")
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      setError(null)
      const db = createClient()
      const { data, error: queryError } = await db
        .from("character_snapshots")
        .select("*")
        .eq("token", token)
        .limit(1)
      if (queryError) {
        setError(queryError.message)
        setSnapshot(null)
        setLoading(false)
        return
      }
      const row = asCompendiumRows(data)[0]
      if (!row) {
        setError("This share link was not found.")
        setSnapshot(null)
        setLoading(false)
        return
      }
      setSnapshot(normalizeShareSnapshotRow(row))
      setLoading(false)
    }
    void load()
  }, [token])

  const payload = snapshot?.payload ?? {}
  const name = String(payload.name ?? snapshot?.character_name ?? "Character")
  const level = typeof payload.level === "number" ? payload.level : null
  const snapshotMeta =
    payload.snapshot && typeof payload.snapshot === "object"
      ? (payload.snapshot as Record<string, unknown>)
      : null
  const classLabel =
    typeof snapshotMeta?.classLabel === "string" ? snapshotMeta.classLabel : null
  const currentHp =
    typeof snapshotMeta?.currentHp === "number" ? snapshotMeta.currentHp : null
  const maxHp = typeof snapshotMeta?.maxHp === "number" ? snapshotMeta.maxHp : null
  const tempHp = typeof snapshotMeta?.tempHp === "number" ? snapshotMeta.tempHp : null
  const sharedAt =
    typeof snapshotMeta?.sharedAt === "string" ? snapshotMeta.sharedAt : snapshot?.created_at

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <main className="max-w-3xl mx-auto px-4 py-8 w-full">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Read-only snapshot
            </p>
            <h1 className="text-3xl font-black text-foreground">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {[classLabel, level != null ? `Level ${level}` : null].filter(Boolean).join(" · ") ||
                "Shared character"}
            </p>
          </div>
          <Link href="/characters" className="text-sm text-primary hover:underline">
            My characters
          </Link>
        </div>

        {loading ? <p className={pageFloatingHintClass}>Loading snapshot…</p> : null}
        {error ? (
          <div
            role="alert"
            className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
          >
            {error}
          </div>
        ) : null}

        {snapshot && !loading ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-border bg-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">HP</div>
                <div className="text-lg font-black">
                  {currentHp != null && maxHp != null ? `${currentHp}/${maxHp}` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Temp HP</div>
                <div className="text-lg font-black">{tempHp ?? 0}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Shared</div>
                <div className="text-sm font-medium">
                  {sharedAt ? new Date(sharedAt).toLocaleString() : "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-2">
              <h2 className="text-sm font-bold">Snapshot notes</h2>
              <p className="text-sm text-muted-foreground">
                This is a frozen copy from when the link was created. It does not update when the
                live character changes, and it cannot be edited here.
              </p>
              {typeof payload.alignment === "string" && payload.alignment ? (
                <p className="text-sm">
                  <span className="font-semibold">Alignment:</span> {payload.alignment}
                </p>
              ) : null}
              {typeof payload.backstory === "string" && payload.backstory ? (
                <div className="text-sm space-y-1">
                  <div className="font-semibold">Backstory</div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{payload.backstory}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}

function ShareSnapshotRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  return <ShareSnapshotContent token={token} />
}

export default function ShareSnapshotPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col">
          <MainNav />
          <main className="max-w-3xl mx-auto px-4 py-8 w-full">
            <p className={pageFloatingHintClass}>Loading snapshot…</p>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <ShareSnapshotRoute params={params} />
    </Suspense>
  )
}
