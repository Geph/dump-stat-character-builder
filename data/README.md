# Data files

## Optional: official SRD PDF

You can place the official SRD PDF here as `srd.pdf` and use **Import → Upload PDF** for one-off AI extraction.

The **Seed** button does not read this file at runtime. It uses pre-built JSON in `lib/srd/seed-data/` (run `pnpm srd:build` to regenerate from SRD markdown).

## Cached markdown (gitignored)

`pnpm srd:build` caches downloaded markdown in `data/srd-source/`.
