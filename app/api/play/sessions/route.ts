import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { isRoomSyncEnabled, ROOM_SYNC_DISABLED_MESSAGE } from "@/lib/play/room-sync-config"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"

export type PlaySessionPayload = {
  roomCode: string
  sessionToken: string
  characterIds: string[]
  expiresAt: string
}

/** In-memory store for static/GitHub Pages deploys; hosted MySQL path can replace later. */
const sessions = new Map<string, PlaySessionPayload & { token: string }>()

function randomRoomCode(): string {
  return randomBytes(3).toString("hex").toUpperCase()
}

function randomToken(): string {
  return randomBytes(24).toString("hex")
}

export async function POST(request: Request) {
  if (!isRoomSyncEnabled()) {
    return NextResponse.json({ error: ROOM_SYNC_DISABLED_MESSAGE }, { status: 503 })
  }
  const authError = requireMutationAuth(request)
  if (authError) return authError

  const body = (await request.json().catch(() => null)) as {
    characterIds?: string[]
  } | null
  const characterIds = (body?.characterIds ?? []).filter(Boolean).slice(0, 6)
  if (!characterIds.length) {
    return NextResponse.json({ error: "characterIds required" }, { status: 400 })
  }

  const roomCode = randomRoomCode()
  const token = randomToken()
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  const payload: PlaySessionPayload = {
    roomCode,
    sessionToken: token,
    characterIds,
    expiresAt,
  }
  sessions.set(roomCode, { ...payload, token })

  return NextResponse.json(payload)
}

export async function GET(request: Request) {
  if (!isRoomSyncEnabled()) {
    return NextResponse.json({ error: ROOM_SYNC_DISABLED_MESSAGE }, { status: 503 })
  }

  const roomCode = new URL(request.url).searchParams.get("room")?.trim().toUpperCase()
  const token = request.headers.get("x-session-token")?.trim()
  if (!roomCode || !token) {
    return NextResponse.json({ error: "room and X-Session-Token required" }, { status: 400 })
  }

  const session = sessions.get(roomCode)
  if (!session || session.token !== token) {
    return NextResponse.json({ error: "Invalid room or token" }, { status: 403 })
  }
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    sessions.delete(roomCode)
    return NextResponse.json({ error: "Session expired" }, { status: 410 })
  }

  return NextResponse.json({
    roomCode: session.roomCode,
    characterIds: session.characterIds,
    expiresAt: session.expiresAt,
  })
}
