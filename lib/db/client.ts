/**
 * Browser-side data client for Dump Stat.
 * Delegates to lib/data/client.ts (API or IndexedDB depending on deploy mode).
 */

export { createClient } from "@/lib/data/client"
export type { DbResult, DataClient, QueryBuilder } from "@/lib/data/client"
