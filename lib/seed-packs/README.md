# Example seed packs

Bundled example content for the Import page **Seed Example Content** dropdown. Kept **separate from** `lib/srd/seed-data/`.

| Pack | Folder | Source label |
| --- | --- | --- |
| Kibbles Tasty | `kibbles-tasty/` | `Kibbles Tasty` |
| Mage Hand Press | `mage-hand-press/` | `Mage Hand Press` |

## Undo / remove checkpoint

**Introduced:** manifest version `2026-08-10` (Kibbles + Mage Hand Press example packs).

Mage Hand Press inclusion is with publisher permission for Dump Stat support. If that permission is withdrawn or packs need to be yanked:

1. Prefer reverting the git commit(s) that added `lib/seed-packs/{kibbles-tasty,mage-hand-press}/`, `pack-ids.ts` wiring, and the Import dropdown entries (or delete those folders and remove the pack ids).
2. Suggested tag after the packs land on the main line: `seed-packs-mhp-kibbles-v1` (create with `git tag` on that commit).
3. Purge already-seeded rows by source label `"Kibbles Tasty"` / `"Mage Hand Press"` from IndexedDB or MySQL if users already loaded the packs.

## Rebuild from Drive import-json

```bash
npm run seed-packs:build
```

Reads from:

- `…/dump stat working files/import-json/kibbles tasty`
- `…/dump stat working files/import-json/mage hand press`

For Mage Hand Press, **subclasses and abilities** are filtered to the free allowlist in
`mage-hand-press-free-subclasses.ts` (paid-subclass ability rows and paid-only Warmage house prereqs are dropped).

To re-strip paid abilities from already-built JSON without a full Drive rebuild:

```bash
node scripts/strip-mhp-paid-abilities.mjs
```

## Runtime seed

- Static / IndexedDB: `seedLocalExamplePack(packId)` in `lib/data/local-seed-packs.ts`
- Hosted MySQL: `POST /api/seed/packs` with `{ packId: "kibbles-tasty" | "mage-hand-press", onlyFileIndexes?: number[] }`

Seeding **continues after per-file errors** and returns `errors` / `partial` so the UI can offer retry of failed files.
