/**
 * Browser data client (Supabase-like API). Characters and compendium data live in
 * **MySQL** via `/api/characters` and `/api/data/*` — this does not call Supabase.
 * @deprecated Prefer `import { createClient } from "@/lib/db/client"`.
 */
export { createClient } from "@/lib/db/client"
