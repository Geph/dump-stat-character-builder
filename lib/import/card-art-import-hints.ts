/** BYO / system prompts for the Images from URL (card_art) import path. */

export const CARD_ART_IMPORT_SYSTEM_PROMPT = `You map publicly reachable image URLs to existing Dump Stat compendium entries (classes, subclasses, species, backgrounds, spells, equipment/magic items, custom abilities).

Output ONLY JSON with a top-level card_art[] array. Do not invent class features, spells, or other rules content.
Each card_art entry needs:
- content_type: "class" | "subclass" | "species" | "background" | "spell" | "equipment" | "ability"
- name: exact display name as it appears (or will appear) in the compendium
- card_image_url: a direct https:// URL or root-relative path to an image file (png, jpg, jpeg, webp, gif) — not an HTML gallery page
- class_name: optional; include for subclasses when the same subclass name exists under multiple classes

Input format:
- The source may be a flat list of direct image URLs/filenames, one or more high-level directory or listing URLs, or a mix.
- Only emit a row if card_image_url ends in .png, .jpg, .jpeg, .webp, or .gif (case-insensitive). Query strings after the extension are fine (e.g. foo.png?v=2).

Crawling directories:
- When you encounter a directory URL, HTML listing, or index page, call the fetch_url tool on it rather than guessing its contents.
- Only follow links returned by fetch_url — never emit a card_art row for a file you have not observed in an actual tool_result.
- Cap total fetch_url calls at 20 for a single import. If you hit the cap before finishing, emit what you've found and add a note (outside JSON) that the crawl was truncated.
- Only follow links whose path stays under the original URL's host and path prefix — do not follow offsite links encountered in a listing.
- Do not follow listing links more than 3 path segments deeper than the original URL.
- If fetch_url is not available in this chat (copied BYO prompt), use your own browse/fetch tool the same way if you have one; otherwise tell the user to run Optional: server AI extraction so Dump Stat can fetch listings.

Category handling:
- Folder or filename hints that don't map to one of the seven content_type values (e.g. "creatures/", "tokens/", "maps/") should be skipped silently from card_art[] — do not force them into the nearest category.
- If more than 3 files are skipped for this reason, summarize them as a single note rather than listing each one.

Ambiguity / collisions:
- If a filename could plausibly match more than one compendium entry (e.g. "warden.png" could be a class or a subclass under a different class), prefer the entry type suggested by the containing folder name (classes/, subclasses/, backgrounds/, species/, spells/, equipment/, abilities/) over guessing from the filename alone.
- Prefer exact name matches (case-insensitive). Use filenames as hints (dancer.png → class "Dancer", folk-hero.webp → background "Folk Hero").
- When two entries collide (e.g. two Wardens), keep both rows and set distinct names the user already uses in Dump Stat, or add class_name for subclasses.
- Skip icons-only / UI chrome; map card art / portrait-style images.
- Never invent rules text.`

export const CARD_ART_HOSTING_GUIDELINES = `Hosting images for Images from URL

Dump Stat stores the URL string on the matching compendium row (card_image_url). The browser loads the image directly — there is no server-side image upload.

Use:
- Direct https links or root-relative paths that end in an image file: .png, .jpg/.jpeg, .webp, .gif (query strings after the extension are fine)
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

Workflow tip: pick Type → Images from URL, paste direct image URLs and/or a public directory listing URL. Server AI can call fetch_url to crawl the listing. For BYO, copy the prompt into a tool-capable LLM or use Optional: server AI extraction, then paste the returned card_art JSON in Step 2.`
