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

Card art for Mage Hand Press **classes** and **free subclasses** ships under `public/images/compendium/` and is stamped onto seed JSON (`card_image_url`) by `stamp-mhp-seed-presentation.ts` / pack build. Hosted `jeffginger.com` portraits are still stripped. **Paid** Mage Hand Press subclasses and Kibbles portraits stay local-only: after you optimize those masters, import attaches `/images/compendium/…` only when the file exists on this machine.

## Runtime seed

- Static / IndexedDB: `seedLocalExamplePack(packId)` in `lib/data/local-seed-packs.ts`
- Hosted MySQL: `POST /api/seed/packs` with `{ packId: "kibbles-tasty" | "mage-hand-press", onlyFileIndexes?: number[] }`

Seeding **continues after per-file errors** and returns `errors` / `partial` so the UI can offer retry of failed files.

## Distribution checks (reviewed 2026-10-09)

- The [MHP public categories](https://magehandpress.com/categories/) list all 39 currently bundled subclass names. The allowlist test checks every MHP JSON pack, including subclass ability ownership and paid-only prerequisites.
- Public availability is not a redistribution license: the [MHP usage policy](https://magehandpress.com/content-usage-policy/) restricts verbatim reposting and publisher images. Distribution relies on the project-specific permission recorded above; keep its scope separate from the free-content allowlist.
- The [KRD](https://www.kthomebrew.com/krd) lists Occultist, Spellblade, Warden, Warlord and spell collections. Our Inventor, Psion/psionics, backgrounds, species and crafting feats are outside that list. The [broader Kibbles permissions](https://www.kthomebrew.com/permissions) separately address character-builder ports; do not label the entire pack CC-BY/KRD.
- The spell-reference regression test scans every bundled JSON pack for descriptions and requires entries attributed to Wizards of the Coast to contain only the import/overwrite notice. This catches attributed reference leaks; it cannot identify misattributed copied prose by itself.
- Historical Kibbles portraits remain tracked from commit 1b3f2eb (Drive-approved art restoration). A filename or commit message does not establish image rights. Do not add publisher artwork based on the text permissions, and retain local-only handling for new restricted art.

These are catalog/provenance checks, not a sentence-by-sentence comparison of every publisher document or independent verification of the original art licenses.

### MHP spell provenance gaps

A normalized name search of 107 public articles linked from the spell archive and Necromancer, Warmage, Witch, Martyr and Investigator categories matched 118 of 160 bundled spell names. This checks names, not equivalence of the bundled revision or license coverage. The following 42 need direct public-source URLs or confirmation that the project-specific permission covers them before claiming a fully public-source-only pack:

Abduct; Aberrate; Accelerate/decelerate; Antiballistics Field; Arcane Anomaly; Ballistic Smite; Blunder; Candy Blast; Card Trick; Concealed Shot; Conjure Cannonball; Conjure Cover; Cosmic Horror; Cryptogram; Curse Of Chains; Dead Fog; Defenestration; Dire Warning; Eye Of Anubis; Eye Of Ra; Flashback; Free Throw; Gahoul’s Spectral Scythe; Hangover; Instant Replay; Jam Weapon; Lashing Tendrils; Mandy’s Enchanted Carriage; Mandy’s Feral Follower; Perforating Shot; Phantasmal Beauty; Pit Trap; Polybrachia; Prehensile Hair; Rocks Fall; Scurry; Solar Wind; Soul Effigy; Sword Of Judgement; Thunderous Echo; Time Hop; Unseen Artisan.

An unmatched name is not evidence of a paid-only source: aliases, other public articles, downloads and revised names can explain a miss. Existing bundles were not removed by this audit.
