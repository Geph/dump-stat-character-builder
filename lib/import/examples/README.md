# Import examples

Pre-built Dump Stat export bundles for testing compendium import.

## UA 2026 Villainous Options

**File:** `ua-villainous-options-export.json`

Includes:

- **Circle of the Titan** (Druid), **Hell Knight** (Fighter), **Demonic Sorcery** (Sorcerer) with linked common-modifier presets
- **Destructive Wave** (5th-level spell for Circle of the Titan list)
- Eight feats with correct **Origin** / **Epic Boon** categories

### Import

1. Seed SRD content first (parent classes must exist).
2. **Import** page → upload the JSON file (PDF upload accepts `.json` export bundles), **or** paste the file contents into **Text Import**.
3. Subclasses import with post-import enrichment (spell lists, limited uses, Wild Shape / Innate Sorcery links).

Regenerate after editing presets or feature stubs:

```bash
pnpm dlx tsx scripts/build-ua-villainous-export.ts
```
