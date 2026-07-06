import { isStaticDeploy } from "@/lib/config/deploy-mode"
import { createApiClient } from "./api-store"
import { createIndexedDbClient } from "./indexed-db-store"
import type { DataClient } from "./types"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"

export function createClient(): DataClient {
  return isStaticDeploy() ? createIndexedDbClient() : createApiClient()
}

export type { DbResult, DataClient, QueryBuilder } from "./types"
