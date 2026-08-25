import { createPlaySession, readPlaySession } from "@/lib/play/play-sessions"

export async function POST(request: Request) {
  return createPlaySession(request)
}

export async function GET(request: Request) {
  return readPlaySession(request)
}
