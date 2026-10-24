// Turns the vendors' extracted icon packs into public/icons/<provider>/<id>.svg and manifest.json.
// Plain .mjs so `node scripts/build-icons.mjs` runs it without a TypeScript step; Jest imports it too.
import fs from 'node:fs'
import path from 'node:path'

/** @typedef {'aws' | 'azure' | 'gcp' | 'k8s'} Provider */

export const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const words = (name) => name.replace(/[-_]+/g, ' ').trim()
const titleCase = (text) => (text === text.toLowerCase() ? text.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : text)

// Short names the starter templates and help page use. Applied only when the canonical id exists in the build.
// ponytail: guessed from the vendors' file names; check against the real packs and extend as needed.
export const ALIASES = {
  'aws-virtual-private-cloud': ['aws-vpc'],
  'aws-elastic-load-balancing': ['aws-elb'],
  'aws-simple-storage-service': ['aws-s3'],
  'aws-relational-database-service': ['aws-rds-db'],
}

/**
 * Per provider: which files in the pack count, how a file becomes a label, and an optional category
 * (a search keyword). The rules follow the vendors' documented layouts.
 * ponytail: unverified against the real downloads; the build prints counts and every skipped file so
 * a wrong rule shows up as a surprising number.
 */
export const PROVIDERS = {
  aws: {
    include: (rel) => /(^|\/)(Arch_.+_64|Res_.+_48)\.svg$/.test(rel) && !/_(Dark|Light)\.svg$/.test(rel),
    label: (file) => words(file.replace(/^(Arch|Res)_/, '').replace(/_(64|48)\.svg$/, '')),
    // The id drops the brand prefix ("Amazon EC2" -> aws-ec2); the label keeps it.
    idName: (label) => label.replace(/^(Amazon|AWS) /, ''),
    category: (rel) => rel.split('/').find((s) => /^(Arch|Res)_/.test(s) && !s.endsWith('.svg'))?.replace(/^(Arch|Res)_/, ''),
  },
  azure: {
    include: (rel) => /(^|\/)\d+-icon-service-.+\.svg$/.test(rel),
    label: (file) => words(file.replace(/^\d+-icon-service-/, '').replace(/\.svg$/, '')),
    category: (rel) => rel.split('/').slice(-2, -1)[0],
  },
  gcp: {
    include: (rel) => rel.endsWith('.svg'),
    label: (file) => titleCase(words(file.replace(/\.svg$/, '').replace(/[-_ ]icon$/i, ''))),
  },
  k8s: {
    // Unlabeled variants: the app draws its own label. A pack without that folder keeps every file.
    include: (rel, all) => (all.some((p) => /(^|\/)unlabeled\//.test(p)) ? /(^|\/)unlabeled\//.test(rel) : true) && rel.endsWith('.svg'),
    label: (file) => titleCase(words(file.replace(/\.svg$/, ''))),
  },
}

/** @param {string} text */
export function cleanSvg(text) {
  if (/<script/i.test(text) || /\son[a-z]+\s*=/i.test(text) || /javascript:/i.test(text)) throw new Error('unsafe svg')
  let svg = text
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata\b[\s\S]*?<\/metadata>/gi, '')
    .replace(/<title\b[\s\S]*?<\/title>/gi, '')
    .replace(/<desc\b[\s\S]*?<\/desc>/gi, '')
    .trim()
  // Excalidraw draws images through a canvas, which needs an intrinsic size.
  svg = svg.replace(/<svg\b[^>]*>/, (tag) => {
    const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(tag)
    if (!box) return tag
    const add = (name, value) => (new RegExp(`\\s${name}\\s*=`).test(tag) ? '' : ` ${name}="${value}"`)
    return tag.replace(/\/?>$/, (end) => `${add('width', box[1])}${add('height', box[2])}${end}`)
  })
  return svg
}

function walk(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((e) => {
      const full = path.join(dir, e.name)
      return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')]
    })
}

/**
 * @param {{ sources: Partial<Record<Provider, string>>, outDir: string }} opts
 */
export async function buildIcons({ sources, outDir }) {
  const skipped = []
  const duplicates = []
  const icons = []
  for (const [provider, rules] of Object.entries(PROVIDERS)) {
    const dir = sources[provider]
    if (!dir) continue
    const files = walk(dir)
    // Generated output only: stale files from an older rule set must not linger.
    fs.rmSync(path.join(outDir, provider), { recursive: true, force: true })
    const seen = new Set()
    for (const rel of files.filter((f) => rules.include(f, files))) {
      const label = rules.label(path.posix.basename(rel))
      const id = `${provider}-${slug(rules.idName ? rules.idName(label) : label)}`
      let svg
      try {
        svg = cleanSvg(fs.readFileSync(path.join(dir, rel), 'utf8'))
      } catch (error) {
        skipped.push(`${provider}/${rel}: ${error.message}`)
        continue
      }
      if (seen.has(id)) {
        duplicates.push(`${provider}/${rel} -> ${id}`)
        continue
      }
      seen.add(id)
      fs.mkdirSync(path.join(outDir, provider), { recursive: true })
      fs.writeFileSync(path.join(outDir, provider, `${id}.svg`), svg)
      const category = rules.category?.(rel)
      const keywords = [...new Set([...label.toLowerCase().split(/\s+/), ...(category ? category.toLowerCase().split(/[-_\s]+/) : [])])].filter(
        (w) => w.length > 1,
      )
      icons.push({ id, provider, label, keywords, aliases: ALIASES[id] ?? [] })
    }
  }
  icons.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const manifest = { version: 1, icons }
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest))
  return { manifest, skipped, duplicates }
}
