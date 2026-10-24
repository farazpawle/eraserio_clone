/** @jest-environment node */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { cleanSvg } from '@/lib/diagram/icons/build.mjs'
import { createRegistry, iconUrl, type Manifest } from '@/lib/diagram/icons/registry'
import { STARTERS } from '@/lib/diagram/templates'
import { parseFlow } from '@/lib/diagram/parse/flow'

const ICONS = path.join(process.cwd(), 'public', 'icons')
const MANIFEST = path.join(ICONS, 'manifest.json')

// The manifest is build output of `npm run build:icons`, which needs the vendor packs (task 3.1).
// Until it exists these checks are skipped, loudly, rather than passing on nothing.
const built = fs.existsSync(MANIFEST)
const suite = built ? describe : describe.skip
if (!built) console.warn('icons-manifest.test: public/icons/manifest.json is missing, run `npm run build:icons` (needs icons-src/)')

suite('built icon manifest', () => {
  const raw = built ? fs.readFileSync(MANIFEST) : Buffer.from('{"version":1,"icons":[]}')
  const manifest: Manifest = JSON.parse(raw.toString('utf8'))

  it('has unique, well-formed ids', () => {
    const ids = manifest.icons.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^(aws|azure|gcp|k8s)-[a-z0-9-]+$/)
  })

  it('has no alias that is also another icon id or alias', () => {
    const names = manifest.icons.flatMap((i) => [i.id, ...i.aliases])
    expect(new Set(names).size).toBe(names.length)
  })

  it('has a clean svg file for every entry', () => {
    for (const icon of manifest.icons) {
      const file = path.join(process.cwd(), 'public', iconUrl(icon.id))
      expect(fs.existsSync(file)).toBe(true)
      expect(() => cleanSvg(fs.readFileSync(file, 'utf8'))).not.toThrow()
    }
  })

  it('stays under 300 KB gzipped', () => {
    expect(zlib.gzipSync(raw).length).toBeLessThan(300 * 1024)
  })

  it('knows every icon the starter templates use', () => {
    const registry = createRegistry(manifest)
    for (const [type, code] of Object.entries(STARTERS)) {
      if (type === 'sequence') continue // sequence has no icons
      const { model } = parseFlow(code)
      for (const item of [...model.nodes, ...model.groups]) {
        if (item.icon) expect({ icon: item.icon, ...registry.getIcon(item.icon) }).toMatchObject({ known: true })
      }
    }
  })
})

it('always ships the fallback icon', () => {
  expect(fs.existsSync(path.join(ICONS, 'generic.svg'))).toBe(true)
})
