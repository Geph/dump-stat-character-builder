# Data files

## Optional: SRD PDF

You can download SRD 5.2.1 from [dndbeyond.com/srd](https://www.dndbeyond.com/srd) and place the PDF here as `srd.pdf` for local reference or one-off **Import → Upload PDF** extraction (optional server AI or deterministic parsing — same as any other PDF upload).

The **Seed** button does **not** read this file and does **not** use AI. It loads pre-built JSON from `lib/srd/seed-data/` (regenerate with `pnpm srd:build` from SRD markdown).

## Cached markdown (gitignored)

`pnpm srd:build` caches downloaded markdown in `data/srd-source/`.
