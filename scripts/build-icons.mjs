// Usage: npm run build:icons
// Reads the extracted vendor packs from icons-src/{aws,azure,gcp,k8s} and writes public/icons.
import fs from 'node:fs'
import { buildIcons } from '../lib/diagram/icons/build.mjs'

const providers = ['aws', 'azure', 'gcp', 'k8s']
const sources = Object.fromEntries(providers.map((p) => [p, `icons-src/${p}`]))
const missing = providers.filter((p) => !fs.existsSync(sources[p]))
if (missing.length > 0) {
  // The manifest lists every provider, so a partial build would drop icons whose files remain.
  console.error(`Missing icon folders: ${missing.map((p) => sources[p]).join(', ')}. Extract each downloaded pack there.`)
  process.exit(1)
}

const { manifest, skipped, duplicates } = await buildIcons({ sources, outDir: 'public/icons' })
for (const p of providers) console.log(`${p}: ${manifest.icons.filter((i) => i.provider === p).length} icons`)
for (const line of skipped) console.warn(`skipped ${line}`)
for (const line of duplicates) console.warn(`duplicate ${line}`)
