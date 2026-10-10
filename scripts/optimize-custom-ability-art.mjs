import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const root = path.resolve(import.meta.dirname, "..")
const sources = JSON.parse(fs.readFileSync(path.join(root, "scripts/custom-ability-art-sources.json"), "utf8"))
const output = path.join(root, "public/images/compendium/abilities")
fs.mkdirSync(output, { recursive: true })
const defaults = {}
for (const [name, source] of Object.entries(sources)) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const filename = `psion-${slug}.webp`
  await sharp(path.join(root, "scripts/custom-ability-sources", source))
    .resize({ width: 640, height: 960, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 }).toFile(path.join(output, filename))
  defaults[name] = `/images/compendium/abilities/${filename}`
}
fs.writeFileSync(path.join(root, "lib/compendium/custom-ability-art.json"), JSON.stringify(defaults, null, 2) + "\n")
console.log(`Optimized ${Object.keys(defaults).length} custom ability images.`)
