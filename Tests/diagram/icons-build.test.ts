/** @jest-environment node */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildIcons, cleanSvg, slug } from '@/lib/diagram/icons/build.mjs'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>'

describe('cleanSvg', () => {
  it('strips prolog, comments, metadata and title', () => {
    const out = cleanSvg(
      `<?xml version="1.0"?><!-- c --><svg viewBox="0 0 64 64"><title>T</title><metadata>m</metadata><rect/></svg>`,
    )
    expect(out).not.toMatch(/<\?xml|<!--|metadata|title/)
    expect(out).toContain('<rect/>')
  })
  it('adds width and height from the viewBox', () => {
    expect(cleanSvg(SVG)).toMatch(/<svg[^>]*width="64"[^>]*height="64"/)
  })
  it('leaves existing width and height alone', () => {
    const out = cleanSvg('<svg width="20" height="30" viewBox="0 0 64 64"></svg>')
    expect(out).toContain('width="20"')
    expect(out).toContain('height="30"')
    expect(out.match(/width=/g)).toHaveLength(1)
  })
  it('rejects scripts and event handlers', () => {
    expect(() => cleanSvg('<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>')).toThrow('unsafe svg')
    expect(() => cleanSvg('<svg onload="x()" viewBox="0 0 1 1"></svg>')).toThrow('unsafe svg')
  })
})

describe('slug', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slug('Amazon EC2 Auto Scaling')).toBe('amazon-ec2-auto-scaling')
  })
})

describe('buildIcons', () => {
  let root: string
  const write = (rel: string, body = SVG) => {
    const file = path.join(root, 'src', rel)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, body)
  }
  const src = (p: string) => path.join(root, 'src', p)
  const run = () =>
    buildIcons({
      sources: { aws: src('aws'), azure: src('azure'), gcp: src('gcp'), k8s: src('k8s') },
      outDir: path.join(root, 'out'),
    })
  const out = (rel: string) => path.join(root, 'out', rel)

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'))
    write('aws/Arch_Compute/64/Arch_Amazon-EC2_64.svg')
    write('aws/Arch_Compute/32/Arch_Amazon-EC2_32.svg')
    write('k8s/labeled/pod.svg')
    write('k8s/unlabeled/pod.svg')
    write('azure/Icons/compute/10021-icon-service-Virtual-Machine.svg')
    write('gcp/Compute Engine.svg')
    write('gcp/bad.svg', '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>')
  })
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }))

  it('writes the right files and nothing else', async () => {
    const { manifest, skipped } = await run()
    expect(fs.existsSync(out('aws/aws-ec2.svg'))).toBe(true)
    expect(fs.existsSync(out('k8s/k8s-pod.svg'))).toBe(true)
    expect(fs.existsSync(out('azure/azure-virtual-machine.svg'))).toBe(true)
    expect(fs.existsSync(out('gcp/gcp-compute-engine.svg'))).toBe(true)
    expect(fs.readdirSync(out('aws'))).toEqual(['aws-ec2.svg']) // the 32px file is ignored
    expect(fs.existsSync(out('gcp/gcp-bad.svg'))).toBe(false)
    expect(skipped.some((s: string) => s.includes('bad.svg'))).toBe(true)
    expect(manifest.icons).toHaveLength(4)
  })

  it('describes each icon in a sorted manifest', async () => {
    await run()
    const manifest = JSON.parse(fs.readFileSync(out('manifest.json'), 'utf8'))
    expect(manifest.version).toBe(1)
    expect(manifest.icons.map((i: { id: string }) => i.id)).toEqual([
      'aws-ec2',
      'azure-virtual-machine',
      'gcp-compute-engine',
      'k8s-pod',
    ])
    expect(manifest.icons[0]).toMatchObject({ provider: 'aws', label: 'Amazon EC2' })
    expect(manifest.icons[0].keywords).toEqual(expect.arrayContaining(['amazon', 'ec2']))
  })

  it('keeps the first file for a duplicate id and reports the rest', async () => {
    write('gcp/Compute-Engine.svg', SVG.replace('64"/>', '1"/>'))
    const { duplicates } = await run()
    expect(duplicates).toHaveLength(1)
  })

  it('produces identical output when run twice', async () => {
    await run()
    const first = fs.readFileSync(out('manifest.json'), 'utf8') + fs.readFileSync(out('aws/aws-ec2.svg'), 'utf8')
    await run()
    const second = fs.readFileSync(out('manifest.json'), 'utf8') + fs.readFileSync(out('aws/aws-ec2.svg'), 'utf8')
    expect(second).toBe(first)
  })
})
