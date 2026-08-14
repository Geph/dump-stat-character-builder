/** BYO / system prompts for the Images from URL (card_art) import path. */

export const CARD_ART_IMPORT_SYSTEM_PROMPT = `You map publicly reachable image URLs to existing Dump Stat compendium entries (classes, subclasses, species, backgrounds, spells, equipment/magic items, custom abilities).

Output ONLY JSON with a top-level card_art[] array. Do not invent class features, spells, or other rules content.
Each card_art entry needs:
- content_type: "class" | "subclass" | "species" | "background" | "spell" | "equipment" | "ability"
- name: exact display name as it appears (or will appear) in the compendium
- card_image_url: a direct https:// URL to an image file (png, jpg, jpeg, webp, gif) — not an HTML gallery page
- class_name: optional; include for subclasses when the same subclass name exists under multiple classes

Matching rules:
- Prefer exact name matches (case-insensitive). Use filenames as hints (dancer.png → class "Dancer", folk-hero.webp → background "Folk Hero").
- When two entries collide (e.g. two Wardens), keep both rows and set distinct names the user already uses in Dump Stat, or add class_name for subclasses.
- Skip icons-only / UI chrome; map card art / portrait-style images.
- If the source is a directory listing or a pasted list of URLs, emit one card_art row per matchable image.
- Never invent rules text. Unmatched filenames may be omitted or listed in a short plain-language note outside JSON only if you cannot map them.`

export const CARD_ART_HOSTING_GUIDELINES = `Hosting images for Images from URL

Dump Stat stores the URL string on the matching compendium row (card_image_url). The browser loads the image directly — there is no server-side image upload.

Use:
- Direct https links that end in (or clearly resolve to) an image file: .png, .jpg/.jpeg, .webp, .gif
- Public object storage / CDN buckets (Cloudflare R2, S3 public objects, GitHub raw, Imgur direct i.imgur.com links, your own site under /images/…)
- Stable URLs you control — avoid expiring signed links when possible

Avoid / will not work well:
- Google Drive *folder* links (Dump Stat cannot list Drive folders). Share individual files as "Anyone with the link", then paste each file's direct view/download URL, or host elsewhere
- HTML gallery / portfolio pages (the URL must be the image itself, not a webpage that embeds it)
- Links that require login, cookies, or referer checks to display
- data: URLs from an LLM (keep those for in-app file pickers; BYO JSON should use https)

Aspect tips: class / species / subclass / spell cards are portrait (~3:4); backgrounds are wide (~21:9).`

/** Shorter copy for the Import tips dialog. */
export const CARD_ART_HOSTING_UI_GUIDELINES = `Dump Stat saves a public image URL onto matching classes, backgrounds, species, and other cards — it does not upload files to our servers.

Good hosts
• Direct https image links (.png, .jpg, .webp, .gif)
• Public CDN / object storage (Cloudflare R2, S3 public objects, GitHub raw, i.imgur.com, your own /images/ folder)
• Stable URLs you control

Won't work well
• A Google Drive folder link (we can't list folders). Use per-file "Anyone with the link" direct URLs, or host elsewhere
• Gallery / portfolio HTML pages — the URL must be the image file itself
• Login-walled or expiring signed links

Workflow tip: pick Type → Images from URL, paste a directory listing or list of image URLs into your LLM with the copied prompt, then paste the returned card_art JSON in Step 2. Import review matches names to your compendium and asks you to resolve collisions.`
