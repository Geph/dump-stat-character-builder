/** Multi-device table sync is disabled until room-scoped auth is verified in CI. */
export function isRoomSyncEnabled(): boolean {
  return process.env.ENABLE_ROOM_SYNC === "true"
}

export const ROOM_SYNC_DISABLED_MESSAGE =
  "Room sync is not enabled on this deployment. Set ENABLE_ROOM_SYNC=true after auth tests pass."
